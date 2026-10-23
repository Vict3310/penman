"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { fail, succeed, type ActionResult } from "@/lib/action-result";
import { endSession, startFreshSession } from "@/lib/auth/current-user";
import { getPool, isAuthDatabaseConfigured, withTransaction } from "@/lib/auth/db";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  consumeVerificationTime,
  hashPassword,
  verifyPassword,
} from "@/lib/auth/password";
import {
  RESET_TOKEN_TTL_MINUTES,
  consumePasswordResetToken,
  createPasswordResetToken,
} from "@/lib/auth/reset";
import {
  DuplicateEmailError,
  canSignIn,
  createUser,
  findUserByEmail,
  markLogin,
} from "@/lib/auth/users";
import { sendPasswordResetEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/env";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { safeInternalPath } from "@/lib/safe-path";
import type { ProfileRole } from "@/lib/types";
import {
  passwordResetRequestSchema,
  passwordResetSchema,
  zodFieldErrors,
} from "@/lib/validation";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

/**
 * Read a text field from a submission.
 *
 * Returns an empty string for anything that is not a string — a missing field,
 * or a value that arrived as a File part. Coercing with String() instead would
 * turn a File into "[object File]", which is 13 characters and would sail past
 * a minimum-length check as if it were a real name.
 */
function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name")
      .max(120, "That name is too long"),
    email: z.string().trim().email("Enter a valid email address"),
    // Optional, but if it is given it has to look like a phone number.
    phone: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || value.length >= 7, { message: "Enter a valid phone number" })
      .transform((value) => value || null),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(MAX_PASSWORD_LENGTH, "That password is too long"),
    confirmPassword: z.string(),
    // An unchecked checkbox submits nothing at all, so absence is the failure.
    acceptTerms: z
      .string()
      .optional()
      .refine((value) => value === "on", { message: "Please accept the terms to continue" }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/**
 * The single message returned for every rejected credential.
 *
 * An unknown email, a wrong password and a disabled account must be
 * indistinguishable here, otherwise the form becomes an account-enumeration
 * oracle that tells an attacker which addresses are registered.
 */
const CREDENTIALS_REJECTED = "Those credentials did not work. Please check and try again.";

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const { email, password, next } = parsed.data;

  if (!isAuthDatabaseConfigured()) {
    return fail(
      "Sign-in is not available on this deployment yet, because it has no database configured.",
    );
  }

  const limit = rateLimit(await clientKey("login"), 8, 10 * 60 * 1000);
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return fail(`Too many sign-in attempts. Please try again in about ${minutes} minute(s).`);
  }

  let userId: string | null = null;
  let role: ProfileRole | null = null;

  try {
    const pool = getPool();
    const user = await findUserByEmail(pool, email);

    // The password is verified even when no account exists, so a missing email
    // costs the same as a wrong password rather than returning early and
    // revealing which of the two it was.
    const passwordMatches = await verifyPassword(user?.password_hash ?? null, password);

    if (!user || !passwordMatches || !canSignIn(user)) {
      return fail(CREDENTIALS_REJECTED);
    }

    await markLogin(pool, user.id);
    userId = user.id;
    role = user.role;
  } catch (error) {
    // A database or configuration failure is NOT a bad password, and saying so
    // matters: a deployment whose DATABASE_URL could not be reached reported
    // "wrong credentials" for a correct password, which sends people looking at
    // the account instead of the connection. Nothing sensitive is revealed —
    // the account-enumeration guarantee above only concerns rejected
    // credentials, and this branch is never reached for a wrong password.
    console.error(
      "Sign-in failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return fail("Sign-in is temporarily unavailable. Please try again in a moment.");
  }

  // Creating the session is deliberately outside the block above: a database
  // problem here is not a bad password, and conflating the two would tell the
  // visitor their credentials were wrong when they were not.
  try {
    await startFreshSession(userId);
  } catch (error) {
    console.error(
      "Session could not be created:",
      error instanceof Error ? error.message : "unknown error",
    );
    return fail("You were signed in, but the session could not be stored. Please try again.");
  }

  // Outside every try/catch on purpose: redirect() signals by throwing, so a
  // catch block here would swallow the navigation and leave the user on the
  // form with no explanation.
  const fallback = role === "admin" ? "/admin" : "/account";
  redirect(safeInternalPath(next) ?? fallback);
}

/**
 * Create a customer account and sign the new customer in.
 *
 * Registration is open to the public, so the single most important property
 * here is what it CANNOT do: create an administrator. `createUser()` has no
 * role parameter and its INSERT omits the column entirely, so the database
 * default of 'viewer' applies. There is no form field, query parameter or
 * client-side value that can influence it. Administrator access is granted
 * only by the one-time bootstrap script or by an existing administrator
 * promoting someone deliberately.
 */
