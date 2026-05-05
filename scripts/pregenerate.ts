/**
 * Pre-generate autopsies for famous Solana rugs so the site has content on day 1.
 * Run from CI (GitHub Actions) with env vars set.
 *
 *   pnpm pregen
 */
import { buildAutopsy } from "../src/lib/autopsy";
import { upsertAutopsy } from "../src/lib/db";

const SEEDS = [
  // Add famous Solana rug token mints here. Keep list small for trial-tier API.
  // Example placeholders — replace before running:
  // "So11111111111111111111111111111111111111112",
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
