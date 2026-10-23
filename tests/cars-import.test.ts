import { describe, expect, it } from "vitest";

import {
  DATASET_SOURCE,
  asInteger,
  asText,
  currentRowHash,
  describe as describeRecord,
  importHashOf,
  mapRow,
  normaliseCondition,
  parseMileage,
  parsePrice,
  parseTitle,
  slugFor,
  sourceIdFrom,
} from "../scripts/lib/cars-import.mjs";

/** A row shaped like the parquet rows, including the parts that trip readers up. */
function parquetRow(overrides: Record<string, unknown> = {}) {
  return {
    // INT64 arrives as BigInt, and every BYTE_ARRAY arrives as raw bytes.
    "Unnamed: 0": 214n,
    // The mis-merged column: this is NOT the name of the row below.
    "Car Name": "Toyota Sequoia 2005 Gray",
    "Car Name.1": "Acura ILX 2018 Black",
    Region: "Ondo State, Akure",
    Price: "₦ 1,687,500",
    Status: "Nigerian Used",
    Mileage: "322770 km",
    "Image URL": "https://www.cars45.com/r/abc/131812140_MTgwLTEzNS1h.jpg",
    image: {
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xdb]),
      path: new TextEncoder().encode("Acura_ILX_2018_Black_20230916124427.jpg"),
    },
    ...overrides,
  };
}

/**
 * The mapped record, or a failure loud enough to find.
 *
 * `mapRow` returns a discriminated result, so every test that expects a record
 * has to prove it got one first; this keeps that assertion in one place instead
 * of a cast at each call site.
 */
function mappedRow(overrides: Record<string, unknown> = {}) {
  const mapped = mapRow(parquetRow(overrides));
  if (!mapped.ok || !mapped.record) {
    throw new Error(`Expected a mapped record, got ${String(mapped.reason)}`);
  }
  return mapped.record;
}

describe("reading the parquet columns", () => {
  it("decodes raw bytes as text, because the reader hands text back as bytes", () => {
    expect(asText(new TextEncoder().encode("Acura ILX 2018 Black"))).toBe("Acura ILX 2018 Black");
    expect(asText(null)).toBeNull();
    expect(asText("already text")).toBe("already text");
  });

  it("converts the BigInt an INT64 column arrives as", () => {
    expect(asInteger(214n)).toBe(214);
    expect(asInteger(undefined)).toBeNull();
    expect(asInteger("")).toBeNull();
  });
});

describe("parsePrice", () => {
  it("turns a naira string into a number", () => {
    expect(parsePrice("₦ 7,350,000")).toEqual({ value: 7350000, problem: null });
    expect(parsePrice("₦1,260,000")).toEqual({ value: 1260000, problem: null });
    expect(parsePrice("183750000")).toEqual({ value: 183750000, problem: null });
  });

  it("rejects rather than guessing when there is no price", () => {
    expect(parsePrice("").problem).toBe("missing_price");
    expect(parsePrice(null).problem).toBe("missing_price");
    expect(parsePrice("Negotiable").problem).toBe("unparsable_price");
    expect(parsePrice("Negotiable").value).toBeNull();
  });

  it("flags implausible amounts instead of importing them silently", () => {
    expect(parsePrice("₦ 1,000").problem).toBe("implausible_price_low");
    expect(parsePrice("₦ 9,999,999,999,999").problem).toBe("implausible_price_high");
  });
});

describe("parseMileage", () => {
  it("turns an odometer string into kilometres", () => {
    expect(parseMileage("322770 km")).toEqual({ value: 322770, problem: null });
    expect(parseMileage("166,914 km")).toEqual({ value: 166914, problem: null });
    expect(parseMileage("383069km")).toEqual({ value: 383069, problem: null });
  });

  it("drops the row's absurd reading while still reporting it", () => {
    // The dataset really contains this value for one row.
    expect(parseMileage("368379820 km")).toEqual({ value: null, problem: "implausible_mileage" });
  });

  it("handles a missing or unreadable value", () => {
    expect(parseMileage("").problem).toBe("missing_mileage");
    expect(parseMileage("unknown").problem).toBe("unparsable_mileage");
  });
});

