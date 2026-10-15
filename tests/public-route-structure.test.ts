import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = path.join(process.cwd(), "src/app/(site)");

const requiredRoutes = [
  "rental/cars",
  "rental/how-it-works",
  "rental/faq",
  "rental/contact",
  "shop/cars",
  "shop/buying-guide",
  "shop/faq",
  "shop/contact",
  "real-estate/properties",
  "real-estate/services",
  "real-estate/faq",
  "real-estate/contact",
];

describe("division route architecture", () => {
  it("includes the required public customer journey pages for each business division", () => {
    for (const route of requiredRoutes) {
      expect(existsSync(path.join(appRoot, route, "page.tsx"))).toBe(true);
    }
  });
});
