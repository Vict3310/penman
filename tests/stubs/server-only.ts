/**
 * The real `server-only` package throws unless it is resolved under the
 * `react-server` export condition, which Vitest does not use. Aliasing it to
 * this empty module lets unit tests import server utilities directly.
 *
 * This affects the test runner only — Next.js still enforces the real guard
 * at build time, so a client component importing a server-only module still
 * fails the production build.
 */
export {};