describe("normaliseCondition", () => {
  it("maps the three values the dataset uses", () => {
    expect(normaliseCondition("Nigerian Used").value).toBe("nigerian_used");
    expect(normaliseCondition("Foreign Used").value).toBe("foreign_used");
    expect(normaliseCondition("Brand New").value).toBe("brand_new");
    expect(normaliseCondition("Nigerian Used").label).toBe("Nigerian used");
  });

  it("keeps what it cannot map instead of inventing a grade", () => {
    const unknown = normaliseCondition("Locally Assembled");
    expect(unknown.value).toBe("unknown");
    expect(unknown.label).toBe("locally assembled");
    expect(unknown.problem).toBe("unknown_condition");
    expect(normaliseCondition("").problem).toBe("missing_condition");
  });
});

describe("parseTitle", () => {
  it("splits make, model, year and colour out of the dataset's title", () => {
    expect(parseTitle("Mercedes-Benz GL-Class 2006 Black")).toEqual({
      title: "Mercedes-Benz GL-Class 2006 Black",
      make: "Mercedes-Benz",
      model: "GL-Class",
      year: 2006,
      colour: "Black",
    });
  });

  it("leaves a year out when the title does not state one", () => {
    expect(parseTitle("Toyota Corolla Silver").year).toBeNull();
    expect(parseTitle("Toyota Corolla Silver").make).toBe("Toyota");
    expect(parseTitle("").title).toBe("");
  });

  it("only reads a colour when the title ends in one", () => {
    expect(parseTitle("Toyota Camry 1999 Red").colour).toBe("Red");
    expect(parseTitle("Toyota Land Cruiser 2015 Prado").colour).toBeNull();
  });

  it("keeps a multi-word make together", () => {
    expect(parseTitle("Land Rover Range Rover Sport 2010 Black")).toEqual({
      title: "Land Rover Range Rover Sport 2010 Black",
      make: "Land Rover",
      model: "Range Rover Sport",
      year: 2010,
      colour: "Black",
    });
    expect(parseTitle("Land Rover Lr2 2007 Silver").make).toBe("Land Rover");
    expect(parseTitle("Land Rover Lr2 2007 Silver").model).toBe("Lr2");
    // "Land" on its own is not a make: nothing else claims the prefix.
    expect(parseTitle("Land Cruiser 2015 White").make).toBe("Land");
  });

  it("does not mistake a leading condition word for a make", () => {
    const parsed = parseTitle("New Toyota Land Cruiser Prado 2.7 i 2013 Black");
    expect(parsed.make).toBe("Toyota");
    expect(parsed.model).toBe("Land Cruiser Prado 2.7 i");
    expect(parsed.year).toBe(2013);
    // The full original string is still what is shown and stored.
    expect(parsed.title).toBe("New Toyota Land Cruiser Prado 2.7 i 2013 Black");
    expect(parseTitle("Brand New Kia Sedona 2005 Blue").make).toBe("Kia");
  });
});

describe("sourceIdFrom", () => {
  it("uses the listing id carried in the image URL", () => {
    expect(sourceIdFrom(parquetRow())).toBe("cars45-131812140");
  });

  it("falls back to a deterministic key, so a re-import still matches", () => {
    const row = parquetRow({ "Image URL": "", "Unnamed: 0": 7n });
    const first = sourceIdFrom(row);
    expect(first).toBe(sourceIdFrom({ ...row }));
    expect(first).toMatch(/^row-7-[0-9a-f]{8}$/);
  });
});

