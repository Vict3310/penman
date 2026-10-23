import { describe, expect, it } from "vitest";
import {
  contactMessageSchema,
  productSchema,
  propertyEnquirySchema,
  rentalEnquirySchema,
  settingsSectionSchema,
  shopEnquirySchema,
  slugSchema,
  vehicleSchema,
  zodFieldErrors,
} from "@/lib/validation";

const validRental = {
  name: "Ada Obi",
  phone: "+234 801 234 5678",
  email: "",
  pickup_date: "2026-03-01",
  return_date: "2026-03-05",
  message: "",
};

describe("rentalEnquirySchema", () => {
  it("accepts a valid enquiry and normalises empty strings to null", () => {
    const result = rentalEnquirySchema.safeParse(validRental);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
      expect(result.data.message).toBeNull();
      expect(result.data.name).toBe("Ada Obi");
    }
  });

  it("rejects a return date before the pickup date", () => {
    const result = rentalEnquirySchema.safeParse({
      ...validRental,
      pickup_date: "2026-03-10",
      return_date: "2026-03-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).return_date?.[0]).toMatch(/on or after/i);
    }
  });

  it("accepts a same-day return", () => {
    const result = rentalEnquirySchema.safeParse({
      ...validRental,
      pickup_date: "2026-03-04",
      return_date: "2026-03-04",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed phone number", () => {
    const result = rentalEnquirySchema.safeParse({ ...validRental, phone: "call me" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email but allows a blank one", () => {
    expect(rentalEnquirySchema.safeParse({ ...validRental, email: "nope" }).success).toBe(false);
    expect(rentalEnquirySchema.safeParse({ ...validRental, email: null }).success).toBe(true);
  });
});

describe("shopEnquirySchema", () => {
  it("coerces a string quantity and defaults the channel", () => {
    const result = shopEnquirySchema.safeParse({
      name: "Bola",
      phone: "08012345678",
      quantity: "3",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(3);
      expect(result.data.channel).toBe("form");
    }
  });

  it("rejects a quantity below 1", () => {
    const result = shopEnquirySchema.safeParse({ name: "Bola", phone: "08012345678", quantity: "0" });
    expect(result.success).toBe(false);
  });
});

describe("propertyEnquirySchema / contactMessageSchema", () => {
  it("accepts a minimal property enquiry", () => {
    expect(propertyEnquirySchema.safeParse({ name: "Chidi", phone: "08099998888" }).success).toBe(true);
  });

  it("requires a substantive contact message", () => {
    const tooShort = contactMessageSchema.safeParse({
      name: "Chidi",
      phone: "08099998888",
      subject: "Rental",
      message: "hi",
    });
    expect(tooShort.success).toBe(false);

    const ok = contactMessageSchema.safeParse({
      name: "Chidi",
      phone: "08099998888",
      subject: "Rental",
      message: "I would like to rent a bus for a wedding in April.",
    });
    expect(ok.success).toBe(true);
  });
});

describe("slugSchema", () => {
  it("accepts a clean slug and rejects invalid characters", () => {
    expect(slugSchema.safeParse("toyota-corolla-2022").success).toBe(true);
    expect(slugSchema.safeParse("Toyota Corolla").success).toBe(false);
    expect(slugSchema.safeParse("trailing-").success).toBe(false);
  });
});

describe("vehicleSchema", () => {
  it("defaults publishing state to draft so nothing goes live by accident", () => {
    const result = vehicleSchema.safeParse({ name: "Van", slug: "van", category: "Bus" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("draft");
      expect(result.data.availability).toBe("available");
      expect(result.data.rate_period).toBe("day");
      expect(result.data.images).toEqual([]);
    }
  });

  it("turns blank numeric inputs into null rather than NaN", () => {
    const result = vehicleSchema.safeParse({
      name: "Van",
      slug: "van",
      category: "Bus",
      rate: "",
      seats: "",
      year: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rate).toBeNull();
      expect(result.data.seats).toBeNull();
      expect(result.data.year).toBeNull();
    }
  });

  it("rejects an unknown rate period", () => {
    expect(
      vehicleSchema.safeParse({ name: "Van", slug: "van", category: "Bus", rate_period: "fortnight" }).success,
    ).toBe(false);
  });
});

describe("productSchema", () => {
  it("rejects negative stock", () => {
    const result = productSchema.safeParse({ name: "Kit", slug: "kit", stock_quantity: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts an empty category id", () => {
    const result = productSchema.safeParse({ name: "Kit", slug: "kit", category_id: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.category_id).toBeNull();
  });
});

describe("settingsSectionSchema", () => {
  it("only permits known settings keys", () => {
    expect(settingsSectionSchema.safeParse({ key: "contact", value: { phone: "123" } }).success).toBe(true);
    expect(settingsSectionSchema.safeParse({ key: "evil", value: {} }).success).toBe(false);
  });
});