export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    fullName: text(formData, "fullName"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
    acceptTerms: text(formData, "acceptTerms") || undefined,
  });

  if (!parsed.success) {
    return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  if (!isAuthDatabaseConfigured()) {
    return fail(
      "Accounts cannot be created on this deployment yet, because it has no database configured.",
    );
  }

  const limit = rateLimit(await clientKey("signup"), 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return fail(
      "Several accounts have already been created from this connection. Please try again later.",
    );
  }

  const { fullName, email, phone, password } = parsed.data;

  let userId: string | null = null;

  try {
    const created = await createUser(getPool(), {
      email,
      passwordHash: await hashPassword(password),
      fullName,
      phone,
    });
    userId = created.id;
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      // This one IS worth naming: telling somebody their email is taken helps
      // the legitimate returning customer far more than it helps an attacker,
      // who can discover the same fact by attempting to register anyway.
      return fail("An account with that email already exists. Try signing in instead.", {
        email: ["That email is already registered."],
      });
    }

    console.error(
      "Registration failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return fail("We could not create your account. Please try again.");
  }

  try {
    await startFreshSession(userId);
  } catch (error) {
    console.error(
      "Session could not be created after registration:",
      error instanceof Error ? error.message : "unknown error",
    );
    // The account exists, so this is not a failure of registration. Say so
    // rather than implying nothing was saved. The customer's email is correct
    // in the database and they can sign in with the password they just chose.
    return fail(
      "Your account was created, but we could not sign you in automatically. Please sign in instead.",
    );
  }

  // Outside every try/catch: redirect() signals by throwing, and catching it
  // here would swallow the navigation.
  redirect("/account");
}

/**
 * Sign out.
 *
 * The database revocation is the part that actually matters: clearing the
 * cookie alone would leave a live session row that anyone holding the token
 * could keep using. `endSession()` revokes first, then expires the cookie.
 */
export async function signOut(): Promise<void> {
  await endSession();
  redirect("/login");
}

/* ── Password reset ──────────────────────────────────────────────────── */

/**
 * The single answer to every reset request.
 *
 * Unknown address, disabled account, mail outage — all produce this, because a
 * distinguishable answer would turn the form into an account-enumeration
 * oracle. The customer still gets the useful instruction; they just cannot
 * learn from it whether the address is registered.
 */
const RESET_REQUESTED = `If an account exists for that address, a reset link is on its way. It expires in ${RESET_TOKEN_TTL_MINUTES} minutes.`;

/**
 * Request a password reset link.
 *
 * Three protections, in order: validation, a tight per-IP rate limit, and a
 * response that never varies with whether the account exists. Tokens are
 * generated only for an active account that actually has a credential — a
 * profile carried over from the old provider has no password to reset, and
 * issuing a link would let anyone claim it by setting the first password.
 */
export async function requestPasswordReset(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = passwordResetRequestSchema.safeParse({ email: text(formData, "email") });
  if (!parsed.success) {
    return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  if (!isAuthDatabaseConfigured()) {
    return fail(
      "Password reset is not available on this deployment yet, because it has no database configured.",
    );
  }

  const limit = rateLimit(await clientKey("password-reset"), 3, 15 * 60 * 1000);
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return fail(`Too many reset requests. Please try again in about ${minutes} minute(s).`);
  }

  try {
    const pool = getPool();
    const user = await findUserByEmail(pool, parsed.data.email);

    if (!user || !canSignIn(user)) {
      // Burn a comparable amount of work when there is nothing to send, so the
      // response time does not answer the question the message refuses to.
      await consumeVerificationTime(parsed.data.email);
      return succeed(RESET_REQUESTED);
    }

    const { token } = await createPasswordResetToken(pool, user.id);
    const resetUrl = `${getSiteUrl()}/reset-password?token=${encodeURIComponent(token)}`;

    await sendPasswordResetEmail({
      to: user.email,
      name: user.full_name,
      resetUrl,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    });

    return succeed(RESET_REQUESTED);
  } catch (error) {
    // A database or mail failure is not the customer's problem to diagnose, and
    // saying anything else here would differ from the "no such account" answer.
    console.error(
      "Password reset request failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return succeed(RESET_REQUESTED);
  }
}

/**
 * Complete a reset with a single-use token.
 *
 * The token is consumed, the password replaced and every session revoked in
 * one transaction. A fresh session is then issued for this request, so the
 * customer is signed in on the device where they just chose the password
 * instead of being bounced back to a sign-in form.
 */
export async function resetPassword(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = passwordResetSchema.safeParse({
    token: text(formData, "token"),
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  if (!isAuthDatabaseConfigured()) {
    return fail(
      "Password reset is not available on this deployment yet, because it has no database configured.",
    );
  }

  const limit = rateLimit(await clientKey("password-reset-complete"), 8, 15 * 60 * 1000);
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return fail(`Too many attempts. Please try again in about ${minutes} minute(s).`);
  }

  let userId: string;

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const result = await withTransaction((tx) =>
      consumePasswordResetToken(tx, parsed.data.token, passwordHash),
    );

    if (!result) {
      return fail("That reset link is invalid or has expired. Request a new one.");
    }

    userId = result.userId;
  } catch (error) {
    console.error(
      "Password reset failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return fail("We could not reset your password. Please try again.");
  }

  try {
    await startFreshSession(userId);
  } catch (error) {
    console.error(
      "Session could not be created after a password reset:",
      error instanceof Error ? error.message : "unknown error",
    );
    // The password WAS changed, so do not imply otherwise. Send them to sign in.
    redirect("/login?reset=1");
  }

  redirect("/account");
}
