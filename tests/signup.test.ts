import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { signUp } from "@/app/actions/auth";
import { IDLE_RESULT } from "@/lib/action-result";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import { createAuthDb, testAuthDbState, type AuthTestDb } from "./helpers/auth-db";

/**
 * Public registration.
 *
 * This is the only route an anonymous visitor can use to create a user row, so
 * the properties worth pinning down are:
 *
 *   * an administrator cannot be created through it, by any input;
 *   * the password is stored as an Argon2id hash and never as plaintext;
 *   * bad input is rejected before it reaches the database;
 *   * a duplicate email produces a message the customer can act on;
 *   * success signs the new customer in rather than dumping them on a form.
 */

const NEXT_REDIRECT = "NEXT_REDIRECT";

let handle: AuthTestDb;
const cookieSet = vi.fn();

/** Controlled rate limiter so tests are deterministic; the real one is tested elsewhere. */
let limited = false;

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () =>
    limited ? { ok: false, retryAfterSeconds: 600 } : { ok: true, retryAfterSeconds: 0 },
  clientKey: async (scope: string) => `${scope}:test`,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`${NEXT_REDIRECT}:${url}`);
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () =>
      testAuthDbState.sessionToken
        ? { name: SESSION_COOKIE_NAME, value: testAuthDbState.sessionToken }
        : undefined,
    set: cookieSet,
  }),
}));

vi.mock("@/lib/auth/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/db")>();
  return {
    ...actual,
    getPool: (() => handle.db) as unknown as typeof actual.getPool,
  };
});

function submission(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("fullName", "Ada Balogun");
  formData.set("email", `ada-${Math.random().toString(36).slice(2, 10)}@penman.test`);
  formData.set("phone", "+234 800 000 0000");
  formData.set("password", "a-long-enough-password");
  formData.set("confirmPassword", "a-long-enough-password");
  formData.set("acceptTerms", "on");

  for (const [key, value] of Object.entries(overrides)) {
    if (value === "") formData.delete(key);
    else formData.set(key, value);
  }

  return formData;
}

