import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  findPasswordResetToken,
} from "@/lib/auth/reset";
import { createSession, resolveSession } from "@/lib/auth/session";
import { createUser, findUserByEmail, type UserRecord } from "@/lib/auth/users";
import { passwordResetSchema } from "@/lib/validation";

import { createAuthDb, testEmail, type AuthTestDb } from "./helpers/auth-db";

describe("password reset tokens", () => {
  let handle: AuthTestDb;
  let db: AuthTestDb["db"];

  beforeAll(async () => {
    handle = await createAuthDb();
    db = handle.db;
  });

  afterAll(async () => {
    await handle?.close();
  });

  async function makeUser(label = "reset"): Promise<UserRecord> {
    return createUser(db, {
      email: testEmail(label),
      passwordHash: "old-stored-hash",
      fullName: "Reset Tester",
    });
  }

  it("stores only the hash and can find a live token", async () => {
    const user = await makeUser("hash");
    const { token, expiresAt } = await createPasswordResetToken(db, user.id);

    expect(token).toHaveLength(43);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const { rows } = await db.query<{ token_hash: string; expires_at: Date }>(
      `select token_hash, expires_at from public.password_reset_tokens where user_id = $1`,
      [user.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.token_hash).not.toBe(token);

    const found = await findPasswordResetToken(db, token);
    expect(found?.userId).toBe(user.id);
    expect(found?.email).toBe(user.email);
  });

  /**
   * The three properties that make a reset link safe: it changes the password,
   * it ends every existing session, and it cannot be used twice.
   */
  it("consumes once, replaces the password and revokes every session", async () => {
    const user = await makeUser("consume");
    const firstSession = await createSession(db, user.id);
    const secondSession = await createSession(db, user.id);
    const { token } = await createPasswordResetToken(db, user.id);
    const newHash = await hashPassword("brand-new-password-1");

    const result = await handle.transaction((tx) =>
      consumePasswordResetToken(tx, token, newHash),
    );

    expect(result?.userId).toBe(user.id);
    await expect(resolveSession(db, firstSession.token)).resolves.toBeNull();
    await expect(resolveSession(db, secondSession.token)).resolves.toBeNull();

    const updated = await findUserByEmail(db, user.email);
    expect(updated?.password_hash).toBe(newHash);
    await expect(verifyPassword(updated?.password_hash, "brand-new-password-1")).resolves.toBe(
      true,
    );

    await expect(
      handle.transaction((tx) => consumePasswordResetToken(tx, token, newHash)),
    ).resolves.toBeNull();
  });

  it("rejects an expired token", async () => {
    const user = await makeUser("expired");
    const { token } = await createPasswordResetToken(db, user.id, -1);

    await expect(findPasswordResetToken(db, token)).resolves.toBeNull();
    await expect(
      handle.transaction((tx) => consumePasswordResetToken(tx, token, "new-hash")),
    ).resolves.toBeNull();
  });

  it("invalidates an earlier link when a new one is issued", async () => {
    const user = await makeUser("reissue");
    const first = await createPasswordResetToken(db, user.id);
    const second = await createPasswordResetToken(db, user.id);

    await expect(findPasswordResetToken(db, first.token)).resolves.toBeNull();
    await expect(
      handle.transaction((tx) => consumePasswordResetToken(tx, first.token, "h")),
    ).resolves.toBeNull();

    const found = await findPasswordResetToken(db, second.token);
    expect(found?.userId).toBe(user.id);
  });

  it("rejects unknown tokens and disabled accounts", async () => {
    await expect(findPasswordResetToken(db, "not-a-real-token")).resolves.toBeNull();
    await expect(findPasswordResetToken(db, "")).resolves.toBeNull();

    const user = await makeUser("disabled");
    const { token } = await createPasswordResetToken(db, user.id);
    await db.query(`update public.profiles set status = 'disabled' where id = $1`, [user.id]);

    await expect(findPasswordResetToken(db, token)).resolves.toBeNull();
    await expect(
      handle.transaction((tx) => consumePasswordResetToken(tx, token, "h")),
    ).resolves.toBeNull();
  });

  it("does not leave a live token behind after a consumed reset", async () => {
    const user = await makeUser("spent");
    const { token } = await createPasswordResetToken(db, user.id);
    await handle.transaction((tx) => consumePasswordResetToken(tx, token, "h"));

    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from public.password_reset_tokens
        where user_id = $1 and used_at is null and expires_at > now()`,
      [user.id],
    );
    expect(rows[0]?.n).toBe(0);
  });
});

describe("reset password validation", () => {
  const token = "a".repeat(43);

  it("accepts a matching pair at the minimum length", () => {
    const result = passwordResetSchema.safeParse({
      token,
      password: "12345678",
      confirmPassword: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a short password, a mismatch and a missing token", () => {
    expect(
      passwordResetSchema.safeParse({ token, password: "short", confirmPassword: "short" })
        .success,
    ).toBe(false);

    expect(
      passwordResetSchema.safeParse({
        token,
        password: "12345678",
        confirmPassword: "12345679",
      }).success,
    ).toBe(false);

    expect(
      passwordResetSchema.safeParse({ token: "", password: "12345678", confirmPassword: "12345678" })
        .success,
    ).toBe(false);
  });
});
