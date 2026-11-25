import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Browser sessions now use auth cookies readable by Next.js middleware. */
export function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Konfigurasi Supabase belum tersedia.");
  }

  if (!client) {
    client = createBrowserClient(url, key);
  }

  return client;
}
