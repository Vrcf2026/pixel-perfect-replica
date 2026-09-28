import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase só do player: sem sessão nem login, usa apenas as RPC
 * get_player_config e player_ping (abertas ao anon).
 */
let client: SupabaseClient | null = null;

export function playerClient() {
  if (client) return client;
  const url = import.meta.env["VITE_SUPABASE_URL"] as string;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;
  const isNewKey = key?.startsWith("sb_publishable_") || key?.startsWith("sb_secret_");
  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "montra-player",
    },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (isNewKey && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  return client;
}
