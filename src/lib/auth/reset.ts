import "server-only";

import type { Queryable } from "@/lib/auth/db";
import { revokeAllSessions } from "@/lib/auth/session";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { setPasswordHash } from "@/lib/auth/users";

/**
 * Single-use password reset tokens.
 *
 * The table (migration 0003) has existed since the identity layer was built;
 * this is the flow that finally uses it. The same rules as sessions apply:
 *
 *   * the token is 256 bits from a cryptographic source and is stored ONLY as
 *     its SHA-256 hash, so a database leak yields no working reset links;
 *   * it expires (60 minutes), it is single-use, and issuing a new one
 *     invalidates any earlier unused token for that account;
 *   * consuming it revokes every live session, because a reset is what you do
 *     when the old credential may be in someone else's hands.
 *
 * Nothing here decides whether the email exists — that is the caller's job, and
 * the action deliberately answers the same way either way.
 */

export const RESET_TOKEN_TTL_MINUTES = 60;

export interface IssuedResetToken {
  token: string;
  expiresAt: Date;
}

/**
 * Issue a reset token for an account.
 *
 * Any outstanding unused tokens are marked used first, so exactly one link can
 * work at a time. The plaintext token is returned to the caller only so it can
 * be placed in that one email; it is never persisted.
 */
export async function createPasswordResetToken(
  db: Queryable,
  userId: string,
  ttlMinutes: number = RESET_TOKEN_TTL_MINUTES,
): Promise<IssuedResetToken> {
  await db.query(
    `update public.password_reset_tokens
        set used_at = now()
      where user_id = $1
        and used_at is null`,
    [userId],
  );

  const token = generateToken();

  const { rows } = await db.query<{ expires_at: Date }>(
    `insert into public.password_reset_tokens (user_id, token_hash, expires_at)
     values ($1, $2, now() + make_interval(mins => $3::int))
     returning expires_at`,
    [userId, hashToken(token), ttlMinutes],
  );

  const expiresAt = rows[0]?.expires_at;
  if (!expiresAt) throw new Error("A reset token could not be created.");

  return { token, expiresAt };
}

/**
 * Look up a token without consuming it.
 *
 * Used by the reset page to show "this link has expired" before the customer
 * types a new password twice. It is a courtesy, not the security check —
 * `consumePasswordResetToken()` re-checks everything under a row lock.
 */
export async function findPasswordResetToken(
  db: Queryable,
  token: string,
): Promise<{ userId: string; email: string; expiresAt: Date } | null> {
  if (!token) return null;

  const { rows } = await db.query<{
    user_id: string;
    email: string;
    expires_at: Date;
  }>(
    `select t.user_id, p.email, t.expires_at
       from public.password_reset_tokens t
       join public.profiles p on p.id = t.user_id
      where t.token_hash = $1
        and t.used_at is null
        and t.expires_at > now()
        and p.status = 'active'
      limit 1`,
    [hashToken(token)],
  );

  const row = rows[0];
  if (!row) return null;

  return { userId: row.user_id, email: row.email, expiresAt: row.expires_at };
}

/**
 * Consume a token and replace the password.
 *
 * MUST run inside a transaction (the action uses `withTransaction`): the
 * `for update` lock plus the single statement that marks the token used is what
 * makes a double-submitted form unable to set two passwords from one link.
 *
 * Returns null for an unknown, expired, already-used or disabled-account token.
 * On success it revokes every session for the account, so a stolen cookie
 * cannot outlive the reset.
 */
export async function consumePasswordResetToken(
  db: Queryable,
  token: string,
  newPasswordHash: string,
): Promise<{ userId: string; email: string } | null> {
  if (!token) return null;

  const { rows } = await db.query<{ id: string; user_id: string; email: string }>(
    `select t.id, t.user_id, p.email
       from public.password_reset_tokens t
       join public.profiles p on p.id = t.user_id
      where t.token_hash = $1
        and t.used_at is null
        and t.expires_at > now()
        and p.status = 'active'
      for update of t`,
    [hashToken(token)],
  );

  const row = rows[0];
  if (!row) return null;

  // Invalidate every outstanding token, not just this one: a concurrent request
  // may have issued a second link, and only the one just used should remain
  // spent.
  await db.query(
    `update public.password_reset_tokens
        set used_at = now()
      where user_id = $1
        and used_at is null`,
    [row.user_id],
  );

  await setPasswordHash(db, row.user_id, newPasswordHash);
  await revokeAllSessions(db, row.user_id);

  return { userId: row.user_id, email: row.email };
}
