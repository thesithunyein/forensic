/**
 * Pre-generate autopsies for famous EVM rugs so the site has content on day 1.
 * Run locally with env vars set:
 *
 *   pnpm tsx scripts/pregenerate.ts
 */
import { buildAutopsy } from "../src/lib/autopsy";
import { upsertAutopsy } from "../src/lib/db";

// Known rug pulls and suspicious tokens on Ethereum (eth-mainnet)
const SEEDS: string[] = [
  // Recent high-profile rugs (2024-2025)
  "0x8c8687fc965593dfb2f0b4eaefd55e9d8df348df", // PEPE variant rug
  "0xd2877702675e6cEb975b4A1dFf9fb7BAF4C91ea9", // Another suspicious token
  "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI (for demo - shows real transfer activity)
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC (stablecoin, high volume)
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC (wrapped BTC)
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH (wrapped ETH)
];

async function main() {
  for (const addr of SEEDS) {
    try {
      console.log("autopsy:", addr);
      const a = await buildAutopsy(addr);
      await upsertAutopsy(a);
    } catch (e) {
      console.warn("fail", addr, e);
    }
  }
}

main().then(() => process.exit(0));
