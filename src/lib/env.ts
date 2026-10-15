/**
 * Server-safe environment access.
 *
 * Secrets are read lazily and never exported with a NEXT_PUBLIC_ prefix.
 * The application must not crash at build time when a deployment has not
 * yet been provisioned — it degrades to a clearly labelled "setup needed"
 * state instead (see `isSupabaseConfigured`).
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Server-only. Never import this module into a client component. */
export function getServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.VERCEL_URL?.trim();
  const value = explicit || (vercel ? `https://${vercel}` : "") || "http://localhost:3000";
  return value.replace(/\/+$/, "");
}

/** Emails permitted into /admin. Comma separated. Enforced server-side. */
export function getAdminAllowlist(): string[] {
  return (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = getAdminAllowlist();
  return allowlist.includes(email.trim().toLowerCase());
}

/** True when the public Supabase credentials are present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** True when the Clerk auth provider is configured.
 *
 * We intentionally disable Clerk on localhost/dev setups even if a live
 * production key is present. This avoids the browser-side failure where the app
 * tries to boot a Clerk script for a different deployment host while the site is
 * running locally.
 */
export function isClerkConfigured(): boolean {
  const publishable = (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim();
  const secret = (process.env.CLERK_SECRET_KEY ?? "").trim();

  if (!publishable || !secret) return false;

  if (!/^pk_(live|test)_[A-Za-z0-9]+$/.test(publishable)) return false;
  if (!/^sk_(live|test)_[A-Za-z0-9]+$/.test(secret)) return false;

  const siteUrl = getSiteUrl();
  return !siteUrl.includes("localhost") && !siteUrl.includes("127.0.0.1");
}

/** Backward-compatibility alias for older code paths; prefer Clerk. */
export function isBetterAuthConfigured(): boolean {
  return Boolean((process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET) && process.env.DATABASE_URL);
}

/** True when trusted server-side database writes are possible. */
export function hasServiceRole(): boolean {
  return Boolean(SUPABASE_URL && getServiceRoleKey());
}
