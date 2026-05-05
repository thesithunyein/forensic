import { NextResponse } from "next/server";
import { addWatch } from "@/lib/db";
import { z } from "zod";

const Body = z.object({
  deployer: z.string().min(20),
  telegram_chat_id: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    await addWatch(body.deployer, body.telegram_chat_id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "bad request" }, { status: 400 });
  }
}
