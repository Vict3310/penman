import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { createAdministrator, createUser, type UserRecord } from "@/lib/auth/users";

import { createAuthDb, testAuthDbState, testEmail, type AuthTestDb } from "./helpers/auth-db";

/**
 * The admin guard is the single decision point for "may this request see
 * /admin?". It resolves a cookie to a user row and then reads that row's role,
 * so the properties worth proving are:
 *
 *   * an administrator is admitted;
 *   * everyone else — no cookie, a viewer, a revoked session, a disabled or
 *     expired session — is refused;
 *   * refusal renders the 404, it does not redirect to a sign-in page.
 *
 * Those are properties of the interaction between the cookie, the session
 * table and the profiles row, so this test drives the real modules against
 * real SQL with the HTTP layer stubbed.
 */

/** Sentinel thrown by the stubbed notFound(), matching Next's own behaviour. */
const NOT_FOUND = "NEXT_NOT_FOUND";

let handle: AuthTestDb;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () =>
      testAuthDbState.sessionToken
        ? { name: "penman_session", value: testAuthDbState.sessionToken }
        : undefined,
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/lib/auth/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/db")>();
  return {
    ...actual,
    // Redirect every pool access at the in-memory engine. The cast is needed
    // because the real getPool() is typed for a pg.Pool, which this engine
    // deliberately is not.
    getPool: (() => handle.db) as unknown as typeof actual.getPool,
  };
});

async function loadGuard() {
  return import("@/lib/auth/admin");
}

