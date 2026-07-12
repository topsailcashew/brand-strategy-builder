import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase config (URL + anon key) is served at runtime by the server from
// env vars, so it can be set on the host without a rebuild. If it's missing,
// the app degrades to local-only mode (no accounts / cloud sync).

let client: SupabaseClient | null = null;
let initPromise: Promise<boolean> | null = null;

export async function initSupabase(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (!data.supabaseUrl || !data.supabaseAnonKey) {
        return false;
      }
      client = createClient(data.supabaseUrl, data.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      return true;
    } catch (e) {
      console.warn("Supabase unavailable, running in local-only mode:", e);
      return false;
    }
  })();
  return initPromise;
}

export function getSupabase(): SupabaseClient | null {
  return client;
}