describe("public registration", () => {
  beforeAll(async () => {
    handle = await createAuthDb();
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  });

  afterAll(async () => {
    await handle?.close();
  });

  beforeEach(() => {
    limited = false;
    cookieSet.mockClear();
    testAuthDbState.sessionToken = null;
  });

  afterEach(() => {
    limited = false;
  });

  describe("input validation", () => {
    it("rejects a password that is too short", async () => {
      const result = await signUp(IDLE_RESULT, submission({ password: "short", confirmPassword: "short" }));

      expect(result.ok).toBe(false);
      expect(result.errors?.password?.join(" ")).toMatch(/at least/i);
    });

    it("rejects mismatched passwords", async () => {
      const result = await signUp(IDLE_RESULT, submission({ confirmPassword: "something-else" }));

      expect(result.ok).toBe(false);
      expect(result.errors?.confirmPassword?.join(" ")).toMatch(/do not match/i);
    });

    it("rejects a malformed email", async () => {
      const result = await signUp(IDLE_RESULT, submission({ email: "not-an-email" }));

      expect(result.ok).toBe(false);
      expect(result.errors?.email?.join(" ")).toMatch(/valid email/i);
    });

    it("rejects a one-character name", async () => {
      const result = await signUp(IDLE_RESULT, submission({ fullName: "A" }));

      expect(result.ok).toBe(false);
      expect(result.errors?.fullName).toBeDefined();
    });

    it("requires the terms to be accepted", async () => {
      const result = await signUp(IDLE_RESULT, submission({ acceptTerms: "" }));

      expect(result.ok).toBe(false);
      expect(result.errors?.acceptTerms?.join(" ")).toMatch(/accept the terms/i);
    });

    it("does not write a row when validation fails", async () => {
      const email = "never-written@penman.test";
      await signUp(IDLE_RESULT, submission({ email, password: "short", confirmPassword: "short" }));

      const { rows } = await handle.db.query(`select 1 from public.profiles where email = $1`, [email]);
      expect(rows).toHaveLength(0);
    });
  });

  describe("account creation", () => {
    it("creates an active, non-admin account even if a role is smuggled in", async () => {
      const email = "escalation-attempt@penman.test";
      const formData = submission({ email });
      // A public form cannot be trusted, so prove that adding this changes nothing.
      formData.set("role", "admin");
      formData.set("is_admin", "true");

      await expect(signUp(IDLE_RESULT, formData)).rejects.toThrow(NEXT_REDIRECT);

      const { rows } = await handle.db.query<{ role: string; status: string }>(
        `select role, status from public.profiles where email = $1`,
        [email],
      );
      expect(rows[0]?.role).toBe("viewer");
      expect(rows[0]?.status).toBe("active");
    });

    it("stores the password only as an Argon2id hash", async () => {
      const email = "hash-check@penman.test";
      const password = "a-long-enough-password";

      await expect(signUp(IDLE_RESULT, submission({ email, password, confirmPassword: password })))
        .rejects.toThrow(NEXT_REDIRECT);

      const { rows } = await handle.db.query<{ password_hash: string }>(
        `select password_hash from public.profiles where email = $1`,
        [email],
      );

      const stored = rows[0]?.password_hash ?? "";
      expect(stored.startsWith("$argon2id$")).toBe(true);
      expect(stored).not.toContain(password);
      expect(stored).not.toBe(password);
    });

    it("normalizes an upper-case email address", async () => {
      const email = "Mixed-Case@Penman.Test";

      await expect(signUp(IDLE_RESULT, submission({ email }))).rejects.toThrow(NEXT_REDIRECT);

      const { rows } = await handle.db.query<{ email: string }>(
        `select email from public.profiles where email = $1`,
        [email.toLowerCase()],
      );
      expect(rows).toHaveLength(1);
    });

    it("stores an omitted optional phone as null", async () => {
      const email = "no-phone@penman.test";
      await expect(signUp(IDLE_RESULT, submission({ email, phone: "" }))).rejects.toThrow(
        NEXT_REDIRECT,
      );

      const { rows } = await handle.db.query<{ phone: string | null }>(
        `select phone from public.profiles where email = $1`,
        [email],
      );
      expect(rows[0]?.phone).toBeNull();
    });

    it("signs the new customer in with a session cookie", async () => {
      const email = "session-started@penman.test";
      await expect(signUp(IDLE_RESULT, submission({ email }))).rejects.toThrow(NEXT_REDIRECT);

      // A session row must exist for this new user...
      const { rows } = await handle.db.query<{ n: number }>(
        `select count(*)::int as n from public.sessions s
           join public.profiles p on p.id = s.user_id
          where p.email = $1 and s.revoked_at is null`,
        [email],
      );
      expect(rows[0]?.n).toBe(1);

      // ...and the browser must have been handed exactly one cookie.
      expect(cookieSet).toHaveBeenCalledTimes(1);
      const cookie = cookieSet.mock.calls[0]?.[0] as { name: string; httpOnly: boolean; value: string };
      expect(cookie.name).toBe(SESSION_COOKIE_NAME);
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.value.length).toBeGreaterThan(20);
    });

    it("redirects to the account page on success", async () => {
      await expect(signUp(IDLE_RESULT, submission({}))).rejects.toThrow(`${NEXT_REDIRECT}:/account`);
    });
  });

  describe("duplicate accounts", () => {
    it("explains that the email is already registered, without leaking anything else", async () => {
      const email = "duplicate@penman.test";

      await expect(signUp(IDLE_RESULT, submission({ email }))).rejects.toThrow(NEXT_REDIRECT);

      const result = await signUp(IDLE_RESULT, submission({ email }));

      expect(result.ok).toBe(false);
      expect(result.errors?.email?.join(" ")).toMatch(/already registered/i);
      expect(result.message).toMatch(/signing in/i);
      // The second attempt must not have created or overwritten anything.
      const { rows } = await handle.db.query(`select 1 from public.profiles where email = $1`, [email]);
      expect(rows).toHaveLength(1);
      expect(cookieSet).not.toHaveBeenCalledTimes(2);
    });

    it("treats a differently-cased duplicate as the same account", async () => {
      const email = "case-dupe@penman.test";
      await expect(signUp(IDLE_RESULT, submission({ email }))).rejects.toThrow(NEXT_REDIRECT);

      const result = await signUp(IDLE_RESULT, submission({ email: email.toUpperCase() }));
      expect(result.errors?.email?.join(" ")).toMatch(/already registered/i);
    });
  });

  describe("operational guards", () => {
    it("reports rate limiting plainly", async () => {
      limited = true;
      const result = await signUp(IDLE_RESULT, submission({}));

      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/try again later/i);
      // Nothing may be written when the limit is hit.
      const { rows } = await handle.db.query(
        `select 1 from public.profiles where email = 'ada@penman.test'`,
      );
      expect(rows).toHaveLength(0);
    });

    it("says so honestly when no database is configured", async () => {
      const previous = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const result = await signUp(IDLE_RESULT, submission({}));

      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/no database configured/i);

      process.env.DATABASE_URL = previous;
    });
  });
});
