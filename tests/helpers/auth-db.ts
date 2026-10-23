import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

import type { Queryable } from "@/lib/auth/db";

/**
 * A real PostgreSQL engine for the authentication tests.
 *
 * The auth modules take an explicit `Queryable` handle rather than reaching for
 * a global pool, so these tests run the actual SQL from src/lib/auth against
 * PGlite — real transactions, real constraints, real `now()`. Mocking the
 * database here would test nothing worth testing: the interesting properties
 * (a revoked session is not a session, a disabled account is rejected) are
 * properties of the SQL.
 *
 * The Supabase-managed schemas are stubbed exactly as scripts/verify-database.mjs
 * stubs them, because migration 0001 references auth.users and storage.*.
 * Migration 0003 then severs the auth.users dependency, which is itself
 * asserted in the tests.
 */

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const SUPABASE_STUBS = `
create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

create or replace function auth.uid() returns uuid
language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null
);

alter table storage.objects enable row level security;
`;

/**
 * Mutable state shared with module mocks.
 *
 * tests/admin-guard.test.ts replaces next/headers so it can drive the guard
 * through a request-shaped interface without an HTTP server; it reads
 * `sessionToken` to decide what the incoming request appears to carry.
 */
export const testAuthDbState: { sessionToken: string | null } = { sessionToken: null };

export interface AuthTestDb {
  db: Queryable;
  /**
   * Run `fn` in a real transaction. Used to prove that account creation is
   * genuinely atomic — that a failure after the INSERT discards the row rather
   * than leaving a half-created account behind.
   */
  transaction: <T>(fn: (tx: Queryable) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
}

export async function createAuthDb(): Promise<AuthTestDb> {
  const pglite = new PGlite();

  await pglite.exec(SUPABASE_STUBS);

  const migrationsDir = join(projectRoot, "supabase", "migrations");
  const migrations = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrations) {
    await pglite.exec(readFileSync(join(migrationsDir, file), "utf8"));
  }

  const asQueryable = (client: {
    query<R>(sql: string, params?: unknown[]): Promise<{ rows: R[] }>;
  }): Queryable => ({
    async query<R = Record<string, unknown>>(sql: string, params?: readonly unknown[]) {
      const result = await client.query<R>(sql, params as unknown[]);
      return { rows: result.rows };
    },
  });

  const db = asQueryable(pglite);

  const transaction = <T>(fn: (tx: Queryable) => Promise<T>): Promise<T> =>
    pglite.transaction((tx) => fn(asQueryable(tx)));

  return { db, transaction, close: () => pglite.close() };
}

/** Build a unique email so tests never collide on the unique index. */
export function testEmail(label: string): string {
  return `${label}-${Math.random().toString(36).slice(2, 10)}@penman.test`;
}
