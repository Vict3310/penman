import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

/**
 * Anonymous, cookie-less client used by public server components.
 * RLS applies: this client can only ever read published listings.
 *
 * Returns `null` when the project has not been provisioned yet, so pages can
 * render a clear "setup required" state instead of throwing.
 */
let cached: SupabaseClient | null = null;

export function getPublicClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  if (!cached) {
    cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

/** Safe variant for code paths that must degrade gracefully. */
export function maybePublicClient(): SupabaseClient | null {
  return isSupabaseConfigured() ? getPublicClient() : null;
}
