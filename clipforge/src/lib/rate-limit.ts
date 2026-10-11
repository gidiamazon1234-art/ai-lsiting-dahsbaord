import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fixed-window rate limit backed by Postgres, so it holds across serverless
 * instances. Fails open if the check itself errors (availability over strictness).
 */
export async function rateLimit(admin: SupabaseClient, key: string, windowSeconds: number, max: number) {
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) {
    console.error("rate limit check failed", error);
    return true;
  }
  return data === true;
}
