import {
  Chain,
  tokenHolders,
  walletBalances,
  logEvents,
  latestBlock,
} from "./goldrush";
import { getCachedAutopsy, upsertAutopsy } from "./db";
import { humanDuration } from "./format";
import type { Autopsy, Extractor, TimelineEvent, Deployer } from "./types";
import { narrate } from "./narrate";

const CHAINS: Chain[] = ["eth-mainnet", "base-mainnet", "bsc-mainnet"];
const FRESH_MS = 1000 * 60 * 60 * 6; // 6h

// Common burn / system / DEX-router addresses that are not real "extractors".
const IGNORED_EXTRACTORS = new Set(
  [
    "0x0000000000000000000000000000000000000000", // burn
    "0x000000000000000000000000000000000000dead", // burn
    "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap V2 router
    "0xe592427a0aece92de3edee1f18e0157c05861564", // Uniswap V3 router
    "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45", // Uniswap V3 router 2
    "0x10ed43c718714eb63d5aa57b78b54704e256024e", // PancakeSwap V2 router
    "0x13f4ea83d0bd40e75c8222255bc855a974568dd4", // PancakeSwap V3 router
    "0x2626664c2603336e57b271c5c0b26f421741e481", // Uniswap V3 SwapRouter02 Base
    "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24", // Uniswap V2 router Base
  ].map((a) => a.toLowerCase()),
);

export async function getOrBuildAutopsy(address: string, force = false): Promise<Autopsy | null> {
  const cached = await getCachedAutopsy(address);
  if (
    !force &&
    cached?.updated_at &&
    Date.now() - new Date(cached.updated_at).getTime() < FRESH_MS
  ) {
    return cached;
  }
  const built = await buildAutopsy(address).catch((e) => {
    console.error("buildAutopsy", e);
    return null;
  });
  if (!built) return cached ?? null;
  await upsertAutopsy(built);
  return built;
}

async function detectChain(address: string): Promise<Chain> {
  // Probe each chain in parallel for token holders. First chain with >0 wins.
  const probes = await Promise.all(
    CHAINS.map(async (c) => {
      try {
        const r: any = await tokenHolders(c, address, 10);
        return { c, count: r?.items?.length ?? 0, err: null as string | null };
      } catch (e: any) {
        return { c, count: 0, err: String(e?.message ?? e).slice(0, 120) };
      }
    }),
  );
  console.log("[detectChain]", address, probes);
  const winner = probes.find((p) => p.count > 0);
  return winner?.c ?? "eth-mainnet";
}

export async function buildAutopsy(address: string): Promise<Autopsy> {
  // 1. Auto-detect which chain the token lives on.
  const CHAIN = await detectChain(address);

  // 2. Estimate current block tip (genesis + ~12s for ETH; close enough for window math).
  const tip =
    (await latestBlock(CHAIN)) ??
    Math.floor((Date.now() - 1438269988_000) / 12_000);

  // 3. Try progressively smaller windows; high-volume tokens 504 on big ranges.
  const windows: number[] = [50_000, 10_000, 2_000];
  let evs: any = { items: [] };
  let evsErr: string | null = null;
  let usedWindow = 0;
  for (const w of windows) {
    try {
      const r: any = await logEvents(CHAIN, address, Math.max(0, tip - w), "latest");
      evs = r;
      usedWindow = w;
      break;
    } catch (e: any) {
      evsErr = String(e?.message ?? e);
    }
  }
  const evWindow: [number, number | "latest"] = [
    Math.max(0, tip - (usedWindow || windows[windows.length - 1])),
    "latest",
  ];

  const [holdersR] = await Promise.allSettled([tokenHolders(CHAIN, address, 100)]);
  const holders: any = holdersR.status === "fulfilled" ? holdersR.value : { items: [] };
  const meta: any = null;

  console.log("[autopsy]", address, {
    chain: CHAIN,
    tip,
    evWindow,
    usedWindow,
    holdersCount: holders?.items?.length ?? 0,
    holdersErr: holdersR.status === "rejected" ? String((holdersR as any).reason?.message) : null,
    evsCount: evs?.items?.length ?? 0,
    evsErr,
  });

  if (!holders?.items?.length && !evs?.items?.length) {
    throw new Error(
      "All data sources empty" + (evsErr ? ": evs=" + evsErr.slice(0, 200) : ""),
    );
  }

  const item = meta?.items?.[0] ?? meta ?? holders?.items?.[0];
  const symbol = item?.contract_ticker_symbol ?? null;
  const name = item?.contract_name ?? null;

  const victim_count = holders?.items?.length ?? null;

  const events = evs?.items ?? [];
  const extractors = rankExtractorsFromEvents(events, address);
  const total_drained_usd = sum(extractors.map((e) => e.realized_usd));

  const timeline = buildTimeline(events);

  const lifespan_ms = lifespanFromTimeline(timeline);
  const lifespan_human = lifespan_ms ? humanDuration(lifespan_ms) : null;

  // Deployer: try to extract from earliest event sender, then probe all chains.
  const deployer = await dossier(address, events, CHAIN).catch(() => null);

  const partial: Autopsy = {
    token_address: address,
    chain_name: CHAIN,
    symbol,
    name,
    total_drained_usd,
    victim_count,
    extractor_count: extractors.length,
    lifespan_human,
    timeline: timeline.slice(0, 30),
    extractors: extractors.slice(0, 20),
    deployer,
    updated_at: new Date().toISOString(),
    _debug: {
      tip,
      window: `${evWindow[0]}..${evWindow[1]}`,
      usedWindow,
      holdersCount: holders?.items?.length ?? 0,
      evsCount: evs?.items?.length ?? 0,
      evsErr: evsErr ? evsErr.slice(0, 300) : null,
      holdersErr:
        holdersR.status === "rejected" ? String((holdersR as any).reason?.message) : null,
    },
  };

  partial.summary = await narrate(partial).catch(() => null);
  return partial;
}

