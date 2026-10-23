import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Opaque token generation and storage hashing.
 *
 * Session tokens and password-reset tokens are generated with a
 * cryptographically secure random source and are stored ONLY as a SHA-256
 * hash. The plaintext token exists in exactly two places: the response that
 * sets the cookie, and — for resets — the link that is emailed. A database
 * leak therefore yields no usable sessions and no usable reset links.
 *
 * A plain SHA-256 is the correct choice here rather than Argon2. These tokens
 * are 256 bits of uniform randomness, not user-chosen secrets, so there is
 * nothing to brute-force or guess; a slow password hash would only make every
 * authenticated request expensive. Passwords are handled by ./password.ts.
 */

/** 256 bits — far beyond any feasible online guessing attack. */
export const TOKEN_BYTES = 32;

/** Generate a new opaque token, URL-safe so it can travel in a cookie or link. */
export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** The value stored in the database for a given token. Never store the token itself. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time comparison for two tokens or hashes.
 *
 * Length is compared first and in the clear: `timingSafeEqual` throws on
 * mismatched lengths, and a length difference is not itself a secret worth
 * protecting for values of fixed size.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Basic structural check for a token supplied by a client.
 *
 * Rejects obviously malformed input before it reaches a database query. This
 * is input hygiene, not a security boundary — the hash lookup is the real
 * check — but it keeps junk out of the query path.
 */
export function looksLikeToken(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.length !== 43) return false; // 32 bytes base64url, unpadded
  return /^[A-Za-z0-9_-]+$/.test(value);
}
