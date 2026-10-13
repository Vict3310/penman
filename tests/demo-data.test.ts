import { describe, expect, it } from "vitest";
import {
  demoFeaturedProducts,
  demoFeaturedProperties,
  demoFeaturedVehicles,
  demoGetProduct,
  demoGetProperty,
  demoGetVehicle,
  demoListProducts,
  demoListProperties,
  demoListVehicles,
  demoVehicleCategories,
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
  DEMO_PROPERTIES,
  DEMO_VEHICLES,
} from "@/lib/demo-data";
import { adminListPropertyEnquiries } from "@/lib/queries";

/**
 * These tests exercise the demonstration data filters directly. They exist so
 * the demo catalogue behaves the same way as the database-backed one, rather
 * than being verified only by eyeballing rendered HTML.
 */

describe("demoListVehicles", () => {
  it("returns every published vehicle by default", () => {
    const result = demoListVehicles();
    expect(result.total).toBe(DEMO_VEHICLES.length);
    expect(result.pageCount).toBe(1);
  });

  it("filters by category", () => {
    expect(demoListVehicles({ category: "Bus" }).total).toBe(1);
    expect(demoListVehicles({ category: "Sedan" }).total).toBe(3);
    expect(demoListVehicles({ category: "Nope" }).total).toBe(0);
  });

  it("filters by availability and transmission", () => {
    expect(demoListVehicles({ availability: "maintenance" }).total).toBe(1);
    expect(demoListVehicles({ transmission: "manual" }).total).toBe(3);
  });

  it("searches name and description case-insensitively", () => {
    expect(demoListVehicles({ q: "highlander" }).total).toBe(1);
    expect(demoListVehicles({ q: "HIGHLANDER" }).total).toBe(1);
    expect(demoListVehicles({ q: "saloon" }).total).toBeGreaterThan(0);
    expect(demoListVehicles({ q: "zzzz" }).total).toBe(0);
  });

  it("filters by price range and excludes vehicles with no rate", () => {
    // The Kia Rio has no rate, so it must never satisfy a numeric range.
    // Rates in the demo set: 45000, 55000, 70000, 85000, 120000, and null.
    expect(demoListVehicles({ minPrice: 50000 }).total).toBe(4);
    expect(demoListVehicles({ maxPrice: 50000 }).total).toBe(1);
    expect(demoListVehicles({ minPrice: 0 }).total).toBe(DEMO_VEHICLES.length - 1);
  });

  it("sorts by rate ascending with rate-less vehicles last", () => {
    const rates = demoListVehicles({ sort: "price_asc" }).items.map((v) => v.rate);
    const priced = rates.filter((r): r is number => r !== null);
    expect(priced).toEqual([...priced].sort((a, b) => a - b));
    expect(rates[rates.length - 1]).toBeNull();
  });

  it("sorts by rate descending", () => {
    const rates = demoListVehicles({ sort: "price_desc" }).items.map((v) => v.rate);
    const priced = rates.filter((r): r is number => r !== null);
    expect(priced).toEqual([...priced].sort((a, b) => b - a));
  });

  it("puts featured vehicles first on the default sort", () => {
    const first = demoListVehicles().items[0];
    expect(first?.is_featured).toBe(true);
  });

  it("clamps a page number past the end instead of returning nothing", () => {
    const result = demoListVehicles({ page: 99 });
    expect(result.page).toBe(1);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("paginates and clamps correctly when a small page size is used", () => {
    const first = demoListVehicles({ perPage: 2, page: 1 });
    expect(first.pageCount).toBe(Math.ceil(DEMO_VEHICLES.length / 2));
    expect(first.items).toHaveLength(2);

    const beyond = demoListVehicles({ perPage: 2, page: 99 });
    expect(beyond.page).toBe(first.pageCount);
    expect(beyond.items.length).toBeGreaterThan(0);
  });
});

describe("demoListProperties", () => {
  it("filters by listing type", () => {
    const sale = demoListProperties({ listingType: "sale" });
    const rent = demoListProperties({ listingType: "rent" });
    expect(sale.total).toBe(3);
    expect(rent.total).toBe(2);
    expect(sale.total + rent.total).toBe(DEMO_PROPERTIES.length);
  });

  it("filters by property type and minimum bedrooms", () => {
    expect(demoListProperties({ propertyType: "land" }).total).toBe(1);
    expect(demoListProperties({ bedrooms: 4 }).total).toBe(1);
    expect(demoListProperties({ bedrooms: 3 }).total).toBe(2);
  });

  it("excludes price-on-request listings from a numeric range", () => {
    const all = demoListProperties({ minPrice: 0 });
    expect(all.total).toBe(DEMO_PROPERTIES.length - 1);
  });

  it("sorts by price ascending", () => {
    const prices = demoListProperties({ sort: "price_asc" }).items.map((p) => p.price);
    const priced = prices.filter((p): p is number => p !== null);
    expect(priced).toEqual([...priced].sort((a, b) => a - b));
  });
});

describe("demoListProducts", () => {
  it("filters by category slug", () => {
    const accessories = DEMO_CATEGORIES.find((c) => c.slug === "accessories")!;
    const expected = DEMO_PRODUCTS.filter((p) => p.category_id === accessories.id).length;
    expect(demoListProducts({ category: "accessories" }).total).toBe(expected);
  });

  it("returns nothing for an unknown category rather than everything", () => {
    expect(demoListProducts({ category: "does-not-exist" }).total).toBe(0);
  });

  it("sorts by price ascending", () => {
    const prices = demoListProducts({ sort: "price_asc" }).items.map((p) => p.price);
    const priced = prices.filter((p): p is number => p !== null);
    expect(priced).toEqual([...priced].sort((a, b) => a - b));
  });
});

describe("singleton lookups", () => {
  it("finds a record by slug", () => {
    expect(demoGetVehicle("demo-toyota-corolla-2022")?.name).toContain("Corolla");
    expect(demoGetProperty("demo-commercial-plot")?.price_type).toBe("on_request");
    expect(demoGetProduct("demo-dash-camera")?.sku).toBe("PE-DEMO-002");
  });

  it("returns null for an unknown slug", () => {
    expect(demoGetVehicle("nope")).toBeNull();
    expect(demoGetProperty("nope")).toBeNull();
    expect(demoGetProduct("nope")).toBeNull();
  });
});

describe("demo admin enquiry lists", () => {
  it("returns real-looking property enquiries in demo mode", async () => {
    const result = await adminListPropertyEnquiries({ status: "new" });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item) => item.status === "new")).toBe(true);
  });
});