describe("administrator guard", () => {
  beforeAll(async () => {
    handle = await createAuthDb();
    // The guard only runs when the deployment is configured, so assert that
    // path rather than the unconfigured one.
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  });

  afterAll(async () => {
    testAuthDbState.sessionToken = null;
    await handle?.close();
  });

  async function makeAdmin(): Promise<UserRecord> {
    return createAdministrator(handle.db, {
      email: testEmail("admin"),
      passwordHash: "stored-hash",
      fullName: "Real Administrator",
    });
  }

  async function signInAs(user: UserRecord): Promise<string> {
    const { token } = await createSession(handle.db, user.id);
    testAuthDbState.sessionToken = token;
    return token;
  }

  describe("with no session", () => {
    it("resolves no administrator", async () => {
      testAuthDbState.sessionToken = null;
      const { getAdminSession } = await loadGuard();

      await expect(getAdminSession()).resolves.toBeNull();
    });

    it("renders the custom 404 rather than redirecting", async () => {
      testAuthDbState.sessionToken = null;
      const { requireAdminPage } = await loadGuard();

      await expect(requireAdminPage()).rejects.toThrow(NOT_FOUND);
    });
  });

  describe("as a signed-in non-administrator", () => {
    it("still renders the custom 404", async () => {
      const viewer = await createUser(handle.db, {
        email: testEmail("viewer"),
        passwordHash: "stored-hash",
      });
      expect(viewer.role).toBe("viewer");

      await signInAs(viewer);
      const { getAdminSession, requireAdminPage } = await loadGuard();

      await expect(getAdminSession()).resolves.toBeNull();
      await expect(requireAdminPage()).rejects.toThrow(NOT_FOUND);
    });

    it("only counts the exact 'admin' role, not 'editor'", async () => {
      const editor = await createUser(handle.db, {
        email: testEmail("editor"),
        passwordHash: "stored-hash",
      });
      await handle.db.query(`update public.profiles set role = 'editor' where id = $1`, [editor.id]);

      await signInAs(editor);
      const { getAdminSession } = await loadGuard();

      await expect(getAdminSession()).resolves.toBeNull();
    });
  });

  describe("as an administrator", () => {
    it("resolves the administrator from the database and is admitted", async () => {
      const admin = await makeAdmin();
      await signInAs(admin);

      const { getAdminSession, requireAdminPage } = await loadGuard();

      const resolved = await getAdminSession();
      expect(resolved?.id).toBe(admin.id);
      expect(resolved?.email).toBe(admin.email);
      expect(resolved?.role).toBe("admin");

      // The whole point: an administrator is NOT sent to a 404.
      await expect(requireAdminPage()).resolves.toMatchObject({ id: admin.id });
    });

    it("does not trust the role recorded at sign-in time", async () => {
      // Start as an ordinary user, then promote in the database. Access must
      // follow the database, because that is where the guarantee lives.
      const user = await createUser(handle.db, {
        email: testEmail("promoted"),
        passwordHash: "stored-hash",
      });
      await signInAs(user);

      const { getAdminSession } = await loadGuard();
      await expect(getAdminSession()).resolves.toBeNull();

      await handle.db.query(`update public.profiles set role = 'admin' where id = $1`, [user.id]);

      const resolved = await getAdminSession();
      expect(resolved?.id).toBe(user.id);
      expect(resolved?.role).toBe("admin");
    });

    it("loses access the moment the database role is demoted", async () => {
      const admin = await makeAdmin();
      await signInAs(admin);

      const { requireAdminPage } = await loadGuard();
      await expect(requireAdminPage()).resolves.toBeTruthy();

      await handle.db.query(`update public.profiles set role = 'viewer' where id = $1`, [admin.id]);

      await expect(requireAdminPage()).rejects.toThrow(NOT_FOUND);
    });
  });

  /**
   * Every administrative server action calls requireAdminForAction(). Proving
   * it directly is what backs the claim that deleting a listing, publishing a
   * vehicle or changing site settings is refused for anyone who is not an
   * administrator — the page guard has nothing to do with those.
   */
  describe("server action guard", () => {
    it("denies an anonymous caller", async () => {
      testAuthDbState.sessionToken = null;
      const { requireAdminForAction } = await loadGuard();

      await expect(requireAdminForAction()).resolves.toBeNull();
    });

    it("denies a signed-in non-administrator", async () => {
      const viewer = await createUser(handle.db, {
        email: testEmail("action-viewer"),
        passwordHash: "stored-hash",
      });
      await signInAs(viewer);

      const { requireAdminForAction } = await loadGuard();
      await expect(requireAdminForAction()).resolves.toBeNull();
    });

    it("denies a forged cookie", async () => {
      testAuthDbState.sessionToken = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
      const { requireAdminForAction } = await loadGuard();

      await expect(requireAdminForAction()).resolves.toBeNull();
    });

    it("permits an administrator", async () => {
      const admin = await makeAdmin();
      await signInAs(admin);

      const { requireAdminForAction } = await loadGuard();
      const resolved = await requireAdminForAction();

      expect(resolved?.id).toBe(admin.id);
      expect(resolved?.role).toBe("admin");
    });
  });

  describe("when the session stops being valid", () => {
    it("refuses a revoked session", async () => {
      const admin = await makeAdmin();
      await signInAs(admin);

      const { requireAdminPage } = await loadGuard();
      await expect(requireAdminPage()).resolves.toBeTruthy();

      await handle.db.query(
        `update public.sessions set revoked_at = now() where user_id = $1`,
        [admin.id],
      );

      await expect(requireAdminPage()).rejects.toThrow(NOT_FOUND);
    });

    it("refuses an expired session", async () => {
      const admin = await makeAdmin();
      const { token } = await createSession(handle.db, admin.id, -1);
      testAuthDbState.sessionToken = token;

      const { getAdminSession } = await loadGuard();
      await expect(getAdminSession()).resolves.toBeNull();
    });

    it("refuses a disabled administrator holding a still-valid session", async () => {
      const admin = await makeAdmin();
      await signInAs(admin);

      const { getAdminSession } = await loadGuard();
      await expect(getAdminSession()).resolves.not.toBeNull();

      await handle.db.query(`update public.profiles set status = 'disabled' where id = $1`, [
        admin.id,
      ]);

      await expect(getAdminSession()).resolves.toBeNull();
    });

    it("refuses a forged cookie value that was never issued", async () => {
      await makeAdmin();
      // A token of the right shape that no row hashes to.
      testAuthDbState.sessionToken = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

      const { requireAdminPage } = await loadGuard();
      await expect(requireAdminPage()).rejects.toThrow(NOT_FOUND);
    });
  });
});
