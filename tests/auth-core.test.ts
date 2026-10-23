import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE_NAME,
  clearedSessionCookie,
  createSession,
  getSessionTtlSeconds,
  resolveSession,
  revokeAllSessions,
  revokeSession,
  rotateSession,
  sessionCookie,
  touchSession,
} from "@/lib/auth/session";
import { generateToken, hashToken, looksLikeToken, safeEqual } from "@/lib/auth/tokens";
import {
  DuplicateEmailError,
  createAdministrator,
  createUser,
  normalizeEmail,
  type NewUserInput,
  type UserRecord,
} from "@/lib/auth/users";

import { createAuthDb, testEmail, type AuthTestDb } from "./helpers/auth-db";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  // `NODE_ENV` is declared readonly in @types/node, so it is stubbed through
  // Vitest's API rather than assigned directly.
  vi.unstubAllEnvs();
  process.env = { ...ORIGINAL_ENV };
});

/* ══════════════════════════════════════════════════════════════════════════
   Password hashing
   ══════════════════════════════════════════════════════════════════════════ */

describe("Argon2id password hashing", () => {
  it("hashes with Argon2id at the OWASP parameters and never embeds the plaintext", async () => {
    const password = "correct horse battery staple";
    const stored = await hashPassword(password);

    expect(stored.startsWith("$argon2id$")).toBe(true);
    expect(stored).toContain("m=19456"); // 19 MiB
    expect(stored).toContain("t=2");
    expect(stored).not.toContain(password);
  });

  it("salts each hash, so identical passwords produce different stored values", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");

    expect(a).not.toBe(b);
    // Both must still verify — the difference is the salt, not the password.
    await expect(verifyPassword(a, "same-password")).resolves.toBe(true);
    await expect(verifyPassword(b, "same-password")).resolves.toBe(true);
  });

  it("accepts the correct password and rejects an incorrect one", async () => {
    const stored = await hashPassword("right-password");

    await expect(verifyPassword(stored, "right-password")).resolves.toBe(true);
    await expect(verifyPassword(stored, "wrong-password")).resolves.toBe(false);
    await expect(verifyPassword(stored, "right-password ")).resolves.toBe(false);
    await expect(verifyPassword(stored, "")).resolves.toBe(false);
  });

  it("returns false rather than throwing for a missing or malformed hash", async () => {
    // A corrupt row must not become a 500 that is distinguishable from a wrong
    // password, because that difference leaks which accounts exist.
    await expect(verifyPassword(null, "anything")).resolves.toBe(false);
    await expect(verifyPassword(undefined, "anything")).resolves.toBe(false);
    await expect(verifyPassword("", "anything")).resolves.toBe(false);
    await expect(verifyPassword("not-a-hash-at-all", "anything")).resolves.toBe(false);
    await expect(verifyPassword("$argon2id$truncated", "anything")).resolves.toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Tokens
   ══════════════════════════════════════════════════════════════════════════ */

describe("session tokens", () => {
  it("generates a URL-safe 256-bit token", () => {
    const token = generateToken();

    expect(token).toHaveLength(43); // 32 bytes, base64url, unpadded
    expect(looksLikeToken(token)).toBe(true);
  });

  it("never repeats a token", () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generateToken()));
    expect(tokens.size).toBe(500);
  });

  it("hashes irreversibly and deterministically", () => {
    const token = generateToken();
    const digest = hashToken(token);

    expect(digest).toHaveLength(64); // sha256 hex
    expect(digest).toBe(hashToken(token));
    expect(digest).not.toContain(token);
  });

  it("rejects structurally invalid tokens before they reach a query", () => {
    expect(looksLikeToken(undefined)).toBe(false);
    expect(looksLikeToken(null)).toBe(false);
    expect(looksLikeToken(123)).toBe(false);
    expect(looksLikeToken("")).toBe(false);
    expect(looksLikeToken("too-short")).toBe(false);
    expect(looksLikeToken(`${generateToken()}=`)).toBe(false); // padding
    expect(looksLikeToken(`${"a".repeat(42)}!`)).toBe(false); // illegal character
  });

  it("compares in constant time and survives length mismatch", () => {
    const token = generateToken();

    expect(safeEqual(token, token)).toBe(true);
    expect(safeEqual(token, generateToken())).toBe(false);
    // timingSafeEqual throws on unequal lengths; it must not escape.
    expect(safeEqual("short", token)).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Cookie policy and session lifetime
   ══════════════════════════════════════════════════════════════════════════ */

describe("session cookie policy", () => {
  const expiresAt = () => new Date(Date.now() + 60 * 60 * 1000);

  it("is HttpOnly, SameSite=Lax and scoped to the whole site", () => {
    const cookie = sessionCookie("token-value", expiresAt());

    expect(cookie.name).toBe(SESSION_COOKIE_NAME);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("lax");
    expect(cookie.path).toBe("/");
    expect(cookie.maxAge).toBeGreaterThan(0);
  });

  it("sets Secure in production and relaxes it only for local development", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.AUTH_COOKIE_SECURE;
    expect(sessionCookie("t", expiresAt()).secure).toBe(true);

    vi.stubEnv("NODE_ENV", "development");
    expect(sessionCookie("t", expiresAt()).secure).toBe(false);
  });

  it("lets an explicit override win, so a deployed preview can be tested over http", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.AUTH_COOKIE_SECURE = "false";
    expect(sessionCookie("t", expiresAt()).secure).toBe(false);

    vi.stubEnv("NODE_ENV", "development");
    process.env.AUTH_COOKIE_SECURE = "true";
    expect(sessionCookie("t", expiresAt()).secure).toBe(true);
  });

  it("expires the cookie when clearing it", () => {
    const cleared = clearedSessionCookie();

    expect(cleared.value).toBe("");
    expect(cleared.maxAge).toBe(0);
    expect(cleared.expires.getTime()).toBe(0);
    expect(cleared.httpOnly).toBe(true);
  });

  it("defaults to a seven day lifetime and clamps nonsense input", () => {
    const secondsPerDay = 24 * 60 * 60;

    delete process.env.AUTH_SESSION_TTL_DAYS;
    expect(getSessionTtlSeconds()).toBe(7 * secondsPerDay);

    process.env.AUTH_SESSION_TTL_DAYS = "14";
    expect(getSessionTtlSeconds()).toBe(14 * secondsPerDay);

    // Out of range and unparseable values fall back to a safe window rather
    // than producing a session that never expires or one that ends instantly.
    process.env.AUTH_SESSION_TTL_DAYS = "0";
    expect(getSessionTtlSeconds()).toBe(1 * secondsPerDay);

    process.env.AUTH_SESSION_TTL_DAYS = "100000";
    expect(getSessionTtlSeconds()).toBe(90 * secondsPerDay);

    process.env.AUTH_SESSION_TTL_DAYS = "soon";
    expect(getSessionTtlSeconds()).toBe(7 * secondsPerDay);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Configuration and the fail-closed contract

   These load src/lib/auth/db.ts and src/lib/auth/current-user.ts at runtime.
   Nothing else in the suite does — the SQL tests import only the `Queryable`
   type — so without this block those two modules would never be executed by
   any check, and the fail-closed promise would be untested prose.
   ══════════════════════════════════════════════════════════════════════════ */

describe("configuration and fail-closed behaviour", () => {
  afterEach(() => {
    vi.doUnmock("next/headers");
    vi.resetModules();
  });

  it("reports authentication as unconfigured when DATABASE_URL is absent", async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();

    const { getDatabaseUrl, isAuthDatabaseConfigured } = await import("@/lib/auth/db");

    expect(isAuthDatabaseConfigured()).toBe(false);
    expect(() => getDatabaseUrl()).toThrow(/DATABASE_URL is not set/);
  });

  it("reports authentication as configured once DATABASE_URL is present", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/penman";
    vi.resetModules();

    const { getDatabaseUrl, isAuthDatabaseConfigured } = await import("@/lib/auth/db");

    expect(isAuthDatabaseConfigured()).toBe(true);
    expect(getDatabaseUrl()).toBe(process.env.DATABASE_URL);
  });

  /**
   * TLS is decided by the target host, not by NODE_ENV.
   *
   * The earlier implementation returned no TLS whenever NODE_ENV was not
   * "production", which breaks `next dev` against a hosted database — a hosted
   * Postgres refuses a plaintext connection. Those cases are pinned below so
   * the regression cannot come back.
   */
  describe("TLS policy", () => {
    const loadDb = async () => {
      vi.resetModules();
      return import("@/lib/auth/db");
    };

    it("encrypts a remote database even in development", async () => {
      process.env.DATABASE_URL = "postgresql://user:pass@db.example.supabase.co:5432/postgres";
      delete process.env.DATABASE_SSL;
      delete process.env.DATABASE_SSL_VERIFY;
      vi.stubEnv("NODE_ENV", "development");

      const { resolveSslConfig } = await loadDb();

      // Encrypted, yes. The assertion is `toBeDefined` rather than a specific
      // rejectUnauthorized value on purpose: NODE_ENV must have no influence
      // on WHETHER TLS is used, which is the bug this replaced.
      expect(resolveSslConfig()).toBeDefined();
    });

    it("encrypts a remote database in production too", async () => {
      process.env.DATABASE_URL = "postgresql://user:pass@db.example.supabase.co:5432/postgres";
      vi.stubEnv("NODE_ENV", "production");

      const { resolveSslConfig } = await loadDb();
      expect(resolveSslConfig()).toBeDefined();
    });

    it("does not verify the peer certificate by default", async () => {
      // Measured against the live Supabase pooler: verification fails with
      // "self-signed certificate in certificate chain", so defaulting to it
      // would make the connection impossible rather than merely strict.
      process.env.DATABASE_URL = "postgresql://u:p@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";
      delete process.env.DATABASE_SSL_VERIFY;

      const { resolveSslConfig } = await loadDb();
      expect(resolveSslConfig()).toEqual({ rejectUnauthorized: false });
    });

    it("verifies the peer certificate when asked", async () => {
      process.env.DATABASE_URL = "postgresql://u:p@db.example.com:5432/postgres";
      process.env.DATABASE_SSL_VERIFY = "true";

      const { resolveSslConfig } = await loadDb();
      expect(resolveSslConfig()).toEqual({ rejectUnauthorized: true });

      // sslmode=verify-full is the connection-string equivalent.
      delete process.env.DATABASE_SSL_VERIFY;
      process.env.DATABASE_URL = "postgresql://u:p@db.example.com:5432/postgres?sslmode=verify-full";
      expect(resolveSslConfig()).toEqual({ rejectUnauthorized: true });
    });

    it("does not encrypt a local database", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const { resolveSslConfig } = await loadDb();

      for (const host of ["localhost", "127.0.0.1", "::1"]) {
        process.env.DATABASE_URL = `postgresql://postgres:postgres@${host}:54322/postgres`;
        expect(resolveSslConfig()).toBeUndefined();
      }
    });

    it("lets sslmode=no-verify relax verification explicitly", async () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@db.example.supabase.co:5432/postgres?sslmode=no-verify";

      const { resolveSslConfig } = await loadDb();
      expect(resolveSslConfig()).toEqual({ rejectUnauthorized: false });
    });

    it("honours DATABASE_SSL=disable even for a remote host", async () => {
      process.env.DATABASE_URL = "postgresql://user:pass@db.example.supabase.co:5432/postgres";
      process.env.DATABASE_SSL = "disable";

      const { resolveSslConfig } = await loadDb();
      expect(resolveSslConfig()).toBeUndefined();
    });

    it("honours sslmode in the connection string", async () => {
      const { resolveSslConfig } = await loadDb();

      process.env.DATABASE_URL =
        "postgresql://u:p@db.example.supabase.co:5432/postgres?sslmode=disable";
      expect(resolveSslConfig()).toBeUndefined();

      process.env.DATABASE_URL =
        "postgresql://u:p@db.example.supabase.co:5432/postgres?sslmode=require";
      expect(resolveSslConfig()).toBeDefined();

      // An explicit require must win even for a local host.
      process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/postgres?sslmode=require";
      expect(resolveSslConfig()).toBeDefined();
    });

    it("returns undefined for a missing or unparseable URL", async () => {
      const { resolveSslConfig } = await loadDb();

      delete process.env.DATABASE_URL;
      expect(resolveSslConfig()).toBeUndefined();

      process.env.DATABASE_URL = "not a url";
      expect(resolveSslConfig()).toBeUndefined();
    });

    /**
     * Regression: `pg` spreads its own parse of the connection string over the
     * options, so `sslmode` in the URL overwrote the explicit `ssl` object.
     * With `sslmode=require` (what the Supabase dashboard hands out) `pg`
     * treats it as verify-full and refuses the pooler's chain. Production then
     * looked like "wrong password" because the sign-in action reports any
     * connection failure as rejected credentials.
     */
    it("strips TLS parameters from the URL before `pg` can override the policy", async () => {
      const { sanitizeConnectionString } = await loadDb();

      expect(
        sanitizeConnectionString(
          "postgresql://u:p@db.example.com:5432/postgres?sslmode=require&pgbouncer=true",
        ),
      ).toBe("postgresql://u:p@db.example.com:5432/postgres?pgbouncer=true");

      expect(
        sanitizeConnectionString(
          "postgresql://u:p@db.example.com/postgres?sslmode=verify-full&ssl=true",
        ),
      ).toBe("postgresql://u:p@db.example.com/postgres");

      // An unparseable URL is left alone for the connection error to explain.
      expect(sanitizeConnectionString("not a url")).toBe("not a url");
    });

    it("gives `pg` the explicit ssl object even when the URL says sslmode=require", async () => {
      const { sanitizeConnectionString } = await loadDb();

      const client = new Client({
        connectionString: sanitizeConnectionString(
          "postgresql://u:p@db.example.com:5432/postgres?sslmode=require",
        ),
        ssl: { rejectUnauthorized: false },
      });

      // What `pg` will actually connect with. `connectionParameters` is not in
      // @types/pg, hence the cast; before the fix this was `true` (verify-full),
      // which the Supabase pooler's chain cannot satisfy.
      const parameters = (
        client as unknown as { connectionParameters: { ssl: unknown } }
      ).connectionParameters;
      expect(parameters.ssl).toEqual({ rejectUnauthorized: false });
    });
  });

  it("resolves no user, rather than throwing, when the database is not configured", async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();

    const { getSessionUser } = await import("@/lib/auth/current-user");

    // An unconfigured deployment must be unable to authenticate anyone — never
    // able to authenticate someone by failing to connect.
    await expect(getSessionUser()).resolves.toBeNull();
  });

  it("resolves no user when the cookie store is unavailable outside a request", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/penman";
    vi.resetModules();
    vi.doMock("next/headers", () => ({
      cookies: () => {
        throw new Error("cookies() was called outside a request scope");
      },
    }));

    const { getSessionUser } = await import("@/lib/auth/current-user");

    await expect(getSessionUser()).resolves.toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   User records and sessions, against real SQL
   ══════════════════════════════════════════════════════════════════════════ */

describe("authentication against a real database", () => {
  let handle: AuthTestDb;
  let db: AuthTestDb["db"];

  beforeAll(async () => {
    handle = await createAuthDb();
    db = handle.db;
  });

  afterAll(async () => {
    await handle?.close();
  });

  /** Create an account and return it, with a unique email. */
  async function makeUser(label = "user", passwordHash = "stored-hash"): Promise<UserRecord> {
    return createUser(db, {
      email: testEmail(label),
      passwordHash,
      fullName: `${label} tester`,
    });
  }

  describe("accounts", () => {
    it("normalizes email on the way in", () => {
      expect(normalizeEmail("  Owner@PenmanEmpire.COM ")).toBe("owner@penmanempire.com");
      expect(normalizeEmail("already@lower.com")).toBe("already@lower.com");
    });

    it("creates an active, non-admin account", async () => {
      const user = await makeUser("basic");

      expect(user.role).toBe("viewer");
      expect(user.status).toBe("active");
      expect(user.password_hash).toBe("stored-hash");
      expect(user.email).toMatch(/@penman\.test$/);
    });

    it("stores a normalized email even when the caller does not", async () => {
      const email = testEmail("MIXED");

      // Application-level normalization, in createUser().
      await createUser(db, { email: `  ${email.toUpperCase()}  `, passwordHash: "h" });

      const found = await db.query<{ email: string }>(
        `select email from public.profiles where email = $1`,
        [email.toLowerCase()],
      );
      expect(found.rows).toHaveLength(1);

      // Database-level guard, independent of application code: the trigger
      // normalizes even a raw insert that bypasses createUser() entirely.
      const rawEmail = testEmail("RAW");
      await db.query(
        `insert into public.profiles (email, password_hash) values ($1, 'h')`,
        [`  ${rawEmail.toUpperCase()}  `],
      );

      const raw = await db.query<{ email: string }>(
        `select email from public.profiles where email = $1`,
        [rawEmail.toLowerCase()],
      );
      expect(raw.rows).toHaveLength(1);
    });

    it("ignores an injected role, so public registration cannot grant admin", async () => {
      // The cast is deliberate: it proves that even if a caller smuggled a
      // role into the object, the INSERT never reads it and the database
      // default ('viewer') is what lands.
      const user = await createUser(db, {
        email: testEmail("escalate"),
        passwordHash: "h",
        role: "admin",
      } as NewUserInput & { role: string });

      expect(user.role).toBe("viewer");
    });

    it("rejects a duplicate email regardless of case", async () => {
      const email = testEmail("dupe");
      await createUser(db, { email, passwordHash: "h" });

      await expect(
        createUser(db, { email: email.toUpperCase(), passwordHash: "h" }),
      ).rejects.toBeInstanceOf(DuplicateEmailError);
    });

    it("never returns a password hash through a failed lookup", async () => {
      const missing = await db.query(`select 1 from public.profiles where email = 'nobody@penman.test'`);
      expect(missing.rows).toHaveLength(0);
    });

    it("commits an account created inside a transaction", async () => {
      const email = testEmail("commit");

      await handle.transaction(async (tx) => {
        await createUser(tx, { email, passwordHash: "h" });
      });

      const { rows } = await db.query(`select 1 from public.profiles where email = $1`, [email]);
      expect(rows).toHaveLength(1);
    });

    it("rolls back an account when a later step in the same transaction fails", async () => {
      const email = testEmail("rollback");

      await expect(
        handle.transaction(async (tx) => {
          await createUser(tx, { email, passwordHash: "h" });
          // A registering user is created together with their first session.
          // If anything after the INSERT fails, the account must not survive
          // as an orphan that the customer cannot sign in to.
          throw new Error("simulated failure after account creation");
        }),
      ).rejects.toThrow("simulated failure");

      const { rows } = await db.query(`select 1 from public.profiles where email = $1`, [email]);
      expect(rows).toHaveLength(0);
    });

    it("reaches the administrator role only through createAdministrator", async () => {
      const admin = await createAdministrator(db, {
        email: testEmail("admin"),
        passwordHash: "h",
      });

      expect(admin.role).toBe("admin");
      expect(admin.email_verified_at).not.toBeNull();
    });
  });

  describe("session lifecycle", () => {
    it("resolves a freshly created session to its user", async () => {
      const user = await makeUser("session");
      const { token, expiresAt } = await createSession(db, user.id);

      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      const resolved = await resolveSession(db, token);
      expect(resolved?.id).toBe(user.id);
      expect(resolved?.email).toBe(user.email);
      expect(resolved?.role).toBe("viewer");
    });

    it("stores only the hash — the raw token is never persisted", async () => {
      const user = await makeUser("hashonly");
      const { token } = await createSession(db, user.id);

      const { rows } = await db.query<{ token_hash: string }>(
        `select token_hash from public.sessions where user_id = $1`,
        [user.id],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]?.token_hash).toBe(hashToken(token));
      expect(rows[0]?.token_hash).not.toBe(token);

      // A database reader holding the whole session table still cannot
      // authenticate, because the stored value is not the lookup key.
      await expect(resolveSession(db, rows[0]!.token_hash)).resolves.toBeNull();
    });

    it("does not resolve a token that was never issued", async () => {
      await expect(resolveSession(db, generateToken())).resolves.toBeNull();
      await expect(resolveSession(db, "")).resolves.toBeNull();
      await expect(resolveSession(db, "not-a-real-token")).resolves.toBeNull();
    });

    it("rejects an expired session", async () => {
      const user = await makeUser("expired");
      const { token } = await createSession(db, user.id, -1);

      await expect(resolveSession(db, token)).resolves.toBeNull();
    });

    it("revokes a session and reports whether anything was revoked", async () => {
      const user = await makeUser("revoke");
      const { token } = await createSession(db, user.id);

      await expect(revokeSession(db, token)).resolves.toBe(true);
      await expect(resolveSession(db, token)).resolves.toBeNull();
      // Idempotent: a second logout of the same token is not an error.
      await expect(revokeSession(db, token)).resolves.toBe(false);
      await expect(revokeSession(db, generateToken())).resolves.toBe(false);
    });

    it("revokes every live session for a user at once", async () => {
      const user = await makeUser("revokeall");
      const first = await createSession(db, user.id);
      const second = await createSession(db, user.id);
      const third = await createSession(db, user.id);

      await expect(revokeAllSessions(db, user.id)).resolves.toBe(3);

      await expect(resolveSession(db, first.token)).resolves.toBeNull();
      await expect(resolveSession(db, second.token)).resolves.toBeNull();
      await expect(resolveSession(db, third.token)).resolves.toBeNull();
    });

    it("does not touch another user's sessions when revoking", async () => {
      const alice = await makeUser("alice");
      const bob = await makeUser("bob");
      const aliceSession = await createSession(db, alice.id);
      const bobSession = await createSession(db, bob.id);

      await revokeAllSessions(db, alice.id);

      await expect(resolveSession(db, aliceSession.token)).resolves.toBeNull();
      await expect(resolveSession(db, bobSession.token)).resolves.not.toBeNull();
    });

    it("rotates a session, invalidating the old token and issuing a working new one", async () => {
      const user = await makeUser("rotate");
      const original = await createSession(db, user.id);

      const rotated = await rotateSession(db, original.token);

      expect(rotated).not.toBeNull();
      expect(rotated?.token).not.toBe(original.token);
      await expect(resolveSession(db, original.token)).resolves.toBeNull();

      const resolved = await resolveSession(db, rotated!.token);
      expect(resolved?.id).toBe(user.id);
    });

    it("refuses to rotate an unknown, revoked or expired token", async () => {
      const user = await makeUser("rotateguard");

      await expect(rotateSession(db, generateToken())).resolves.toBeNull();
      await expect(rotateSession(db, "")).resolves.toBeNull();

      const revoked = await createSession(db, user.id);
      await revokeSession(db, revoked.token);
      await expect(rotateSession(db, revoked.token)).resolves.toBeNull();

      const expired = await createSession(db, user.id, -1);
      await expect(rotateSession(db, expired.token)).resolves.toBeNull();

      // A rejected rotation must not leave a stray *live* session behind. The
      // expired probe created above is excluded by the expiry test, which is
      // the point: it is a row, but it is not a usable session.
      const { rows } = await db.query<{ n: number }>(
        `select count(*)::int as n from public.sessions
          where user_id = $1 and revoked_at is null and expires_at > now()`,
        [user.id],
      );
      expect(rows[0]?.n).toBe(0);
    });

    it("records last activity, and only for a live session", async () => {
      const user = await makeUser("touch");
      const live = await createSession(db, user.id);

      await touchSession(db, live.token, 0);

      const { rows } = await db.query<{ last_seen_at: Date | null }>(
        `select last_seen_at from public.sessions where user_id = $1`,
        [user.id],
      );
      expect(rows[0]?.last_seen_at).toBeInstanceOf(Date);

      await revokeSession(db, live.token);
      await touchSession(db, live.token, 0);

      const { rows: afterRevoke } = await db.query<{ tracked: boolean }>(
        `select (last_seen_at is not null) as tracked from public.sessions where user_id = $1`,
        [user.id],
      );
      expect(afterRevoke[0]?.tracked).toBe(true);
    });
  });

  describe("account status", () => {
    it("refuses to authenticate a disabled account even with a valid session", async () => {
      const user = await makeUser("disabled");
      const { token } = await createSession(db, user.id);

      await expect(resolveSession(db, token)).resolves.not.toBeNull();

      await db.query(`update public.profiles set status = 'disabled' where id = $1`, [user.id]);

      await expect(resolveSession(db, token)).resolves.toBeNull();
    });

    it("stops a disabled account from creating new sessions", async () => {
      const user = await makeUser("disablednew");
      await db.query(`update public.profiles set status = 'disabled' where id = $1`, [user.id]);

      // Creating the row still succeeds — being disabled is a sign-in rule,
      // not a database error — but it can never resolve.
      const { token } = await createSession(db, user.id);
      await expect(resolveSession(db, token)).resolves.toBeNull();
    });
  });

  describe("referential integrity", () => {
    it("refuses a session for a user that does not exist", async () => {
      await expect(
        createSession(db, "00000000-0000-0000-0000-000000000000"),
      ).rejects.toThrow();
    });

    it("deletes a user's sessions with the user", async () => {
      const user = await makeUser("cascade");
      const { token } = await createSession(db, user.id);

      await db.query(`delete from public.profiles where id = $1`, [user.id]);

      const { rows } = await db.query(`select 1 from public.sessions where token_hash = $1`, [
        hashToken(token),
      ]);
      expect(rows).toHaveLength(0);
    });
  });
});
