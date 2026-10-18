import { createClient } from "@supabase/supabase-js";
import { sessionStorage } from "./sessionStorage";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Public keys are protected by database RLS. Secrets never belong in this client.
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: sessionStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      })
    : null;
export function db() {
  if (!supabase) throw new Error("The salon connection is not configured for this environment.");
  return supabase;
}
export function check<T extends { data: unknown; error: { message: string } | null }>(
  result: T,
): T["data"] {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
