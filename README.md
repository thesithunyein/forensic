# Forensic

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Vercel](https://img.shields.io/badge/Vercel-deployed-black?style=flat-square&logo=vercel)
![GoldRush](https://img.shields.io/badge/GoldRush-API-purple?style=flat-square)

**Public rugpull autopsies for EVM tokens, powered by [GoldRush](https://goldrush.dev/docs).**

Paste any EVM token address (Ethereum, Base, BSC). Get a forensic post-mortem:

- Timeline reconstruction (mint → transfers → approvals → rug)
- Top extractors with realized USD and wallet addresses
- Cross-chain deployer dossier (other tokens across ETH/Base/BSC)
- Total USD drained, victim count, lifespan
- AI-written narrative summarizing the attack

> Built for the **Build with GoldRush Track (Powered by Covalent)** hackathon.

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────────────────────────────────┐
│         Next.js App Router              │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │  page.tsx    │  │  autopsy.ts     │ │
│  │  (UI)        │  │  (logic)        │ │
│  └──────────────┘  └────────┬────────┘ │
└─────────────────────────────┼───────────┘
                              │
                              ▼
┌─────────────────────────────────────────┐
│         GoldRush API                    │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │ tokenHolders │  │   logEvents     │ │
│  │ walletBalances│  │  latestBlock    │ │
│  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────┐
│         Supabase (Cache)                 │
│  ┌─────────────────────────────────────┐ │
│  │  autopsies table                    │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Project Structure

```
forensic/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page with example tokens
│   │   └── token/[address]/
│   │       └── page.tsx          # Autopsy display page
│   ├── components/
│   │   └── SearchBox.tsx        # Token address input
│   ├── lib/
│   │   ├── autopsy.ts            # Core autopsy logic
│   │   ├── db.ts                 # Supabase client
│   │   ├── goldrush.ts           # GoldRush API wrappers
│   │   ├── narrate.ts            # AI narrative generation
│   │   └── types.ts              # TypeScript types
│   └── styles/
│       └── globals.css          # Tailwind + custom styles
├── scripts/
│   └── pregenerate.ts            # Pre-generate autopsies
├── supabase/
│   └── schema.sql                # Database schema
└── package.json
```

## Why GoldRush

Forensic is impossible on raw RPC. GoldRush provides:
- `tokenHolders` — victim base and holder distribution
- `logEvents` — decoded Transfer/Approval events for timeline reconstruction
- `walletBalances` — cross-chain deployer dossier across multiple chains
- `latestBlock` — block height for windowed queries to avoid API limits

Decoded events + cross-chain wallet data + USD pricing in a single API is GoldRush's advantage. We use it to surface who drained the funds and where the deployer is active next.

## Stack

- **Frontend:** Next.js 14 (App Router), TailwindCSS, Lucide icons
- **Backend:** Vercel serverless functions
- **Database:** Supabase (PostgreSQL) for caching
- **AI:** Groq Llama 3.3 70B for narrative generation
- **Data:** GoldRush API for all blockchain data

## Live Demo

https://forensic-olive.vercel.app

## Testing

### Manual Testing

1. **Test with known tokens:**
   ```bash
   # Visit these URLs with ?refresh=1 to bypass cache
   https://forensic-olive.vercel.app/token/0x6b175474e89094c44da98b954eedeac495271d0f?refresh=1  # DAI
   https://forensic-olive.vercel.app/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48?refresh=1  # USDC
   ```

2. **Verify features:**
   - Timeline shows Transfer/Approval events
   - Top extractors list excludes burn/router addresses
   - Deployer dossier shows cross-chain tokens with chain badges
   - AI narrative summarizes the attack

3. **Check Vercel logs:**
   - Go to Vercel dashboard → Deployments → Runtime Logs
   - Look for `[detectChain]` and `[autopsy]` diagnostic lines

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add:
# COVALENT_API_KEY=your_goldrush_api_key
# SUPABASE_URL=your_supabase_url
# SUPABASE_ANON_KEY=your_supabase_anon_key
# GROQ_API_KEY=your_groq_api_key

# 3. Run database schema
# Go to Supabase dashboard → SQL Editor → Paste supabase/schema.sql → Run

# 4. Start dev server
pnpm dev

# 5. Open http://localhost:3000
```

## Deployment

1. Push to GitHub
2. Import repo on Vercel
3. Add environment variables from `.env.example`
4. Run `supabase/schema.sql` in your Supabase project
5. Deploy

## Demo Script

Navigate to https://forensic-olive.vercel.app, click the DAI example token, watch as the page loads a complete forensic autopsy showing $63M drained across 100 victims with 333 extractors, scroll down to see the timeline of Transfer and Approval events, examine the top extractors list with wallet addresses and USD amounts, then view the deployer dossier revealing 29 other tokens deployed across Ethereum, Base, and BSC chains with chain badges for each token, demonstrating how GoldRush's cross-chain wallet balance queries power the cross-chain deployer intelligence feature that helps identify repeat rug pullers across multiple networks.
