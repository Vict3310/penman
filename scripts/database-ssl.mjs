/**
 * TLS policy for the operator scripts.
 *
 * This mirrors `resolveSslConfig()` in src/lib/auth/db.ts, which is the source
 * of truth for the application. It lives here as well because the scripts are
 * plain ESM and cannot import TypeScript. If the policy in db.ts changes, change
 * this too.
 *
 * Why verification is NOT the default: Supabase's pooler serves a certificate
 * chain Node cannot build to a trusted root — connecting with
 * `rejectUnauthorized: true` fails with "self-signed certificate in certificate
 * chain", measured against the live database. Defaulting to verification made
 * `npm run create-admin` fail outright, which is the one approved way to obtain
 * administrator access.
 *
 * So: a remote host is ALWAYS encrypted, and the peer certificate is verified
 * only when explicitly asked for. That protects against passive interception,
 * not against an active man-in-the-middle. Where the provider's chain resolves,
 * set DATABASE_SSL_VERIFY=true (or use sslmode=verify-full) and get the
 * stronger guarantee.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ rejectUnauthorized: boolean } | undefined}
 */
export function resolveSslConfig(env) {
  const mode = String(env.DATABASE_SSL ?? "").trim().toLowerCase();
  if (mode === "disable") return undefined;

  const url = String(env.DATABASE_URL ?? "").trim();
  if (!url) return undefined;

  let hostname = "";
  let sslmode = "";
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.toLowerCase();
    sslmode = (parsed.searchParams.get("sslmode") ?? "").trim().toLowerCase();
  } catch {
    // An unparseable URL is a configuration error the connection itself reports
    // far more usefully than this function could.
    return undefined;
  }

  // An explicit sslmode in the connection string takes precedence.
  if (sslmode === "disable") return undefined;
  if (sslmode === "no-verify") return { rejectUnauthorized: false };

  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost");

  const tlsRequested =
    mode === "require" ||
    sslmode === "require" ||
    sslmode === "verify-ca" ||
    sslmode === "verify-full";

  // Nothing to encrypt between two processes on this machine.
  if (!tlsRequested && isLocal) return undefined;

  // DATABASE_SSL_NO_VERIFY is the older spelling of this escape hatch and is
  // still honoured so an existing .env.local does not silently change meaning.
  const verifyStrictly =
    env.DATABASE_SSL_VERIFY === "true" ||
    sslmode === "verify-ca" ||
    sslmode === "verify-full";

  if (env.DATABASE_SSL_NO_VERIFY === "true") return { rejectUnauthorized: false };

  return { rejectUnauthorized: verifyStrictly };
}

/**
 * TLS parameters that must not reach `pg`.
 *
 * `pg` parses the connection string itself and spreads the result over the
 * options object, so `sslmode` in the URL overrides the explicit `ssl` object —
 * and `pg` treats `sslmode=require` as verify-full, which fails against
 * Supabase's pooler with "self-signed certificate in certificate chain".
 * Stripping the parameter lets the policy above decide, after it has read it.
 * Mirrors SSL_URL_PARAMETERS in src/lib/auth/db.ts.
 */
const SSL_URL_PARAMETERS = [
  "sslmode",
  "ssl",
  "sslpassword",
  "sslcert",
  "sslkey",
  "sslrootcert",
  "sslcrl",
  "uselibpqcompat",
];

/** Remove TLS parameters from a Postgres URL; other query parameters survive. */
export function sanitizeConnectionString(url) {
  try {
    const parsed = new URL(url);
    for (const parameter of SSL_URL_PARAMETERS) parsed.searchParams.delete(parameter);
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * The `{ connectionString, ssl }` pair to hand to `pg`, with TLS params removed
 * from the URL so the explicit `ssl` setting is the one that takes effect.
 *
 * @param {Record<string, string | undefined>} env
 */
export function connectionOptions(env) {
  const url = String(env.DATABASE_URL ?? "").trim();
  return { connectionString: sanitizeConnectionString(url), ssl: resolveSslConfig(env) };
}
