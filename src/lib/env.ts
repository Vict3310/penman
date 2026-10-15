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
 * Local development should work when valid Clerk keys are present, so the admin
 * dashboard can be tested on localhost without forcing a production-only
 * deployment check.
 */
export function isClerkConfigured(): boolean {
  if (process.env.NODE_ENV === "development" && process.env.ENABLE_LOCAL_CLERK !== "true") {
    return false;
  }

  const publishable = (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim();
  const secret = (process.env.CLERK_SECRET_KEY ?? "").trim();
  const domain = (process.env.NEXT_PUBLIC_CLERK_DOMAIN ?? "").trim().toLowerCase();
  const apiUrl = (process.env.CLERK_API_URL ?? "").trim().toLowerCase();

  if (!publishable || !secret) return false;

  const staleHostIndicators = ["clerk.penman-navy.vercel.app", "penman-navy.vercel.app", "vercel.app"];
  const valueToCheck = `${publishable} ${domain} ${apiUrl}`.toLowerCase();

  if (staleHostIndicators.some((indicator) => valueToCheck.includes(indicator))) return false;

  try {
    const encodedPart = publishable.replace(/^pk_[A-Za-z0-9_-]+_/, "");
    const decoded = Buffer.from(encodedPart, "base64").toString("utf8").toLowerCase();
    if (decoded.includes(".vercel.app") || decoded.includes("clerk.")) {
      const normalized = decoded.replace(/^https?:\/\//, "");
      if (normalized.includes(".vercel.app") || normalized.includes("clerk.penman-navy")) {
        return false;
      }
    }
  } catch {
    // Ignore malformed keys; a non-empty value still needs to be accepted for local verification.
  }

  const looksLikeKey = (value: string) => /^[A-Za-z0-9_-]{12,}$/.test(value);
  if (!looksLikeKey(publishable) || !looksLikeKey(secret)) return false;

  return true;
}

/** Backward-compatibility alias for older code paths; prefer Clerk. */
export function isBetterAuthConfigured(): boolean {
  return Boolean((process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET) && process.env.DATABASE_URL);
}

/** True when trusted server-side database writes are possible. */
export function hasServiceRole(): boolean {
  return Boolean(SUPABASE_URL && getServiceRoleKey());
}
