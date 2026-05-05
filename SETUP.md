# Forensic — Setup (Zero-Cost, Codespaces-First)

## 0. One-time accounts (all free)
- GitHub
- [GoldRush](https://goldrush.dev) — sign up, grab key. After joining the bounty, drop your email in Colosseum Discord to extend trial for the hackathon.
- [Supabase](https://supabase.com) — new project, free tier
- [Groq](https://console.groq.com) — free Llama 3.3 70B
- [Vercel](https://vercel.com) — free Hobby
- (Optional) Telegram bot via @BotFather → `TELEGRAM_BOT_TOKEN`

## 1. Push to GitHub
```bash
git init
git add .
git commit -m "init: forensic"
gh repo create forensic --public --source=. --push
```

## 2. Open in Codespaces (no local install needed)
GitHub repo → Code → Codespaces → "Create codespace on main".
The devcontainer auto-runs `pnpm install`.

## 3. Supabase
- Create project
- SQL editor → paste `supabase/schema.sql` → run
- Settings → API → copy URL, anon key, service role key

## 4. Vercel
- Import the GitHub repo
- Add env vars (from `.env.example`)
- Deploy
- Crons in `vercel.json` activate automatically (Hobby allows 1 cron job)

## 5. GitHub Actions (pre-generation)
Repo → Settings → Secrets → Actions → add:
- `GOLDRUSH_API_KEY`
- `GROQ_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Edit `scripts/pregenerate.ts` SEEDS with 10–20 famous Solana rug mints. Run the workflow manually once: Actions → pregenerate → Run.

## 6. Custom domain (optional, free)
- Buy `.xyz` for $1 on Namecheap **or** use the free `forensic-xxx.vercel.app`
- Vercel → Project → Domains → add

## 7. Submit
- Demo video tagging `@goldrushdev` on X
- Public repo link
- Submit on Superteam Earn

## Cost: $0 (or $1 if you want a custom domain)
