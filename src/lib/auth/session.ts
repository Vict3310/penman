import "server-only";

import type { Queryable } from "@/lib/auth/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import type { ProfileRole } from "@/lib/types";

// Re-exported so every existing importer keeps working, while the definition
// itself lives somewhere the edge middleware can also reach.
export { SESSION_COOKIE_NAME };

/**
 * Server-managed sessions.
 *
 * A session exists only if a row in `public.sessions` says it does. Nothing
 * here trusts the client: the cookie carries an opaque 256-bit token, the
 * database stores only its SHA-256 hash, and every protected request re-derives
 * the user from the database. There is no client-side boolean anywhere in this
 * path, and an expired or revoked row is indistinguishable from no row at all.
 */

export const DEFAULT_SESSION_TTL_DAYS = 7;

const MIN_TTL_DAYS = 1;
const MAX_TTL_DAYS = 90;

/** Session lifetime in seconds, configurable via AUTH_SESSION_TTL_DAYS. */
export function getSessionTtlSeconds(): number {
  const raw = Number.parseInt(process.env.AUTH_SESSION_TTL_DAYS ?? "", 10);
  const days = Number.isFinite(raw) ? raw : DEFAULT_SESSION_TTL_DAYS;
  return Math.min(Math.max(days, MIN_TTL_DAYS), MAX_TTL_DAYS) * 24 * 60 * 60;
}

export function isSecureCookie(): boolean {
  if (process.env.AUTH_COOKIE_SECURE === "true") return true;
  if (process.env.AUTH_COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
  role: ProfileRole;
}

export interface SessionCookieOptions {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
  expires: Date;
}

/**
 * Cookie policy for a freshly created session.
 *
 *   * `HttpOnly`  — unreadable from JavaScript, so an XSS bug cannot exfiltrate
 *                   the session the way it could steal a localStorage token.
 *   * `Secure`    — HTTPS only in production; relaxed on localhost so the
 *                   documented `npm run dev` flow keeps working.
 *   * `SameSite=Lax` — blocks the cookie on cross-site POSTs, which is the
 *                   primary CSRF vector, while still allowing ordinary
 *                   top-level navigation to the site.
 *   * `path=/`    — sessions span /admin, /account and /api/auth, so the whole
 *                   site is the narrowest path that actually works.
 */
export function sessionCookie(token: string, expiresAt: Date): SessionCookieOptions {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    expires: expiresAt,
  };
}

