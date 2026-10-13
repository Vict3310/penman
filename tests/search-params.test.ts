import { describe, expect, it } from "vitest";
import { buildQuery, readNumber, readPage, readSort, readString } from "@/lib/search-params";

describe("readString", () => {
  it("returns undefined for blank, missing and array-with-blank values", () => {
    expect(readString({}, "q")).toBeUndefined();
    expect(readString({ q: "" }, "q")).toBeUndefined();
    expect(readString({ q: "   " }, "q")).toBeUndefined();
    expect(readString({ q: undefined }, "q")).toBeUndefined();
  });

  it("trims and unwraps repeated parameters", () => {
    expect(readString({ q: "  bus  " }, "q")).toBe("bus");
    expect(readString({ q: ["first", "second"] }, "q")).toBe("first");
  });
});

describe("readNumber", () => {
  it("parses numbers and rejects junk", () => {
    expect(readNumber({ minPrice: "500" }, "minPrice")).toBe(500);
    expect(readNumber({ minPrice: "abc" }, "minPrice")).toBeUndefined();
    expect(readNumber({}, "minPrice")).toBeUndefined();
    expect(readNumber({ minPrice: "0" }, "minPrice")).toBe(0);
  });
});

describe("readPage", () => {
  it("defaults to page 1 for missing, zero and negative values", () => {
    expect(readPage({})).toBe(1);
    expect(readPage({ page: "0" })).toBe(1);
    expect(readPage({ page: "-4" })).toBe(1);
    expect(readPage({ page: "junk" })).toBe(1);
  });

  it("floors fractional pages", () => {
    expect(readPage({ page: "3" })).toBe(3);
    expect(readPage({ page: "2.9" })).toBe(2);
  });
});

describe("readSort", () => {
  const allowed = ["newest", "price_asc"] as const;

  it("returns the fallback for unknown values", () => {
    expect(readSort({ sort: "price_asc" }, "sort", allowed, "newest")).toBe("price_asc");
    expect(readSort({ sort: "DROP TABLE" }, "sort", allowed, "newest")).toBe("newest");
    expect(readSort({}, "sort", allowed, "newest")).toBe("newest");
  });
});

describe("buildQuery", () => {
  it("drops empty values and merges overrides", () => {
    expect(buildQuery({ q: "bus", category: "" })).toBe("?q=bus");
    expect(buildQuery({ q: "bus" }, { page: "2" })).toBe("?q=bus&page=2");
    expect(buildQuery({ q: "bus", page: "2" }, { page: "3" })).toBe("?q=bus&page=3");
  });

  it("removes a value when the override is empty", () => {
    expect(buildQuery({ category: "car-care" }, { category: undefined })).toBe("");
  });

  it("returns an empty string when there is nothing to encode", () => {
    expect(buildQuery({})).toBe("");
  });

  it("URL-encodes unsafe values", () => {
    expect(buildQuery({ q: "two bedroom" })).toBe("?q=two+bedroom");
  });
});
