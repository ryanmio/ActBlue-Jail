import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const supabaseBrowser = env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : null;

export function assertSupabaseBrowser() {
  if (!supabaseBrowser) throw new Error("Supabase browser client not configured.");
  return supabaseBrowser;
}

