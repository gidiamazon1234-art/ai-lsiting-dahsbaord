import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS — only use in API routes / webhooks,
 * and always scope queries to the authenticated user yourself.
 */
export function createAdminClient() {
  return createClient(serverEnv.supabaseUrl(), serverEnv.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
