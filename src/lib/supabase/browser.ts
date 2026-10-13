"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser client carrying the signed-in administrator's session. Used only
 * for direct-to-storage image uploads, which RLS permits for admins only.
 * The anon key is safe here; the service-role key never is.
 */
let cached: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (!cached) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase public credentials are not configured.");
    cached = createBrowserClient(url, key);
  }
  return cached;
}

export const MEDIA_BUCKET = "media";
