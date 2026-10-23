import "server-only";

import type { Queryable } from "@/lib/auth/db";
import type { ProfileRole } from "@/lib/types";

/**
 * User records.
 *
 * Users live in `public.profiles`, the table the site already used for
 * accounts, extended by migration 0003 with credential and lifecycle columns.
 * Reusing it means existing rows, the `role` vocabulary and the RLS policies
 * around it all keep working.
 */

export interface UserRecord {
  id: string;
  email: string;
  full_name: string | null;
  role: ProfileRole;
  status: "active" | "disabled";
  phone: string | null;
  password_hash: string | null;
  email_verified_at: Date | null;
  last_login_at: Date | null;
  // Returned as well as stored: the account area shows "member since" and
  // derives "you updated your details" from `updated_at`, and both would be
  // guesses if they were read from somewhere else.
  created_at: Date;
  updated_at: Date;
}

const USER_COLUMNS = `id, email, full_name, role, status, phone,
                      password_hash, email_verified_at, last_login_at,
                      created_at, updated_at`;

/**
 * Normalize an email for storage and lookup.
 *
 * The database also enforces this with a trigger and a unique index on
 * `lower(email)`, so normalization here is the first of two layers rather than
 * the only one. Doing both means a missed call in application code cannot
 * create a duplicate account that differs only by case or padding.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** PostgreSQL's SQLSTATE for a unique-constraint violation. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "23505"
  );
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with that email address already exists.");
    this.name = "DuplicateEmailError";
  }
}

export interface NewUserInput {
  email: string;
  passwordHash: string;
  fullName?: string | null;
  phone?: string | null;
}

/**
 * Create a regular user account.
 *
 * The `role` column is deliberately absent from the INSERT so the database
 * default ('viewer') applies. That makes privilege escalation from public
 * registration impossible by construction rather than by remembering not to
 * pass a parameter — there is no argument to this function that can produce an
 * administrator.
 */
export async function createUser(
  db: Queryable,
  input: NewUserInput,
): Promise<UserRecord> {
  const email = normalizeEmail(input.email);

  try {
    const { rows } = await db.query<UserRecord>(
      `insert into public.profiles (email, password_hash, full_name, phone)
       values ($1, $2, $3, $4)
       returning ${USER_COLUMNS}`,
      [email, input.passwordHash, input.fullName ?? null, input.phone ?? null],
    );

    const created = rows[0];
    if (!created) throw new Error("Account could not be created.");
    return created;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateEmailError();
    throw error;
  }
}

/**
 * Create an administrator account.
 *
 * Reserved for the one-time bootstrap script and other trusted,
 * operator-run tooling. It is never reachable from a request handler — the
 * only caller in the codebase is scripts/create-admin.mjs. The admin's email is
 * marked verified because the operator has proven control of it out of band by
 * choosing it explicitly.
 */
export async function createAdministrator(
  db: Queryable,
  input: NewUserInput,
): Promise<UserRecord> {
  const email = normalizeEmail(input.email);

  try {
    const { rows } = await db.query<UserRecord>(
      `insert into public.profiles (email, password_hash, full_name, phone, role, email_verified_at)
       values ($1, $2, $3, $4, 'admin', now())
       returning ${USER_COLUMNS}`,
      [email, input.passwordHash, input.fullName ?? null, input.phone ?? null],
    );

    const created = rows[0];
    if (!created) throw new Error("Administrator account could not be created.");
    return created;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateEmailError();
    throw error;
  }
}

export async function findUserByEmail(
  db: Queryable,
  email: string,
): Promise<UserRecord | null> {
  const { rows } = await db.query<UserRecord>(
    `select ${USER_COLUMNS} from public.profiles where email = $1 limit 1`,
    [normalizeEmail(email)],
  );

  return rows[0] ?? null;
}

export async function findUserById(
  db: Queryable,
  id: string,
): Promise<UserRecord | null> {
  const { rows } = await db.query<UserRecord>(
    `select ${USER_COLUMNS} from public.profiles where id = $1 limit 1`,
    [id],
  );

  return rows[0] ?? null;
}

/**
 * Replace a user's password hash.
 *
 * Callers must revoke the user's existing sessions in the same transaction —
 * see `changePassword` in the auth service. A password change that left old
 * sessions alive would let a stolen cookie outlive the credential it was
 * issued against.
 */
export async function setPasswordHash(
  db: Queryable,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db.query(
    `update public.profiles
        set password_hash = $2,
            updated_at = now()
      where id = $1`,
    [userId, passwordHash],
  );
}

export interface ProfileUpdate {
  email: string;
  fullName: string | null;
  phone: string | null;
}


/**
 * Update the profile fields a customer owns.
 *
 * `role`, `status` and `password_hash` are absent from this function by
 * construction — not omitted at the call site, but not expressible at all.
 * There is no argument here that could grant a permission, which is what makes
 * the account area's profile form safe even if it were reached with a crafted
 * payload.
 *
 * Changing the address clears `email_verified_at`, because a verification of
 * the old address says nothing about the new one. Only a real change does so:
 * re-saving the same address (or the same address in different case) leaves the
 * existing verification alone, so a no-op edit cannot silently un-verify an
 * account.
 */
export async function updateOwnProfile(
  db: Queryable,
  userId: string,
  input: ProfileUpdate,
): Promise<UserRecord> {
  const email = normalizeEmail(input.email);

  try {
    const { rows } = await db.query<UserRecord>(
      `update public.profiles
          set email             = $2,
              full_name         = $3,
              phone             = $4,
              email_verified_at = case
                                    when lower(email) is distinct from $2 then null
                                    else email_verified_at
                                  end,
              updated_at        = now()
        where id = $1
        returning ${USER_COLUMNS}`,
      [userId, email, input.fullName, input.phone],
    );

    const updated = rows[0];
    if (!updated) throw new Error("Your account could not be found.");
    return updated;
  } catch (error) {
    // The unique index on lower(email) is the authority; this just names the
    // outcome. A race between two accounts claiming the same address is
    // rejected by the database, not by a check that could be stale.
    if (isUniqueViolation(error)) throw new DuplicateEmailError();
    throw error;
  }
}

/** True when an address already belongs to a different account. */
export async function emailBelongsToAnother(
  db: Queryable,
  userId: string,
  email: string,
): Promise<boolean> {
  const { rows } = await db.query<{ id: string }>(
    `select id from public.profiles where email = $1 and id <> $2 limit 1`,
    [normalizeEmail(email), userId],
  );
  return rows.length > 0;
}

/** Record a successful sign-in. */
export async function markLogin(
  db: Queryable,
  userId: string,
): Promise<void> {
  await db.query(
    `update public.profiles set last_login_at = now() where id = $1`,
    [userId],
  );
}

/** True when an account is allowed to sign in at all. */
export function canSignIn(user: Pick<UserRecord, "status" | "password_hash">): boolean {
  return user.status === "active" && Boolean(user.password_hash);
}
