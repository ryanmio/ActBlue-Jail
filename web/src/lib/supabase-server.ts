import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function getSupabaseServer() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase URL or key missing");
  return createClient(url, key, { auth: { persistSession: false } });
}
