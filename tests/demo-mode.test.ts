import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The demo data gate is a safety mechanism, so it is tested directly rather
 * than assumed.
 *
 * `@/lib/env` reads process.env at module load time, so each case resets the
 * module registry and imports fresh with the environment already in place.
 *
 * `vi.stubEnv` is used for `NODE_ENV` because `@types/node` declares it
 * read-only, even though it is writable at runtime.
 */

const ORIGINAL = { ...process.env };

const CONFIGURED = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

function clearSupabase() {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  process.env = { ...ORIGINAL };
});

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  process.env = { ...ORIGINAL };
});

async function loadIsDemoMode() {
  const mod = await import("@/lib/demo");
  return mod.isDemoMode;
}

describe("isDemoMode", () => {
  it("is off whenever Supabase is configured, even with DEMO_DATA=true", async () => {
    Object.assign(process.env, CONFIGURED);
    process.env.DEMO_DATA = "true";

    const isDemoMode = await loadIsDemoMode();
    expect(isDemoMode()).toBe(false);
  });

  it("is off in a production build without an explicit opt-in", async () => {
    clearSupabase();
    delete process.env.DEMO_DATA;
    vi.stubEnv("NODE_ENV", "production");

    const isDemoMode = await loadIsDemoMode();
    expect(isDemoMode()).toBe(false);
  });

  it("is off in production when DEMO_DATA is any value other than the exact string 'true'", async () => {
    clearSupabase();
    vi.stubEnv("NODE_ENV", "production");

    for (const value of ["false", "1", "yes", "TRUE", ""]) {
      process.env.DEMO_DATA = value;
      vi.resetModules();
      const isDemoMode = await loadIsDemoMode();
      expect(isDemoMode(), `DEMO_DATA=${JSON.stringify(value)}`).toBe(false);
    }
  });

  it("is on in a production build only with DEMO_DATA exactly 'true'", async () => {
    clearSupabase();
    vi.stubEnv("NODE_ENV", "production");
    process.env.DEMO_DATA = "true";

    const isDemoMode = await loadIsDemoMode();
    expect(isDemoMode()).toBe(true);
  });

  it("is on during development when no database is connected", async () => {
    clearSupabase();
    delete process.env.DEMO_DATA;
    vi.stubEnv("NODE_ENV", "development");

    const isDemoMode = await loadIsDemoMode();
    expect(isDemoMode()).toBe(true);
  });

  it("is off in development once Supabase is configured", async () => {
    Object.assign(process.env, CONFIGURED);
    vi.stubEnv("NODE_ENV", "development");

    const isDemoMode = await loadIsDemoMode();
    expect(isDemoMode()).toBe(false);
  });

  it("treats a blank Supabase URL as not configured", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.DEMO_DATA;

    const isDemoMode = await loadIsDemoMode();
    expect(isDemoMode()).toBe(false);
  });
});

describe("demo data reachability", () => {
  // The mirror-image case — that a *closed* gate never yields demo records —
  // is covered in tests/demo-isolation.test.ts, where the Supabase client is
  // mocked out so the assertion needs no network access.

  it("reaches demo records when the gate is open", async () => {
    clearSupabase();
    delete process.env.DEMO_DATA;
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();

    const { listVehicles, getVehicleBySlug } = await import("@/lib/queries");

    expect((await listVehicles()).total).toBeGreaterThan(0);
    expect(await getVehicleBySlug("demo-toyota-corolla-2022")).not.toBeNull();
  });
});
