import { describe, expect, it, vi } from "vitest";

/**
 * The most important safety property of the demo data layer:
 * when the gate is closed, queries must return *nothing* — never the
 * demonstration catalogue.
 *
 * Both the gate and the Supabase client are mocked here so the assertion is
 * deterministic and performs no network I/O. The real gate behaviour (that it
 * closes whenever Supabase is configured, and in production without an
 * explicit opt-in) is covered in tests/demo-mode.test.ts.
 */

vi.mock("@/lib/demo", () => ({
  isDemoMode: () => false,
}));

vi.mock("@/lib/supabase/public", () => ({
  // The deployment has no reachable database.
  getPublicClient: () => {
    throw new Error("Supabase is not configured.");
  },
  maybePublicClient: () => null,
}));

const DEMO_SLUG = "demo-toyota-corolla-2022";

describe("with the demo gate closed and no database", () => {
  it("returns empty results rather than demonstration records", async () => {
    const { listVehicles, listProperties, listProducts, listCategories } = await import("@/lib/queries");

    for (const [label, result] of [
      ["vehicles", await listVehicles()],
      ["properties", await listProperties()],
      ["products", await listProducts()],
    ] as const) {
      expect(result.total, label).toBe(0);
      expect(result.items, label).toHaveLength(0);
      expect(result.pageCount, label).toBe(1);
    }

    expect(await listCategories()).toHaveLength(0);
  });

  it("does not resolve a demonstration slug", async () => {
    const { getVehicleBySlug, getPropertyBySlug, getProductBySlug } = await import("@/lib/queries");

    expect(await getVehicleBySlug(DEMO_SLUG)).toBeNull();
    expect(await getPropertyBySlug("demo-3-bedroom-terrace-duplex")).toBeNull();
    expect(await getProductBySlug("demo-dash-camera")).toBeNull();
  });

  it("returns no featured records", async () => {
    const { getFeaturedVehicles, getFeaturedProperties, getFeaturedProducts } = await import(
      "@/lib/queries"
    );

    expect(await getFeaturedVehicles(3)).toHaveLength(0);
    expect(await getFeaturedProperties(3)).toHaveLength(0);
    expect(await getFeaturedProducts(3)).toHaveLength(0);
  });

  it("reports no vehicle categories", async () => {
    const { getVehicleCategories } = await import("@/lib/queries");
    expect(await getVehicleCategories()).toEqual([]);
  });
});

describe("with the demo gate open", () => {
  it("returns the demonstration catalogue", async () => {
    vi.resetModules();
    vi.doMock("@/lib/demo", () => ({ isDemoMode: () => true }));

    const { listVehicles, getVehicleBySlug } = await import("@/lib/queries");

    expect((await listVehicles()).total).toBeGreaterThan(0);
    expect(await getVehicleBySlug(DEMO_SLUG)).not.toBeNull();

    vi.doUnmock("@/lib/demo");
    vi.resetModules();
  });
});
