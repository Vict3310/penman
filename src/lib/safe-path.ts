/**
 * Validation for a redirect target that came from the browser.
 *
 * A `?next=` parameter is attacker-controlled, and the naive check — does it
 * start with "/" — is not enough:
 *
 *   "//evil.example/penman"   starts with "/" but a browser reads it as
 *                             PROTOCOL-RELATIVE, so it navigates off-site.
 *   "/\\evil.example"          the backslash is normalised to "/" by several
 *                             browsers, with the same result.
 *   "/\nhttps://evil.example" some clients strip the newline and decode the
 *                             remainder as an absolute URL.
 *
 * Any of those turns a sign-in link into a credible phishing hop: the victim
 * genuinely signs in on the real site and is then handed to a look-alike.
 *
 * So a target is accepted only when it is a single-slash-rooted path with no
 * backslashes and no control characters. Everything else is discarded and the
 * caller falls back to a destination of its own choosing.
 */

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function isSafeInternalPath(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return false;
  // "//host" and "/\host" are absolute URLs to a browser.
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return false;
  if (trimmed.includes("\\")) return false;
  if (CONTROL_CHARACTERS.test(trimmed)) return false;

  return true;
}

/** The given path when it is safe, otherwise null. */
export function safeInternalPath(value: unknown): string | null {
  return isSafeInternalPath(value) ? value.trim() : null;
}
