import "server-only";

import { notFound } from "next/navigation";

import { getSessionUser } from "@/lib/auth/current-user";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Administrator authorization.
 *
 * This is the single source of truth for "is this request an administrator?".
 * It answers from the database on every call:
 *
 *   1. Read the session cookie and resolve it to a user row.
 *   2. Reject if there is no live session (expired, revoked, disabled).
 *   3. Reject unless that row's `role` is 'admin'.
 *
 * Nothing is trusted from the client — not a header, not a query parameter,
 * not a value in the JWT. The cookie is only a lookup key; the role always
 * comes from the `profiles` row.
 *
 * The names are deliberately different from the legacy `getAdminUser()`
 * implementations this replaced, which disagreed with each other about who
 * counts as an administrator — one read a Supabase session, the other a Clerk
 * one, and one of them handed out a demo administrator whenever demo data was
 * on. Both are gone. There is now exactly one answer to this question, and it
 * comes from the database.
 */

export interface AdminSession extends SessionUser {
  role: "admin";
}

/**
 * The administrator behind this request, or null.
 *
 * Never throws: `getSessionUser()` already fails closed, and a non-admin is
 * simply null rather than an error.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (user.role !== "admin") return null;

  return { ...user, role: "admin" };
}

/**
 * Guard a page or layout, rendering the site's custom 404 when the caller is
 * not an administrator.
 *
 * A 404 rather than a redirect is a deliberate product decision and an explicit
 * requirement: redirecting to a sign-in page confirms that /admin exists and
 * that there is something worth signing in for. A 404 says nothing at all.
 *
 * This is a user-experience choice, NOT the security control. The same check
 * runs in every administrative server action and API route, so hiding the page
 * is never what keeps the data safe.
 */
export async function requireAdminPage(): Promise<AdminSession> {
  const admin = await getAdminSession();
  if (!admin) notFound();
  return admin;
}

/**
 * Guard a server action, returning null when the caller is not an administrator.
 *
 * Actions must not call `notFound()`: a mutation should fail with a permission
 * error the caller can act on, not render a page. Callers pair this with an
 * explicit failure result — see `denied()` in src/app/actions/admin.ts.
 */
export async function requireAdminForAction(): Promise<AdminSession | null> {
  return getAdminSession();
}

/** True when this user is an administrator. Convenience for read-only checks. */
export function isAdminSession(user: SessionUser | null): user is AdminSession {
  return user?.role === "admin";
}
