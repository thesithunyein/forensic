import Link from "next/link";
import { Search, Skull, Activity, Eye } from "lucide-react";
import { listRecentAutopsies } from "@/lib/db";
import SearchBox from "@/components/SearchBox";

export const revalidate = 60;

export default async function HomePage() {
  const recent = await listRecentAutopsies(12).catch(() => []);

  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-mono">
            <Skull className="w-5 h-5 text-accent" />
            <span className="font-semibold tracking-tight">forensic</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted">
            <Link href="/recent">Recent</Link>
            <Link href="/deployers">Deployers</Link>
            <Link href="/watch">Watch</Link>
          </nav>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Every rug, <span className="text-accent">autopsied.</span>
        </h1>
        <p className="mt-5 text-lg text-muted">
          Paste any EVM token (Ethereum, Base, BSC). Get a forensic post-mortem:
          timeline, top extractors, deployer dossier, total drained.
        </p>
        <div className="mt-10">
          <SearchBox />
        </div>
        <div className="mt-6 text-xs text-muted font-mono">
          powered by GoldRush · decoded log events · cross-chain deployer intel
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Recent autopsies</h2>
          <Link href="/recent" className="text-sm text-muted hover:text-white">
            view all →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recent.length === 0 ? (
            <div className="col-span-full text-muted text-sm font-mono">
              no autopsies indexed yet — be the first
            </div>
          ) : (
            recent.map((a) => (
              <Link
                key={a.token_address}
                href={`/token/${a.token_address}`}
                className="block rounded-lg border border-border bg-panel p-5 hover:border-accent transition"
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm">{a.symbol ?? "???"}</div>
                  <div className="text-xs text-muted font-mono">
                    {a.chain_name}
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-accent">
                  ${Math.round(a.total_drained_usd ?? 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted">drained</div>
                <div className="mt-3 text-xs text-muted">
                  {a.victim_count ?? 0} victims · {a.extractor_count ?? 0} extractors
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        <Feature icon={<Activity />} title="Timeline reconstruction"
          body="Mint, first LP, peak liquidity, the rug tx — annotated with USD." />
        <Feature icon={<Skull />} title="Deployer dossier"
          body="Every other token they launched, across chains, with outcomes." />
        <Feature icon={<Eye />} title="Persistent watch"
          body="Subscribe to a deployer. Get pinged the second they redeploy." />
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 text-xs text-muted font-mono flex justify-between">
          <span>forensic · open source</span>
          <span>data: GoldRush</span>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-6">
      <div className="text-accent mb-3">{icon}</div>
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-sm text-muted">{body}</div>
    </div>
  );
}
