import {
  Chain,
  tokenMetadata,
  tokenHolders,
  walletTransactions,
  walletBalances,
  logEvents,
  latestBlock,
} from "./goldrush";
import { getCachedAutopsy, upsertAutopsy } from "./db";
import { humanDuration } from "./format";
import type { Autopsy, Extractor, TimelineEvent, Deployer } from "./types";
import { narrate } from "./narrate";

const CHAIN: Chain = "eth-mainnet";
const FRESH_MS = 1000 * 60 * 60 * 6; // 6h

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

export async function buildAutopsy(address: string): Promise<Autopsy> {
  // Run all endpoints in parallel, none can hard-fail the autopsy.
  // Note: transfers_v2 needs a wallet path, so we skip it for token-level autopsy.
  // Token activity comes from logEvents (decoded Transfer/Swap topics).
  // Trial-tier max range is 1M blocks. Window to most recent ~1M.
  // Try API first; on failure estimate from genesis (Eth: 2015-07-30, ~12s blocks).
  const tip =
    (await latestBlock(CHAIN)) ??
    Math.floor((Date.now() - 1438269988_000) / 12_000);
  const evWindow: [number, number | "latest"] = [
    Math.max(0, tip - 999_000),
    "latest",
  ];

  const [holdersR, evsR] = await Promise.allSettled([
    tokenHolders(CHAIN, address, 100),
    logEvents(CHAIN, address, evWindow[0], evWindow[1]),
  ]);
  const holders: any = holdersR.status === "fulfilled" ? holdersR.value : { items: [] };
  const evs: any = evsR.status === "fulfilled" ? evsR.value : { items: [] };
  const meta: any = null; // metadata derived from holders[0]

  console.log("[autopsy]", address, {
    tip,
    evWindow,
    holdersCount: holders?.items?.length ?? 0,
    holdersErr: holdersR.status === "rejected" ? String((holdersR as any).reason?.message) : null,
    evsCount: evs?.items?.length ?? 0,
    evsErr: evsR.status === "rejected" ? String((evsR as any).reason?.message) : null,
  });

  if (!holders?.items?.length && !evs?.items?.length) {
    const errs = [holdersR, evsR]
      .filter((r) => r.status === "rejected")
      .map((r: any) => r.reason?.message ?? String(r.reason));
    throw new Error("All data sources empty: " + errs.join(" | "));
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

  // Deployer: try to extract from earliest event sender
  const deployer = await dossier(address, events).catch(() => null);

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
    const from = params.find((p: any) => p?.name === "from")?.value;
    const value = Number(params.find((p: any) => p?.name === "value")?.value ?? 0);
    const usd = Number(e?.value_quote ?? 0) || 0;
    if (!from) continue;
    if (from.toLowerCase() === token.toLowerCase()) continue;
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

async function dossier(token: string, events: any[]): Promise<Deployer | null> {
  // Earliest event sender = likely deployer
  const sorted = events
    .slice()
    .sort((a, b) => +new Date(a.block_signed_at) - +new Date(b.block_signed_at));
  const first = sorted[0];
  const params = first?.decoded?.params ?? [];
  const deployerAddr =
    params.find((p: any) => p?.name === "from")?.value ??
    first?.sender_address ??
    null;
  if (!deployerAddr) return null;

  const txs: any = await walletTransactions(CHAIN, deployerAddr, 100).catch(() => ({ items: [] }));
  const balances: any = await walletBalances(CHAIN, deployerAddr).catch(() => ({ items: [] }));

  const otherTokens: { address: string; symbol?: string | null }[] = (balances?.items ?? [])
    .filter((b: any) => b?.contract_address && b.contract_address !== token)
    .slice(0, 10)
    .map((b: any) => ({ address: b.contract_address, symbol: b?.contract_ticker_symbol ?? null }));

  return {
    address: deployerAddr,
    token_count: 1 + otherTokens.length,
    rug_count: 0,
    chains: [CHAIN],
    other_tokens: otherTokens.map((t) => ({ ...t, outcome: null })),
  };
}

function sum(xs: number[]) {
  return xs.reduce((a, b) => a + (b || 0), 0);
}
