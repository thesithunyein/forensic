import { NextResponse } from "next/server";
import { listWatches } from "@/lib/db";
import { walletTransactions } from "@/lib/goldrush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const watches = await listWatches();
  let pinged = 0;
  for (const w of watches) {
    try {
      const txs: any = await walletTransactions("solana-mainnet", (w as any).deployer, 5);
      const latest = txs?.items?.[0];
      if (!latest) continue;
      const last_seen = (w as any).last_tx_hash;
      if (latest.tx_hash && latest.tx_hash !== last_seen) {
        await tg((w as any).telegram_chat_id, formatPing((w as any).deployer, latest));
        pinged++;
      }
    } catch (e) {
      console.warn("watch loop", e);
    }
  }
  return NextResponse.json({ ok: true, pinged, total: watches.length });
}

async function tg(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", disable_web_page_preview: true }),
  });
}

function formatPing(deployer: string, tx: any) {
  return [
    `*Forensic alert*`,
    `Deployer \`${deployer}\` is active.`,
    `Tx: \`${tx.tx_hash}\``,
    `https://solscan.io/tx/${tx.tx_hash}`,
  ].join("\n");
}
