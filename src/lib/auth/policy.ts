/**
 * Password policy.
 *
 * This module is deliberately NOT marked `server-only`. The sign-up form needs
 * these numbers to show its live requirements, and duplicating the value in the
 * client would let the two drift apart — the form could promise "8 characters"
 * while the server enforced something else, which is exactly the kind of
 * mismatch that produces a form that cannot be submitted.
 *
 * Everything else in src/lib/auth/ is server-only; this file is the one
 * exception and it contains no secrets and no logic, only limits.
 */

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
