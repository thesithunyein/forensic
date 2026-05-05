import Link from "next/link";
import { listRecentAutopsies } from "@/lib/db";
import { fmtUsd } from "@/lib/format";

export const revalidate = 60;

export default async function Recent() {
  const items = await listRecentAutopsies(60).catch(() => []);
  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <Link href="/" className="text-muted text-sm">← forensic</Link>
      <h1 className="text-3xl font-bold mt-4 mb-8">Recent autopsies</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((a) => (
          <Link
            key={a.token_address}
            href={`/token/${a.token_address}`}
            className="rounded-lg border border-border bg-panel p-5 hover:border-accent"
          >
            <div className="flex justify-between">
              <div className="font-mono">{a.symbol ?? "???"}</div>
              <div className="text-accent font-bold">{fmtUsd(a.total_drained_usd)}</div>
            </div>
            <div className="text-xs text-muted mt-1 font-mono">{a.token_address}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
