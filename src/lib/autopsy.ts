import {
  Chain,
  tokenMetadata,
  tokenHolders,
  tokenTransfers,
  walletTransactions,
  walletBalances,
  logEvents,
} from "./goldrush";
import { getCachedAutopsy, upsertAutopsy } from "./db";
import { humanDuration } from "./format";
import type { Autopsy, Extractor, TimelineEvent, Deployer } from "./types";
import { narrate } from "./narrate";

const CHAIN: Chain = "solana-mainnet";
const FRESH_MS = 1000 * 60 * 60 * 6; // 6h

export async function getOrBuildAutopsy(address: string): Promise<Autopsy | null> {
  const cached = await getCachedAutopsy(address);
  if (cached?.updated_at && Date.now() - new Date(cached.updated_at).getTime() < FRESH_MS) {
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
  const meta: any = await tokenMetadata(CHAIN, address);
  const item = meta?.items?.[0] ?? meta;

  const symbol = item?.contract_ticker_symbol ?? null;
  const name = item?.contract_name ?? null;

  // Holders → victim count + top concentration
  const holders: any = await tokenHolders(CHAIN, address, 100).catch(() => ({ items: [] }));
  const victim_count = holders?.items?.length ?? null;

  // Transfers in/out → extractor ranking
  const transfers: any = await tokenTransfers(CHAIN, address, address).catch(() => ({ items: [] }));
  const extractors = rankExtractors(transfers?.items ?? []);
  const total_drained_usd = sum(extractors.map((e) => e.realized_usd));

  // Log events → timeline (LP add/remove, swaps classified)
  const evs: any = await logEvents(CHAIN, address).catch(() => ({ items: [] }));
  const timeline = buildTimeline(evs?.items ?? [], transfers?.items ?? []);

  const lifespan_ms = lifespanFromTimeline(timeline);
  const lifespan_human = lifespan_ms ? humanDuration(lifespan_ms) : null;

  // Deployer: try to extract from earliest mint/transfer
  const deployer = await dossier(address, transfers?.items ?? []).catch(() => null);

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

function rankExtractors(transfers: any[]): Extractor[] {
  const by: Record<string, number> = {};
  for (const t of transfers) {
    const usd = Number(t?.delta_quote ?? t?.value_quote ?? 0);
    if (!usd || usd <= 0) continue;
    const w = (t?.transfer_type === "OUT" ? t?.from_address : t?.to_address) as string | undefined;
    if (!w) continue;
    by[w] = (by[w] ?? 0) + usd;
  }
  return Object.entries(by)
    .map(([address, realized_usd]) => ({ address, realized_usd }))
    .sort((a, b) => b.realized_usd - a.realized_usd);
}

function buildTimeline(events: any[], transfers: any[]): TimelineEvent[] {
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
  // Heuristic: largest single OUT after peak liquidity = rug
  const sortedOut = transfers
    .filter((t) => Number(t?.delta_quote ?? 0) > 0)
    .sort((a, b) => Number(b.delta_quote) - Number(a.delta_quote));
  const rug = sortedOut[0];
  if (rug) {
    out.push({
      ts: rug.block_signed_at,
      kind: "rug",
      label: "largest extraction",
      usd: Number(rug.delta_quote),
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

async function dossier(token: string, transfers: any[]): Promise<Deployer | null> {
  // Earliest sender of this token = likely deployer
  const sorted = transfers
    .slice()
    .sort((a, b) => +new Date(a.block_signed_at) - +new Date(b.block_signed_at));
  const first = sorted[0];
  const deployerAddr = first?.from_address ?? null;
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
