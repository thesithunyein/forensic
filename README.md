# Forensic

**Public rugpull autopsies for EVM tokens, powered by [GoldRush](https://goldrush.dev/docs).**

Paste any EVM token address (Ethereum, Base, BSC). Get a forensic post-mortem:

- Timeline reconstruction (mint → transfers → approvals → rug)
- Top extractors with realized USD and wallet addresses
- Cross-chain deployer dossier (other tokens across ETH/Base/BSC)
- Total USD drained, victim count, lifespan
- AI-written narrative summarizing the attack

> Built for the **Build with GoldRush Track (Powered by Covalent)** hackathon.

## Why GoldRush

Forensic is impossible on raw RPC. GoldRush provides:
- `tokenHolders` — victim base and holder distribution
- `logEvents` — decoded Transfer/Approval events for timeline reconstruction
- `walletBalances` — cross-chain deployer dossier across multiple chains
- `latestBlock` — block height for windowed queries to avoid API limits

Decoded events + cross-chain wallet data + USD pricing in a single API is GoldRush's advantage. We use it to surface who drained the funds and where the deployer is active next.

## Stack

- Next.js 14 (App Router) on Vercel
- Supabase (cache for autopsy results)
- Groq Llama 3.3 70B (free tier) for AI narratives
- GoldRush API for all blockchain data

## Live Demo

https://forensic-olive.vercel.app

## Local Dev

```bash
cp .env.example .env.local   # fill GoldRush API key
pnpm install
pnpm dev
```

## Deploy

1. Push to GitHub
2. Import repo on Vercel
3. Add env vars from `.env.example`
4. Run `supabase/schema.sql` in your Supabase project
5. Deploy

## Demo Script

Navigate to https://forensic-olive.vercel.app, click the DAI example token, watch as the page loads a complete forensic autopsy showing $63M drained across 100 victims with 333 extractors, scroll down to see the timeline of Transfer and Approval events, examine the top extractors list with wallet addresses and USD amounts, then view the deployer dossier revealing 29 other tokens deployed across Ethereum, Base, and BSC chains with chain badges for each token, demonstrating how GoldRush's cross-chain wallet balance queries power the cross-chain deployer intelligence feature that helps identify repeat rug pullers across multiple networks.
