import { isSupabaseConfigured } from "@/lib/env";

/**
 * Demonstration data mode.
 *
 * When the project has not been connected to Supabase yet, the site would
 * otherwise render completely empty. In that situation — and only then — the
 * data layer falls back to clearly labelled demonstration listings so the
 * design can be reviewed.
 *
 * Safety rules:
 *   * It is impossible to enter demo mode while Supabase is configured.
 *   * It never activates in a production build unless `DEMO_DATA=true` is set
 *     explicitly, so an accidental deploy cannot publish placeholder listings.
 */
export function isDemoMode(): boolean {
  if (isSupabaseConfigured()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.DEMO_DATA === "true";
}
