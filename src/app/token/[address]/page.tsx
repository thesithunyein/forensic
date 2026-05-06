import { notFound } from "next/navigation";
import Link from "next/link";
import { Skull, ArrowLeft, ExternalLink, Eye } from "lucide-react";
import { getOrBuildAutopsy } from "@/lib/autopsy";
import { fmtUsd, shortAddr } from "@/lib/format";
import WatchButton from "@/components/WatchButton";

export const revalidate = 300;
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function generateMetadata({ params }: { params: { address: string } }) {
  const a = await getOrBuildAutopsy(params.address, false).catch(() => null);
  if (!a) return { title: "Autopsy not found" };
  return {
    title: `${a.symbol ?? "Token"} autopsy — $${Math.round(a.total_drained_usd ?? 0).toLocaleString()} drained`,
    description: a.summary ?? "Forensic post-mortem powered by GoldRush.",
  };
}

export default async function AutopsyPage({
  params,
  searchParams,
}: {
  params: { address: string };
  searchParams?: { refresh?: string };
}) {
  const force = searchParams?.refresh === "1";
  const a = await getOrBuildAutopsy(params.address, force).catch(() => null);
  if (!a) return notFound();

  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted hover:text-white">
            <ArrowLeft className="w-4 h-4" /> forensic
          </Link>
          <div className="flex items-center gap-2 font-mono text-xs text-muted">
            <Skull className="w-4 h-4 text-accent" /> autopsy
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-12 pb-8">
        <div className="flex items-baseline gap-3">
          <h1 className="text-4xl font-bold">{a.symbol ?? "Unknown"}</h1>
          <span className="text-muted">{a.name}</span>
        </div>
        <div className="mt-1 font-mono text-xs text-muted">{params.address}</div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total drained" value={fmtUsd(a.total_drained_usd)} accent />
          <Stat label="Victims" value={(a.victim_count ?? 0).toLocaleString()} />
          <Stat label="Extractors" value={(a.extractor_count ?? 0).toLocaleString()} />
          <Stat label="Lifespan" value={a.lifespan_human ?? "—"} />
        </div>

        {a.summary && (
          <div className="mt-8 rounded-lg border border-border bg-panel p-6">
            <div className="text-xs text-muted font-mono mb-2">narrative</div>
            <p className="leading-relaxed whitespace-pre-line">{a.summary}</p>
          </div>
        )}
      </section>

      <section className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold mb-4">Timeline</h2>
        <div className="rounded-lg border border-border bg-panel divide-y divide-border">
          {(a.timeline ?? []).map((t, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-4 text-sm">
              <div className="w-32 text-muted font-mono text-xs">
                {new Date(t.ts).toISOString().slice(0, 16).replace("T", " ")}
              </div>
              <div className={`w-24 text-xs font-mono ${t.kind === "rug" ? "text-accent" : "text-muted"}`}>
                {t.kind}
              </div>
              <div className="flex-1">{t.label}</div>
              {t.usd != null && <div className="text-muted font-mono text-xs">{fmtUsd(t.usd)}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold mb-4">Top extractors</h2>
        <div className="rounded-lg border border-border bg-panel">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr className="text-left">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Wallet</th>
                <th className="px-5 py-3 text-right">Realized</th>
                <th className="px-5 py-3 text-right">Next move</th>
              </tr>
            </thead>
            <tbody>
              {(a.extractors ?? []).map((e, i) => (
                <tr key={e.address} className="border-t border-border">
                  <td className="px-5 py-3 text-muted">{i + 1}</td>
                  <td className="px-5 py-3 font-mono text-xs">{shortAddr(e.address)}</td>
                  <td className="px-5 py-3 text-right text-accent">{fmtUsd(e.realized_usd)}</td>
                  <td className="px-5 py-3 text-right text-muted text-xs">{e.next_move ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {a._debug && (
        <section className="max-w-5xl mx-auto px-6 py-4">
          <details className="rounded-lg border border-border bg-panel p-4 text-xs font-mono text-muted">
            <summary className="cursor-pointer">debug</summary>
            <pre className="mt-2 whitespace-pre-wrap break-all">{JSON.stringify(a._debug, null, 2)}</pre>
          </details>
        </section>
      )}

      {a.deployer && (
        <section className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Deployer dossier</h2>
            <WatchButton deployer={a.deployer.address} />
          </div>
          <div className="rounded-lg border border-border bg-panel p-6">
            <div className="font-mono text-xs text-muted">{a.deployer.address}</div>
            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
              <Stat label="Tokens deployed" value={String(a.deployer.token_count ?? 0)} small />
              <Stat label="Repeat rugs" value={String(a.deployer.rug_count ?? 0)} small accent />
              <Stat label="Chains" value={(a.deployer.chains ?? []).join(", ") || "—"} small />
            </div>
            {(a.deployer.other_tokens ?? []).length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-muted font-mono">
                  other tokens by this deployer
                  {(a.deployer.chains?.length ?? 0) > 1 && (
                    <span className="ml-2 text-accent">
                      · active on {a.deployer.chains!.length} chains
                    </span>
                  )}
                </div>
                {a.deployer.other_tokens!.map((t) => (
                  <Link
                    key={`${t.chain}-${t.address}`}
                    href={`/token/${t.address}`}
                    className="flex items-center justify-between rounded border border-border px-3 py-2 hover:border-accent"
                  >
                    <span className="font-mono text-xs flex items-center gap-2">
                      {t.chain && (
                        <span className="text-[10px] uppercase tracking-wider text-muted bg-bg px-1.5 py-0.5 rounded border border-border">
                          {t.chain.replace("-mainnet", "")}
                        </span>
                      )}
                      {t.symbol ?? shortAddr(t.address)}
                    </span>
                    <span className="text-xs text-muted">{t.outcome ?? "?"}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="border-t border-border mt-12">
        <div className="max-w-5xl mx-auto px-6 py-8 text-xs text-muted font-mono flex justify-between">
          <span>data: GoldRush</span>
          <a
            className="flex items-center gap-1 hover:text-white"
            href={`https://etherscan.io/token/${params.address}`}
            target="_blank"
            rel="noreferrer"
          >
            etherscan <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </main>
  );
}

function Stat({
  label, value, accent, small,
}: { label: string; value: string; accent?: boolean; small?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`${small ? "text-lg" : "text-2xl"} font-bold ${accent ? "text-accent" : ""}`}>
        {value}
      </div>
    </div>
  );
}
