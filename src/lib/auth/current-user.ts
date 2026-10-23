import "server-only";

import { cookies } from "next/headers";

import { getPool, isAuthDatabaseConfigured } from "@/lib/auth/db";
import {
  SESSION_COOKIE_NAME,
  clearedSessionCookie,
  countLiveSessions,
  createSession,
  getSessionTtlSeconds,
  resolveSession,
  revokeOtherSessions,
  revokeSession,
  rotateSession,
  sessionCookie,
  type SessionUser,
} from "@/lib/auth/session";

/**
 * The request-scoped face of the session system.
 *
 * This is the only module that touches Next.js cookies. Everything it calls
 * takes an explicit database handle, which keeps the session logic itself
 * testable against a real SQL engine with no HTTP layer involved.
 *
 * Fail-closed contract: every function here treats "something went wrong" as
 * "not signed in". A missing DATABASE_URL, a database outage or a malformed
 * cookie all resolve to null rather than throwing, because an authenticated
 * route must never be reachable by breaking a dependency.
 */

async function readSessionToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * The signed-in user for this request, or null.
 *
 * Re-derives identity from the database on every call — the cookie is a lookup
 * key, never a claim. Never throws.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isAuthDatabaseConfigured()) return null;

  const token = await readSessionToken();
  if (!token) return null;

  try {
    return await resolveSession(getPool(), token);
  } catch (error) {
    // Log the failure, never the token.
    console.error(
      "Session lookup failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return null;
  }
}

/**
 * Persist a new session cookie.
 *
 * Only valid inside a Server Action or Route Handler — Next.js forbids setting
 * cookies during a Server Component render.
 */
export async function startSession(userId: string): Promise<void> {
  const { token, expiresAt } = await createSession(
    getPool(),
    userId,
    getSessionTtlSeconds(),
  );
  const store = await cookies();
  store.set(sessionCookie(token, expiresAt));
}

/** Revoke the row behind a token, logging (never throwing) on failure. */
async function revokeToken(token: string | null): Promise<void> {
  if (!token || !isAuthDatabaseConfigured()) return;

  try {
    await revokeSession(getPool(), token);
  } catch (error) {
    console.error(
      "Session revocation failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

/** Revoke the current session server-side and expire its cookie. */
export async function endSession(): Promise<void> {
  await revokeToken(await readSessionToken());

  const store = await cookies();
  store.set(clearedSessionCookie());
}

/**
 * Begin a session for a user, discarding whatever session the request already
 * carried.
 *
 * This is the sign-in path and the reason it exists is session fixation: if a
 * visitor arrives holding a token that was issued before they authenticated,
 * that token must not survive the authentication step and become a logged-in
 * session. The old row is revoked first, so exactly one cookie is ever set.
 */
export async function startFreshSession(userId: string): Promise<void> {
  await revokeToken(await readSessionToken());

  const { token, expiresAt } = await createSession(
    getPool(),
    userId,
    getSessionTtlSeconds(),
  );

  const store = await cookies();
  store.set(sessionCookie(token, expiresAt));
}

/**
 * How many OTHER devices are still signed in as this user.
 *
 * Counts only; no token, hash or identifier ever leaves the server, so the
 * security page can say "2 other devices" without knowing anything about them
 * that would be worth stealing.
 */
export async function countOtherSessions(): Promise<number> {
  const token = await readSessionToken();
  if (!token || !isAuthDatabaseConfigured()) return 0;

  try {
    const user = await resolveSession(getPool(), token);
    if (!user) return 0;
    return await countLiveSessions(getPool(), user.id, token);
  } catch (error) {
    console.error(
      "Session count failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return 0;
  }
}

/**
 * Revoke every other session for the current user, keeping this one alive.
 *
 * "Sign out my other devices" without the customer signing themselves out of
 * the page they are standing on. Returns how many sessions were actually
 * revoked, so the UI can report what happened rather than asserting success.
 */
export async function endOtherSessions(): Promise<number> {
  const token = await readSessionToken();
  if (!token || !isAuthDatabaseConfigured()) return 0;

  try {
    const user = await resolveSession(getPool(), token);
    if (!user) return 0;
    return await revokeOtherSessions(getPool(), user.id, token);
  } catch (error) {
    console.error(
      "Session revocation failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return 0;
  }
}

/**
 * Issue a fresh token for the current session, invalidating the old one.
 *
 * Called after authentication and after any privilege change so a token
 * captured before the change cannot be replayed after it.
 */
export async function rotateCurrentSession(): Promise<void> {
  const token = await readSessionToken();
  if (!token || !isAuthDatabaseConfigured()) return;

  const rotated = await rotateSession(getPool(), token, getSessionTtlSeconds());
  if (!rotated) return;

  const store = await cookies();
  store.set(sessionCookie(rotated.token, rotated.expiresAt));
}
