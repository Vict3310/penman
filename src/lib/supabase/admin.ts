import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, getServiceRoleKey } from "@/lib/env";

/**
 * Trusted, RLS-bypassing client. Only ever imported by server actions and
 * route handlers that have already verified authorization.
 *
 * ⚠️  The service-role key must NEVER reach the browser. There is no
 * NEXT_PUBLIC_ variant of it by design.
 */
let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  const key = getServiceRoleKey();
  if (!SUPABASE_URL || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Trusted server operations cannot run until it is configured.",
    );
  }
  if (!cached) {
    cached = createClient(SUPABASE_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
