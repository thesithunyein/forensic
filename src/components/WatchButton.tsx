"use client";

import { Eye } from "lucide-react";
import { useState } from "react";

export default function WatchButton({ deployer }: { deployer: string }) {
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  const [chat, setChat] = useState("");

  async function watch() {
    if (!chat.trim()) return setState("err");
    const r = await fetch("/api/watch", {
      method: "POST",
      body: JSON.stringify({ deployer, telegram_chat_id: chat.trim() }),
    });
    setState(r.ok ? "ok" : "err");
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={chat}
        onChange={(e) => setChat(e.target.value)}
        placeholder="telegram chat id"
        className="rounded border border-border bg-panel px-3 py-2 text-xs font-mono w-40"
      />
      <button
        onClick={watch}
        className="flex items-center gap-1 rounded bg-accent px-3 py-2 text-xs font-semibold"
      >
        <Eye className="w-3 h-3" />
        {state === "ok" ? "watching" : state === "err" ? "retry" : "watch"}
      </button>
    </div>
  );
}