function rankExtractorsFromEvents(events: any[], token: string): Extractor[] {
  // Decoded ERC20 Transfer events: params [from, to, value]. We rank by total value moved out per address.
  const by: Record<string, number> = {};
  for (const e of events) {
    const name = (e?.decoded?.name ?? "").toLowerCase();
    if (name !== "transfer") continue;
    const params = e?.decoded?.params ?? [];
    const from: string | undefined = params.find((p: any) => p?.name === "from")?.value;
    const value = Number(params.find((p: any) => p?.name === "value")?.value ?? 0);
    const usd = Number(e?.value_quote ?? 0) || 0;
    if (!from) continue;
    const fromLow = from.toLowerCase();
    if (fromLow === token.toLowerCase()) continue;
    if (IGNORED_EXTRACTORS.has(fromLow)) continue;
    by[from] = (by[from] ?? 0) + (usd > 0 ? usd : value / 1e18);
  }
  return Object.entries(by)
    .map(([address, realized_usd]) => ({ address, realized_usd }))
    .sort((a, b) => b.realized_usd - a.realized_usd);
}

function buildTimeline(events: any[]): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  for (const e of events) {
    const decoded = e?.decoded?.name ?? e?.event_name ?? "event";
    const kind = classify(decoded);
    out.push({
      ts: e?.block_signed_at ?? new Date().toISOString(),
      kind,
      label: decoded,
      usd: e?.value_quote ?? null,
      tx: e?.tx_hash ?? null,
    });
  }
  // Heuristic: largest single Transfer by USD = likely rug exit
  const transfers = events
    .filter((e: any) => (e?.decoded?.name ?? "").toLowerCase() === "transfer")
    .map((e: any) => ({ ...e, _usd: Number(e?.value_quote ?? 0) }))
    .sort((a: any, b: any) => b._usd - a._usd);
  const rug = transfers[0];
  if (rug && rug._usd > 0) {
    out.push({
      ts: rug.block_signed_at,
      kind: "rug",
      label: "largest extraction",
      usd: rug._usd,
      tx: rug.tx_hash,
    });
  }
  return out.sort((a, b) => +new Date(a.ts) - +new Date(b.ts));
}

function classify(name: string): TimelineEvent["kind"] {
  const n = name.toLowerCase();
  if (n.includes("mint")) return "mint";
  if (n.includes("addliquidity") || n.includes("lp_add") || n.includes("initialize")) return "lp_add";
  if (n.includes("removeliquidity") || n.includes("lp_remove") || n.includes("burn")) return "lp_remove";
  if (n.includes("buy")) return "swap_buy";
  if (n.includes("sell") || n.includes("swap")) return "swap_sell";
  return "other";
}

function lifespanFromTimeline(t: TimelineEvent[]): number | null {
  if (t.length < 2) return null;
  const first = +new Date(t[0].ts);
  const last = +new Date(t[t.length - 1].ts);
  return last - first;
}

async function dossier(token: string, events: any[], primaryChain: Chain): Promise<Deployer | null> {
  // Earliest event sender = likely deployer
  const sorted = events
    .slice()
    .sort((a, b) => +new Date(a.block_signed_at) - +new Date(b.block_signed_at));
  const first = sorted[0];
  const params = first?.decoded?.params ?? [];
  const deployerAddr: string | null =
    params.find((p: any) => p?.name === "from")?.value ?? first?.sender_address ?? null;
  if (!deployerAddr) return null;

  // KILLER FEATURE: probe deployer balances on every supported chain.
  const perChain = await Promise.all(
    CHAINS.map(async (c) => {
      const balances: any = await walletBalances(c, deployerAddr).catch(() => ({ items: [] }));
      const erc20s = (balances?.items ?? []).filter(
        (b: any) =>
          b?.contract_address &&
          b.contract_address.toLowerCase() !== token.toLowerCase() &&
          b?.type !== "dust" &&
          (b?.contract_decimals ?? 0) > 0,
      );
      return { chain: c, count: erc20s.length, items: erc20s.slice(0, 6) };
    }),
  );

  const activeChains = perChain.filter((p) => p.count > 0).map((p) => p.chain);
  const otherTokens: { address: string; symbol?: string | null; chain?: string }[] = perChain
    .flatMap((p) =>
      p.items.map((b: any) => ({
        address: b.contract_address,
        symbol: b?.contract_ticker_symbol ?? null,
        chain: p.chain,
      })),
    )
    .slice(0, 12);

  const totalTokens = perChain.reduce((s, p) => s + p.count, 0);

  return {
    address: deployerAddr,
    token_count: totalTokens || 1,
    rug_count: 0,
    chains: activeChains.length ? activeChains : [primaryChain],
    other_tokens: otherTokens.map((t) => ({ ...t, outcome: null })),
  };
}

function sum(xs: number[]) {
  return xs.reduce((a, b) => a + (b || 0), 0);
}
