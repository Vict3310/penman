"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, succeed, type ActionResult } from "@/lib/action-result";
import { emailChangeNeedsPassword } from "@/lib/account/profile";
import { changeOwnPassword, setSavedListing } from "@/lib/account/service";
import { getPool } from "@/lib/auth/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  endOtherSessions,
  getSessionUser,
  rotateCurrentSession,
  startFreshSession,
} from "@/lib/auth/current-user";
import { DuplicateEmailError, emailBelongsToAnother, updateOwnProfile } from "@/lib/auth/users";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import type { SavedKind } from "@/lib/types";
import { passwordChangeSchema, profileUpdateSchema, zodFieldErrors } from "@/lib/validation";

/**
 * Customer account actions.
 *
 * Three properties are load-bearing across every action in this file.
 *
 * 1. IDENTITY COMES FROM THE SESSION, NEVER FROM THE REQUEST. Each action
 *    calls `getSessionUser()`, which re-derives the user from the session
 *    cookie against the database. No action accepts a user id — there is no
 *    parameter to forge — so "one customer cannot act on another customer's
 *    account" holds by construction rather than by remembering to check.
 *
 * 2. PERMISSIONS ARE UNREACHABLE. No action writes `role`, `status` or any
 *    other administrative field, and the validation schemas for them do not
 *    contain those fields, so a crafted payload is stripped before any query
 *    sees it. Administrator access changes only through the bootstrap script
 *    or an existing administrator.
 *
 * 3. CSRF IS ALREADY CLOSED. These are Next.js server actions: they are
 *    invoked under an opaque action id, and Next.js rejects a POST whose
 *    Origin does not match the host, which blocks the cross-site form-post
 *    vector. The session cookie is HttpOnly and SameSite=Lax, so it is not
 *    attached to a cross-site POST in the first place. Nothing here needs a
 *    hand-rolled token, and adding one would not make it safer.
 *
 * Sensitive operations are additionally rate limited, using the same
 * best-effort limiter the public forms use.
 */

const SIGNED_OUT = "Your session has expired. Please sign in again to continue.";

/* ── Profile ─────────────────────────────────────────────────────────── */

export async function updateProfile(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return fail(SIGNED_OUT);

  const limit = rateLimit(await clientKey("account-profile"), 20, 10 * 60 * 1000);
  if (!limit.ok) {
    return fail("That is a lot of profile changes in a short time. Please try again shortly.");
  }

  const parsed = profileUpdateSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    currentPassword: String(formData.get("currentPassword") ?? ""),
  });

  if (!parsed.success) {
    return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const { fullName, email, phone, currentPassword } = parsed.data;

  try {
    const pool = getPool();

    // An address change is a change of sign-in identifier, so it is the one
    // profile edit that requires the current password: a borrowed session must
    // not be able to move an account to an attacker's inbox.
    if (emailChangeNeedsPassword(user.email, email)) {
      const current = await pool.query<{ password_hash: string | null }>(
        "select password_hash from public.profiles where id = $1",
        [user.id],
      );

      const matches = await verifyPassword(current.rows[0]?.password_hash ?? null, currentPassword);
      if (!matches) {
        return fail("Enter your current password to change your email address.", {
          currentPassword: [
            currentPassword
              ? "That password is not correct."
              : "Your current password is required to change your email address.",
          ],
        });
      }

      if (await emailBelongsToAnother(pool, user.id, email)) {
        return fail("That email address is already in use.", {
          email: ["Another account already uses that email address."],
        });
      }
    }

    await updateOwnProfile(pool, user.id, { email, fullName, phone });
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return fail("That email address is already in use.", {
        email: ["Another account already uses that email address."],
      });
    }

    console.error(
      "Profile update failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return fail("We could not save your details. Please try again.");
  }

  // The address is the sign-in identifier, so a token issued under the old
  // one should not keep working after the change.
  if (emailChangeNeedsPassword(user.email, email)) {
    await rotateCurrentSession();
  }

  revalidatePath("/account");
  revalidatePath("/account/profile");
  revalidatePath("/account/security");

  return succeed("Your details have been saved.");
}

/* ── Password ────────────────────────────────────────────────────────── */

export async function changePassword(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return fail(SIGNED_OUT);

  // Password guessing is the attack this slows down, so the window is tight.
  const limit = rateLimit(await clientKey("account-password"), 8, 10 * 60 * 1000);
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return fail(`Too many password attempts. Please try again in about ${minutes} minute(s).`);
  }

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const result = await changeOwnPassword(
    user.id,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );

  if (!result.ok) return fail(result.message, result.errors);

  // changeOwnPassword revoked every session — including this one — inside its
  // transaction. Without a fresh session here, the customer would be signed
  // out by their own security improvement, which teaches people not to use it.
  try {
    await startFreshSession(user.id);
  } catch (error) {
    console.error(
      "Session could not be reissued after a password change:",
      error instanceof Error ? error.message : "unknown error",
    );
    return fail(
      "Your password was changed, but we could not keep you signed in. Please sign in with your new password.",
    );
  }

  revalidatePath("/account");
  revalidatePath("/account/security");

  return succeed(result.message);
}

/** Sign out every other device, keeping this session alive. */
export async function signOutOtherDevices(): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return fail(SIGNED_OUT);

  const revoked = await endOtherSessions();

  revalidatePath("/account/security");

  return succeed(
    revoked === 0
      ? "No other devices were signed in."
      : `Signed out ${revoked} other ${revoked === 1 ? "device" : "devices"}.`,
  );
}

/* ── Saved listings ──────────────────────────────────────────────────── */

const savedInputSchema = z.object({
  kind: z.enum(["vehicle", "product", "property"]),
  listingId: z.string().uuid("That listing could not be identified."),
  saved: z.boolean(),
});

/**
 * Save or unsave a listing.
 *
 * Called from the listing cards and the detail pages as well as from the
 * account area, so it returns the resulting state rather than a message the
 * caller has to interpret. A signed-out visitor gets `ok: false` with a
 * distinct message; the button turns that into a trip to the sign-in page
 * carrying the current path, so the customer lands back where they were.
 */
export async function toggleSavedListing(
  kind: SavedKind,
  listingId: string,
  saved: boolean,
): Promise<ActionResult & { saved?: boolean; requiresAuth?: boolean }> {
  const user = await getSessionUser();
  if (!user) {
    return { ...fail("Sign in to save listings."), requiresAuth: true };
  }

  const parsed = savedInputSchema.safeParse({ kind, listingId, saved });
  if (!parsed.success) {
    return fail("That listing could not be identified.");
  }

  const limit = rateLimit(await clientKey("account-saved"), 200, 10 * 60 * 1000);
  if (!limit.ok) return fail("Too many changes at once. Please slow down a moment.");

  const result = await setSavedListing(user.id, parsed.data.kind, parsed.data.listingId, parsed.data.saved);

  if (result.ok) {
    revalidatePath("/account");
    revalidatePath("/account/saved");
  }

  return { ...(result.ok ? succeed(result.message) : fail(result.message)), saved: result.saved };
}