/** A cookie value that expires the session cookie immediately on the client. */
export function clearedSessionCookie(): SessionCookieOptions {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

/**
 * Create a session for a user.
 *
 * Expiry is computed by the database (`now()`) rather than in JavaScript, so
 * application/database clock skew cannot silently extend or shorten a session.
 */
export async function createSession(
  db: Queryable,
  userId: string,
  ttlSeconds: number = getSessionTtlSeconds(),
): Promise<CreatedSession> {
  const token = generateToken();

  const { rows } = await db.query<{ expires_at: Date }>(
    `insert into public.sessions (user_id, token_hash, expires_at)
     values ($1, $2, now() + make_interval(secs => $3::double precision))
     returning expires_at`,
    [userId, hashToken(token), ttlSeconds],
  );

  const expiresAt = rows[0]?.expires_at;
  if (!expiresAt) {
    throw new Error("Session could not be created.");
  }

  return { token, expiresAt };
}

/**
 * Resolve a raw session token to its user, or null.
 *
 * Every rejection rule lives in this one query so no caller can forget one:
 * a missing row, a revoked session, an expired session, and a disabled account
 * all produce null. That is why `status = 'active'` is joined here rather than
 * checked separately — disabling an account invalidates its live sessions
 * immediately, with no session table sweep required.
 */
export async function resolveSession(
  db: Queryable,
  token: string,
): Promise<SessionUser | null> {
  if (!token) return null;

  const { rows } = await db.query<{
    id: string;
    email: string;
    full_name: string | null;
    role: ProfileRole;
  }>(
    `select p.id, p.email, p.full_name, p.role
       from public.sessions s
       join public.profiles p on p.id = s.user_id
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
        and p.status = 'active'
      limit 1`,
    [hashToken(token)],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
  };
}

/**
 * Record activity on a session.
 *
 * Only writes when the recorded value is already stale, so a burst of requests
 * produces at most one update per interval instead of a write per request.
 */
export async function touchSession(
  db: Queryable,
  token: string,
  minIntervalSeconds = 300,
): Promise<void> {
  await db.query(
    `update public.sessions
        set last_seen_at = now()
      where token_hash = $1
        and revoked_at is null
        and (last_seen_at is null
             or last_seen_at < now() - make_interval(secs => $2::double precision))`,
    [hashToken(token), minIntervalSeconds],
  );
}

/** Revoke a single session. Returns true when a live session was revoked. */
export async function revokeSession(db: Queryable, token: string): Promise<boolean> {
  if (!token) return false;

  const { rows } = await db.query<{ id: string }>(
    `update public.sessions
        set revoked_at = now()
      where token_hash = $1
        and revoked_at is null
      returning id`,
    [hashToken(token)],
  );

  return rows.length > 0;
}

/**
 * Revoke every live session for a user.
 *
 * Called after a password change or reset, and when an account is disabled, so
 * a stolen cookie cannot outlive the password it was issued against.
 */
export async function revokeAllSessions(db: Queryable, userId: string): Promise<number> {
  const { rows } = await db.query<{ id: string }>(
    `update public.sessions
        set revoked_at = now()
      where user_id = $1
        and revoked_at is null
      returning id`,
    [userId],
  );

  return rows.length;
}

/**
 * Revoke every live session for a user EXCEPT the one making the request.
 *
 * This is the "sign out my other devices" control. The exception matters: the
 * caller is usually looking at the page they would be signing themselves out
 * of. Rotation is not needed here — unlike a password change, the credential
 * behind the current session has not changed, so there is nothing for a
 * captured copy of *this* token to gain.
 *
 * Returns how many sessions were revoked, so the UI can say whether anything
 * actually happened rather than claiming a change unconditionally.
 */
export async function revokeOtherSessions(
  db: Queryable,
  userId: string,
  keepToken: string | null,
): Promise<number> {
  const { rows } = await db.query<{ id: string }>(
    `update public.sessions
        set revoked_at = now()
      where user_id = $1
        and revoked_at is null
        and ($2::text is null or token_hash <> $2)
      returning id`,
    [userId, keepToken ? hashToken(keepToken) : null],
  );

  return rows.length;
}

/**
 * How many live sessions this user has, optionally excluding one token.
 *
 * Powers "3 other devices are signed in" without ever returning a token or a
 * hash to the caller.
 */
export async function countLiveSessions(
  db: Queryable,
  userId: string,
  excludeToken: string | null = null,
): Promise<number> {
  const { rows } = await db.query<{ n: number }>(
    `select count(*)::int as n
       from public.sessions
      where user_id = $1
        and revoked_at is null
        and expires_at > now()
        and ($2::text is null or token_hash <> $2)`,
    [userId, excludeToken ? hashToken(excludeToken) : null],
  );

  return rows[0]?.n ?? 0;
}

/**
 * Rotate a session: revoke the old token and issue a new one atomically.
 *
 * The update and the insert are a single statement joined by a CTE, so there
 * is no window in which the old session is dead but no new one exists. Used
 * after authentication and after privilege changes, so a token captured before
 * the change cannot be replayed after it.
 *
 * Returns null when the old token was not a live session — in which case no
 * new session is created.
 */
export async function rotateSession(
  db: Queryable,
  oldToken: string,
  ttlSeconds: number = getSessionTtlSeconds(),
): Promise<CreatedSession | null> {
  if (!oldToken) return null;

  const token = generateToken();

  const { rows } = await db.query<{ expires_at: Date }>(
    `with revoked as (
       update public.sessions
          set revoked_at = now()
        where token_hash = $1
          and revoked_at is null
          and expires_at > now()
        returning user_id
     )
     insert into public.sessions (user_id, token_hash, expires_at)
     select user_id, $2, now() + make_interval(secs => $3::double precision) from revoked
     returning expires_at`,
    [hashToken(oldToken), hashToken(token), ttlSeconds],
  );

  const expiresAt = rows[0]?.expires_at;
  if (!expiresAt) return null;

  return { token, expiresAt };
}
