"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export default function SearchBox() {
  const router = useRouter();
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const addr = v.trim();
    if (!addr) return;
    setBusy(true);
    router.push(`/token/${addr}`);
  }

  return (
    <form onSubmit={go} className="flex items-center gap-2 max-w-xl mx-auto">
      <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-panel px-4 py-3">
        <Search className="w-4 h-4 text-muted" />
        <input
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="paste a Solana token address..."
          className="flex-1 bg-transparent outline-none font-mono text-sm"
        />
      </div>
      <button
        disabled={busy}
        className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold disabled:opacity-50"
      >
        {busy ? "..." : "Autopsy"}
      </button>
    </form>
  );
}