describe("slugFor", () => {
  it("is URL-safe and ends in the source id", () => {
    const slug = slugFor("Toyota Camry 1999 Red", "cars45-131812140");
    expect(slug).toBe("toyota-camry-1999-red-cars45-131812140");
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("stays unique for two listings that share a title", () => {
    expect(slugFor("Toyota Camry 1999 Red", "cars45-1")).not.toBe(slugFor("Toyota Camry 1999 Red", "cars45-2"));
  });
});

describe("mapRow", () => {
  it("names the listing from the column that matches the row's own image", () => {
    const record = mappedRow();
    // Not "Toyota Sequoia 2005 Gray": `Car Name` is a mis-merged column.
    expect(record.name).toBe("Acura ILX 2018 Black");
    expect(record.specs.source_title_alt).toBe("Toyota Sequoia 2005 Gray");
  });

  it("carries every fact the source states into specs", () => {
    const record = mappedRow();
    expect(record.price).toBe(1687500);
    expect(record.currency).toBe("NGN");
    expect(record.source_id).toBe("cars45-131812140");
    expect(record.source_url).toContain("cars45.com");
    expect(record.specs).toMatchObject({
      year: 2018,
      mileage_km: 322770,
      condition: "nigerian_used",
      condition_label: "Nigerian used",
      colour: "Black",
      make: "Acura",
      model: "ILX",
      region: "Ondo State, Akure",
      state: "Ondo State",
      area: "Akure",
      source_price_raw: "₦ 1,687,500",
      source_mileage_raw: "322770 km",
      source_row_index: 214,
      historic_listing: true,
    });
  });

  it("marks the record as a historic listing with no claim of availability", () => {
    const record = mappedRow();
    expect(record.specs.availability_note).toMatch(/not verified/i);
    expect(record.specs.price_note).toMatch(/not a Penman Empire quote/i);
  });

  it("rejects a row with no usable price rather than inventing one", () => {
    const mapped = mapRow(parquetRow({ Price: "" }));
    expect(mapped.ok).toBe(false);
    expect(mapped.reason).toBe("missing_price");
  });

  it("rejects a row with no name", () => {
    const mapped = mapRow(parquetRow({ "Car Name.1": "" }));
    expect(mapped.ok).toBe(false);
    expect(mapped.reason).toBe("missing_name");
  });

  it("imports a row whose mileage is unusable, with the mileage left null", () => {
    const record = mappedRow({ Mileage: "368379820 km" });
    expect(record.specs.mileage_km).toBeNull();
    // The reading is still recorded, so nothing about the source is lost.
    expect(record.specs.source_mileage_raw).toBe("368379820 km");
    expect(mapRow(parquetRow({ Mileage: "368379820 km" })).problems).toContain("implausible_mileage");
  });

  it("never invents a year, a colour or a condition", () => {
    const mapped = mapRow(parquetRow({ "Car Name.1": "Toyota Corolla", Status: "", Region: "" }));
    expect(mapped.record?.specs.year).toBeNull();
    expect(mapped.record?.specs.colour).toBeNull();
    expect(mapped.record?.specs.condition).toBe("unknown");
    expect(mapped.problems).toEqual(
      expect.arrayContaining(["missing_year", "missing_colour", "missing_condition", "missing_region"]),
    );
  });
});

describe("re-importing is safe", () => {
  it("hashes only the fields the importer owns", () => {
    const first = importHashOf(mappedRow());
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    // The same source row hashes the same way every time.
    expect(importHashOf(mappedRow())).toBe(first);
    // A changed source price is a changed hash, so the row is refreshed.
    expect(importHashOf(mappedRow({ Price: "₦ 1,777,000" }))).not.toBe(first);
  });

  it("recognises an untouched row as its own", () => {
    const record = mappedRow();
    const stored = importHashOf(record);
    const rowInDatabase = {
      name: record.name,
      price: record.price,
      specs: { ...record.specs, import_hash: stored, imported_by: "scripts/import-cars.mjs" },
    };
    expect(currentRowHash(rowInDatabase)).toBe(stored);
  });

  it("tells a hand-edited row apart, which is what stops the overwrite", () => {
    const record = mappedRow();
    const stored = importHashOf(record);
    const edited = {
      name: record.name,
      price: 1_500_000, // somebody re-priced it here
      specs: { ...record.specs, import_hash: stored },
    };
    // The stored hash no longer matches the row, so the importer skips it
    // rather than restoring the dataset's price over the edit.
    expect(currentRowHash(edited)).not.toBe(stored);
  });

  it("keeps the source identifier stable, which is the dedupe key", () => {
    expect(DATASET_SOURCE).toBe("huggingface:Binaryy/cars-for-sale");
    expect(mappedRow().source_id).toBe(mappedRow().source_id);
  });
});

describe("describe", () => {
  it("states only what the source states, and says it is unverified", () => {
    const text = describeRecord(mappedRow());
    expect(text).toContain("Acura ILX 2018 Black");
    expect(text).toContain("Nigerian used");
    expect(text).toContain("322,770 km");
    expect(text).toContain("Ondo State, Akure");
    expect(text).toMatch(/not been verified/i);
    // Nothing the dataset does not contain may appear.
    expect(text).not.toMatch(/engine|service history|accident|warranty/i);
  });

  it("omits the facts it does not have rather than printing placeholders", () => {
    const text = describeRecord(mappedRow({ Mileage: "", "Car Name.1": "Toyota Corolla", Status: "", Region: "" }));
    expect(text).not.toMatch(/\bnull\b|undefined|NaN/);
    expect(text).not.toMatch(/km/);
  });
});
