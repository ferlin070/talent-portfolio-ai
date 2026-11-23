import { createClient } from "@supabase/supabase-js";

/** Use only the public anon key on the client. Never expose service_role keys. */
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configure Supabase credentials in .env.local");
  return createClient(url, key);
}
