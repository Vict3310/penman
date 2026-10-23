/**
 * The session cookie's name, in a module that carries no dependencies.
 *
 * The name used to live in src/lib/auth/session.ts. Edge middleware cannot
 * import that file — it pulls in the database driver, which is not available
 * at the edge — so the name was either duplicated as a string literal in the
 * middleware (where it could drift from the real name and silently stop
 * matching) or extracted to somewhere both can reach. This is that place.
 *
 * session.ts imports and re-exports this, so `SESSION_COOKIE_NAME` from
 * src/lib/auth/session still works and there is exactly one definition.
 */

export const SESSION_COOKIE_NAME = "penman_session";
