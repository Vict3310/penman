import "server-only";

import { Pool } from "pg";

/**
 * Database access for authentication only.
 *
 * Authentication uses the `pg` driver directly rather than the Supabase REST
 * client, for two reasons:
 *
 *   1. Transactions. Creating an account and its first session must be atomic,
 *      and PostgREST has no transaction primitive.
 *   2. Independence. The application is expected to own its identity layer, so
 *      it talks to Postgres rather than to a provider-specific API. The same
 *      code works against Supabase's Postgres or a Neon database.
 *
 * Everything here is reachable only from server code. The `sessions` and
 * `password_reset_tokens` tables have Row Level Security enabled with no
 * policy at all, which denies every anonymous and authenticated request — so
 * these tables can only be read through this module.
 */

/**
 * The minimal slice of a SQL client this module needs.
 *
 * `pg.Pool`, `pg.PoolClient` and PGlite all satisfy it, which lets the test
 * suite run the real SQL against an embedded engine without a live database.
 */
export interface Queryable {
  query<R = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ rows: R[] }>;
}

let pool: Pool | null = null;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Authentication cannot run until the application can reach its Postgres database.",
    );
  }
  return url;
}

/** True when authentication has somewhere to store users and sessions. */
export function isAuthDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Hosts that are unambiguously this machine. */
function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".localhost")
  );
}

/**
 * TLS policy, decided by the TARGET rather than by NODE_ENV.
 *
 * Two separate corrections live here, both learned the hard way.
 *
 * 1. NODE_ENV was the wrong signal. With NODE_ENV=development this returned no
 *    TLS at all, and a hosted Postgres refuses a plaintext connection outright.
 *    "Local development" was standing in for "local database", but running
 *    `next dev` against a hosted database is normal. The result was a
 *    connection failure that looked like a credentials or network problem.
 *
 * 2. Certificate verification CANNOT be the default either. Supabase's pooler
 *    serves a chain Node cannot build to a trusted root — connecting to
 *    aws-0-eu-west-1.pooler.supabase.com with rejectUnauthorized: true fails
 *    with "self-signed certificate in certificate chain", verified against the
 *    live database. Defaulting to verification would trade one opaque failure
 *    for another.
 *
 * So: the connection is ALWAYS encrypted for a remote host, but the peer
 * certificate is not verified unless asked for. That is a real trade — it
 * protects against passive interception, not against an active
 * man-in-the-middle. Where the provider's chain is resolvable, set
 * DATABASE_SSL_VERIFY=true and get verification; `sslmode=verify-full` does
 * the same thing from the connection string.
 */
export function resolveSslConfig(): { rejectUnauthorized: boolean } | undefined {
  const mode = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (mode === "disable") return undefined;

  const url = process.env.DATABASE_URL?.trim();
  if (!url) return undefined;

  let hostname = "";
  let sslmode = "";
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
    sslmode = (parsed.searchParams.get("sslmode") ?? "").trim().toLowerCase();
  } catch {
    // An unparseable URL is a configuration error that the connection itself
    // reports far more usefully than this function could.
    return undefined;
  }

  // An explicit sslmode in the connection string takes precedence.
  if (sslmode === "disable") return undefined;
  if (sslmode === "no-verify") return { rejectUnauthorized: false };

  const tlsRequested =
    mode === "require" ||
    sslmode === "require" ||
    sslmode === "verify-ca" ||
    sslmode === "verify-full";

  // Nothing to encrypt between two processes on this machine.
  if (!tlsRequested && isLocalHostname(hostname)) return undefined;

  const verifyStrictly =
    process.env.DATABASE_SSL_VERIFY === "true" ||
    sslmode === "verify-ca" ||
    sslmode === "verify-full";

  return { rejectUnauthorized: verifyStrictly };
}

/**
 * libpq TLS parameters that must not reach `pg` when we supply `ssl`.
 *
 * `pg` parses the connection string itself and SPREADS its result over the
 * options object, so a `sslmode` in the URL silently replaces the `ssl` object
 * computed by `resolveSslConfig()`. Worse, modern `pg` treats `sslmode=require`
 * as `verify-full`, which fails against Supabase's pooler with "self-signed
 * certificate in certificate chain". A deployment whose DATABASE_URL came from
 * the Supabase dashboard therefore could not connect at all — and because the
 * sign-in action catches connection errors and reports them as bad
 * credentials, it looked like a wrong password.
 *
 * The URL is still read for its sslmode before this runs; only the parameter is
 * removed, so our policy decides whether to encrypt and whether to verify.
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

/**
 * Remove TLS parameters from a Postgres URL so the explicit `ssl` option wins.
 *
 * Other query parameters are preserved. An unparseable URL is returned
 * unchanged — the connection will report that far more usefully than this.
 */
export function sanitizeConnectionString(url: string): string {
  try {
    const parsed = new URL(url);
    for (const parameter of SSL_URL_PARAMETERS) {
      parsed.searchParams.delete(parameter);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: sanitizeConnectionString(getDatabaseUrl()),
      // Serverless deployments create many short-lived instances; a small
      // per-instance pool avoids exhausting the database's connection limit.
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: resolveSslConfig(),
    });
  }
  return pool;
}

/** Run a single statement outside a transaction. */
export async function query<R = Record<string, unknown>>(
  sql: string,
  params?: readonly unknown[],
): Promise<{ rows: R[] }> {
  const result = await getPool().query(sql, params as unknown[]);
  return { rows: result.rows as R[] };
}

/**
 * Run `fn` inside a transaction, rolling back if it throws.
 *
 * The callback receives a client bound to the open transaction, so every
 * statement it issues through that handle participates in the same atomic
 * unit. Using the outer `query()` helper inside the callback would silently
 * escape the transaction — always use the supplied handle.
 */
export async function withTransaction<T>(
  fn: (tx: Queryable) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("begin");
    const handle: Queryable = {
      async query<R = Record<string, unknown>>(sql: string, params?: readonly unknown[]) {
        const result = await client.query(sql, params as unknown[]);
        return { rows: result.rows as R[] };
      },
    };

    const value = await fn(handle);
    await client.query("commit");
    return value;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // The connection may already be gone; the original error is the useful
      // one, so it is rethrown below rather than replaced by this failure.
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Close the pool. Used by scripts and tests so the process can exit. */
export async function closePool(): Promise<void> {
  if (pool) {
    const closing = pool;
    pool = null;
    await closing.end();
  }
}
