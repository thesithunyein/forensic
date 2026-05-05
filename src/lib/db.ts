import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Autopsy } from "./types";

let _admin: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

export function admin() {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin env missing");
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

export function anon() {
  if (_anon) return _anon;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase anon env missing");
  _anon = createClient(url, key, { auth: { persistSession: false } });
  return _anon;
}

export async function getCachedAutopsy(address: string): Promise<Autopsy | null> {
  try {
    const { data } = await admin()
      .from("autopsies")
      .select("*")
      .eq("token_address", address)
      .maybeSingle();
    return (data as Autopsy) ?? null;
  } catch {
    return null;
  }
}

export async function upsertAutopsy(a: Autopsy) {
  try {
    await admin().from("autopsies").upsert(a, { onConflict: "token_address" });
  } catch (e) {
    console.warn("upsertAutopsy failed", e);
  }
}

export async function listRecentAutopsies(limit = 12): Promise<Autopsy[]> {
  try {
    const { data } = await admin()
      .from("autopsies")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as Autopsy[];
  } catch {
    return [];
  }
}

export async function addWatch(deployer: string, telegram_chat_id: string) {
  await admin()
    .from("watches")
    .upsert({ deployer, telegram_chat_id }, { onConflict: "deployer,telegram_chat_id" });
}

export async function listWatches() {
  const { data } = await admin().from("watches").select("*");
  return data ?? [];
}
