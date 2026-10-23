import "server-only";

import { hash, verify } from "@node-rs/argon2";

/**
 * Password hashing.
 *
 * Argon2id, using the parameters OWASP recommends as a minimum for the
 * Argon2id variant (19 MiB memory, 2 iterations, 1 degree of parallelism).
 * Argon2id is the hybrid variant: it resists both GPU cracking (memory cost)
 * and side-channel attacks (data-independent first pass).
 *
 * `@node-rs/argon2` ships prebuilt binaries, so no C toolchain is needed at
 * deploy time — unlike the `argon2` package, which compiles from source and is
 * the usual cause of build failures on serverless platforms.
 *
 * Nothing in this module logs, and nothing returns a hash to a caller that
 * could forward it to the browser. Hashes exist only to be stored and compared.
 */

/**
 * `algorithm` is not set explicitly: @node-rs/argon2 already defaults to
 * Argon2id, and naming the package's `Algorithm` enum is not possible here —
 * it is an ambient const enum, which `isolatedModules` forbids referencing.
 * The default is not taken on trust: tests/auth-core.test.ts asserts the
 * "$argon2id$" prefix of every stored hash and the m= / t= parameters, so a
 * change to the library default cannot pass silently.
 */
const ARGON2ID_PARAMS = {
  memoryCost: 19_456, // KiB — 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

// Re-exported so server code has a single import site for password concerns.
// The values themselves live in ./policy.ts, which client components may read.
export { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/policy";

/**
 * A pre-computed hash used only to burn the same CPU time when no account
 * matches, so response time cannot be used to discover which emails exist.
 * Computed lazily on first use and reused thereafter.
 */
let decoyHash: string | null = null;

async function getDecoyHash(): Promise<string> {
  if (!decoyHash) {
    decoyHash = await hash("penman-empire-decoy-not-a-real-password", ARGON2ID_PARAMS);
  }
  return decoyHash;
}

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2ID_PARAMS);
}

/**
 * Verify a password against a stored hash.
 *
 * Returns false — never throws — for a missing or malformed hash, so a corrupt
 * row cannot turn into a 500 that distinguishes it from a wrong password. When
 * there is no hash to check, an equivalent amount of work is still done so the
 * timing of "no such account" and "wrong password" stay indistinguishable.
 */
export async function verifyPassword(
  storedHash: string | null | undefined,
  plain: string,
): Promise<boolean> {
  if (!storedHash) {
    try {
      await verify(await getDecoyHash(), plain);
    } catch {
      // Timing equalisation only; the result is discarded regardless.
    }
    return false;
  }

  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}

/**
 * Burn one password-verification worth of work without checking anything.
 *
 * Used on the "no account with that email" path of login and password reset so
 * that both branches cost roughly the same.
 */
export async function consumeVerificationTime(plain: string): Promise<void> {
  await verifyPassword(null, plain);
}
