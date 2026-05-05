# Forensic

**Public rugpull autopsies for Solana, powered by [GoldRush](https://goldrush.dev/docs).**

Paste any Solana token address. Get a forensic post-mortem:

- Timeline reconstruction (mint → first LP → peak → rug)
- Top extractors with realized PnL and next moves
- Deployer dossier (other tokens, cross-chain)
- Total USD drained, victim count, lifespan
- AI-written narrative
- "Watch this deployer" → Telegram alert when they redeploy

> Built for the **Build with GoldRush Track (Powered by Covalent)** bounty.

## Why GoldRush

Forensic is impossible on raw RPC. We compose:
- `tokens/{address}` — metadata
- `tokens/{address}/token_holders_v2` — victim base
- `address/{addr}/transfers_v2` — extractor ranking
- `events/address/{addr}` — **classified** LP / swap events for the timeline
- `address/{addr}/transactions_v3` + `balances_v2` — deployer dossier
- `pricing/historical_by_addresses_v2` — USD at the moment of each event

Decoded events + classified transactions + historical USD in a single API is GoldRush's moat. We use it.

## Stack

- Next.js 14 (App Router) on Vercel
- Supabase (cache + watches table)
- Groq Llama 3.3 70B (free tier) for narratives
- GitHub Actions cron for pre-generation
- Vercel cron for deployer monitors → Telegram

## Local dev (in Codespaces)

```bash
cp .env.example .env.local   # fill keys
pnpm install
pnpm dev
```

## Deploy

1. Push to GitHub
2. Import repo on Vercel
3. Add env vars from `.env.example`
4. Run `supabase/schema.sql` in your Supabase project
5. Deploy

## Demo

See `docs/DEMO.md` for the 90-second walkthrough script.