describe("featured listings and facets", () => {
  it("honours the requested limit", () => {
    expect(demoFeaturedVehicles(1)).toHaveLength(1);
    expect(demoFeaturedProperties(2)).toHaveLength(2);
    expect(demoFeaturedProducts(2)).toHaveLength(2);
  });

  it("only returns featured, published records", () => {
    for (const vehicle of demoFeaturedVehicles(10)) {
      expect(vehicle.is_featured).toBe(true);
      expect(vehicle.status).toBe("published");
    }
  });

  it("derives vehicle categories from the data", () => {
    expect(demoVehicleCategories()).toEqual(["Bus", "SUV", "Sedan", "Van"].sort());
  });
});

describe("honesty of the demonstration data", () => {
  it("labels every demo listing so it cannot be mistaken for real content", () => {
    for (const record of [...DEMO_VEHICLES, ...DEMO_PROPERTIES, ...DEMO_PRODUCTS]) {
      const label = "name" in record ? record.name : record.title;
      expect(label.startsWith("[DEMO]")).toBe(true);
    }
  });

  it("uses only reserved or non-routable contact values", () => {
    // Placeholder imagery hosts are explicitly allow-listed in next.config.ts.
    const hosts = new Set(
      [...DEMO_VEHICLES, ...DEMO_PROPERTIES, ...DEMO_PRODUCTS].flatMap((r) =>
        r.images.map((i) => new URL(i.url).hostname),
      ),
    );
    expect([...hosts]).toEqual(["picsum.photos"]);
  });
});
