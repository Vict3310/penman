import "server-only";

import { getPool, withTransaction } from "@/lib/auth/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revokeAllSessions } from "@/lib/auth/session";
import { findUserById, setPasswordHash } from "@/lib/auth/users";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SavedKind } from "@/lib/types";

/**
 * Account-area writes.
 *
 * Two rules hold throughout this module:
 *
 *   1. The user id is always supplied by the caller from the session. No
 *      function here reads an id from a form field, so a customer cannot act
 *      on another account by editing a hidden input.
 *   2. Nothing here can change `role`, `status` or any other permission. Those
 *      columns are absent from every statement and every parameter list.
 */

export interface WriteResult {
  ok: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

/* ── Password ────────────────────────────────────────────────────────── */

/**
 * Replace the signed-in customer's own password.
 *
 * Three things happen, and the order matters:
 *
 *   1. The current password is verified. Without this, a borrowed session
 *      cookie would be enough to take an account over permanently.
 *   2. The new hash is written AND every session is revoked, inside one
 *      transaction. A password change that left old sessions alive would let a
 *      stolen cookie outlive the credential it was issued against, which is
 *      exactly the situation a password change is meant to end.
 *   3. The caller issues a fresh session for the current request, so the
 *      customer is not signed out of the tab they are using by their own
 *      security improvement.
 *
 * An account with no password (a legacy row, or one awaiting a reset) cannot
 * use this path: `verifyPassword` returns false for a missing hash, after
 * burning the same CPU time as a real comparison. Those accounts go through
 * the password-reset flow, which is the only route that can prove an identity
 * the account never had a credential for.
 */
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<WriteResult> {
  try {
    const pool = getPool();
    const user = await findUserById(pool, userId);

    if (!user) {
      return { ok: false, message: "Your account could not be found. Please sign in again." };
    }

    const matches = await verifyPassword(user.password_hash, currentPassword);
    if (!matches) {
      return {
        ok: false,
        message: "That is not your current password.",
        errors: { currentPassword: ["That is not your current password."] },
      };
    }

    const nextHash = await hashPassword(newPassword);

    await withTransaction(async (tx) => {
      await setPasswordHash(tx, userId, nextHash);
      await revokeAllSessions(tx, userId);
    });

    return { ok: true, message: "Your password has been changed. Any other devices are now signed out." };
  } catch (error) {
    console.error(
      "Password change failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return { ok: false, message: "We could not change your password. Please try again." };
  }
}

/* ── Saved listings ──────────────────────────────────────────────────── */

const SAVED_TARGETS = {
  vehicle: { table: "saved_vehicles", column: "vehicle_id", listing: "vehicles" },
  product: { table: "saved_products", column: "product_id", listing: "products" },
  property: { table: "saved_properties", column: "property_id", listing: "properties" },
} as const satisfies Record<
  SavedKind,
  { table: string; column: string; listing: string }
>;

/** PostgreSQL's SQLSTATE for a foreign-key violation. */
function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "23503"
  );
}

/** PostgreSQL's SQLSTATE for a unique-constraint violation. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "23505"
  );
}

export interface SavedToggleResult extends WriteResult {
  saved: boolean;
}

/**
 * Save or unsave a listing for this customer.
 *
 * Both directions are idempotent and say so. A double tap, an impatient
 * retry, or the same button in two tabs all converge on the same end state:
 *
 *   * Save when already saved. The unique constraint from migration 0004
 *     raises 23505, which is treated as SUCCESS rather than an error, because
 *     the desired end state — this listing is saved — already holds.
 *   * Remove when not saved. The delete matches no rows, which is also
 *     success, because the desired end state already holds.
 *
 * A save against a listing that no longer exists is the one genuine failure:
 * the foreign key rejects it with 23503 and the customer is told plainly,
 * instead of being shown a saved item that secretly points at nothing.
 */
export async function setSavedListing(
  userId: string,
  kind: SavedKind,
  listingId: string,
  saved: boolean,
): Promise<SavedToggleResult> {
  const target = SAVED_TARGETS[kind];

  try {
    const supabase = getAdminClient();

    if (saved) {
      const { error } = await supabase
        .from(target.table)
        .insert({ user_id: userId, [target.column]: listingId });

      if (error && !isUniqueViolation(error)) {
        if (isForeignKeyViolation(error)) {
          return {
            ok: false,
            saved: false,
            message: "That listing is no longer available, so it could not be saved.",
          };
        }
        throw new Error(error.message);
      }

      return { ok: true, saved: true, message: "Saved to your account." };
    }

    const { error } = await supabase
      .from(target.table)
      .delete()
      .eq("user_id", userId)
      .eq(target.column, listingId);

    if (error) throw new Error(error.message);

    return { ok: true, saved: false, message: "Removed from your saved listings." };
  } catch (error) {
    console.error(
      "Saved-listing update failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return {
      ok: false,
      saved: !saved,
      message: "We could not update your saved listings. Please try again.",
    };
  }
}
