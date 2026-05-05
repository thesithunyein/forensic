// Minimal GoldRush REST client. No SDK dependency to keep bundle small.
// Docs: https://goldrush.dev/docs

const BASE = "https://api.covalenthq.com/v1";

export type Chain =
  | "solana-mainnet"
  | "eth-mainnet"
  | "base-mainnet"
  | "bsc-mainnet";

function key() {
  const k = process.env.GOLDRUSH_API_KEY;
  if (!k) throw new Error("GOLDRUSH_API_KEY missing");
  return k;
}

async function gr<T = any>(path: string, params: Record<string, any> = {}): Promise<T> {
  const u = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) u.searchParams.set(k, String(v));
  }
  u.searchParams.set("key", key());
  const r = await fetch(u.toString(), { next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`GoldRush ${r.status}: ${await r.text().catch(() => "")}`);
  const j = (await r.json()) as { data: T; error: boolean; error_message?: string };
  if ((j as any).error) throw new Error(`GoldRush err: ${(j as any).error_message}`);
  return j.data;
}

// ---------- Solana endpoints we use ----------

export async function tokenMetadata(chain: Chain, address: string) {
  return gr(`/${chain}/tokens/${address}/`);
}

export async function tokenHolders(chain: Chain, address: string, pageSize = 100) {
  return gr(`/${chain}/tokens/${address}/token_holders_v2/`, {
    "page-size": pageSize,
  });
}

export async function tokenTransfers(
  chain: Chain,
  walletOrToken: string,
  contractAddress?: string
) {
  return gr(`/${chain}/address/${walletOrToken}/transfers_v2/`, {
    "contract-address": contractAddress,
    "page-size": 1000,
  });
}

export async function walletTransactions(chain: Chain, address: string, pageSize = 100) {
  return gr(`/${chain}/address/${address}/transactions_v3/`, {
    "page-size": pageSize,
    "no-logs": false,
  });
}

export async function walletBalances(chain: Chain, address: string) {
  return gr(`/${chain}/address/${address}/balances_v2/`);
}

// Decoded log events for a contract / token (classified)
export async function logEvents(
  chain: Chain,
  address: string,
  startingBlock?: number | "earliest" | "latest",
  endingBlock?: number | "latest"
) {
  return gr(`/${chain}/events/address/${address}/`, {
    "starting-block": startingBlock,
    "ending-block": endingBlock,
    "page-size": 1000,
  });
}

// Get current block height for a chain
export async function latestBlock(chain: Chain): Promise<number | null> {
  try {
    const data: any = await gr(`/${chain}/block_v2/latest/`);
    return data?.items?.[0]?.height ?? null;
  } catch {
    return null;
  }
}

// Historical price by ticker / address
export async function historicalPrice(chain: Chain, address: string, fromIso: string, toIso: string) {
  return gr(`/pricing/historical_by_addresses_v2/${chain}/USD/${address}/`, {
    from: fromIso,
    to: toIso,
  });
}
