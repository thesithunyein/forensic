import Groq from "groq-sdk";
import type { Autopsy } from "./types";

let _g: Groq | null = null;
function g() {
  if (_g) return _g;
  const k = process.env.GROQ_API_KEY;
  if (!k) throw new Error("GROQ_API_KEY missing");
  _g = new Groq({ apiKey: k });
  return _g;
}

export async function narrate(a: Autopsy): Promise<string | null> {
  const facts = {
    symbol: a.symbol,
    chain: a.chain_name,
    drained: a.total_drained_usd,
    victims: a.victim_count,
    lifespan: a.lifespan_human,
    extractors_top3: (a.extractors ?? []).slice(0, 3).map((e) => ({
      addr: e.address.slice(0, 8),
      usd: Math.round(e.realized_usd),
    })),
    timeline: (a.timeline ?? []).slice(0, 8),
    deployer: a.deployer
      ? { addr: a.deployer.address.slice(0, 8), other_tokens: a.deployer.token_count }
      : null,
  };
  const r = await g().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.4,
    max_tokens: 360,
    messages: [
      {
        role: "system",
        content:
          "You write concise forensic post-mortems for rugged Solana tokens. 4–6 sentences. Plain English, no hype, no emojis. Reference the timeline and extractor numbers. End with one sentence about the deployer if known.",
      },
      { role: "user", content: JSON.stringify(facts) },
    ],
  });
  return r.choices?.[0]?.message?.content?.trim() ?? null;
}
