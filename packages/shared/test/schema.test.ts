import { describe, expect, it } from "vitest";
import {
  MAX_BRAND_NAME,
  MAX_DESCRIPTION,
  MAX_PRICE,
  MAX_PRODUCT_NAME,
  CreateGenerationInputSchema,
  formatPrice,
} from "../src/index";

const validInput = {
  brandName: "Sunshield",
  productName: "Tropical Glow",
  description: "SPF 50+ Broad Spectrum, Water Resistant, Lightweight.",
  price: 14.99,
};

describe("CreateGenerationInputSchema", () => {
  it("parses a valid input", () => {
    expect(CreateGenerationInputSchema.parse(validInput)).toEqual(validInput);
  });

  it("trims surrounding whitespace", () => {
    const parsed = CreateGenerationInputSchema.parse({
      ...validInput,
      brandName: "  Sunshield  ",
    });
    expect(parsed.brandName).toBe("Sunshield");
  });

  it("rejects an empty brand name", () => {
    const result = CreateGenerationInputSchema.safeParse({ ...validInput, brandName: "  " });
    expect(result.success).toBe(false);
  });

  it("rejects a too-long product name", () => {
    const result = CreateGenerationInputSchema.safeParse({
      ...validInput,
      productName: "x".repeat(MAX_PRODUCT_NAME + 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a too-long description", () => {
    const result = CreateGenerationInputSchema.safeParse({
      ...validInput,
      description: "x".repeat(MAX_DESCRIPTION + 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a too-long brand name", () => {
    const result = CreateGenerationInputSchema.safeParse({
      ...validInput,
      brandName: "x".repeat(MAX_BRAND_NAME + 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero and negative prices", () => {
    expect(CreateGenerationInputSchema.safeParse({ ...validInput, price: 0 }).success).toBe(false);
    expect(CreateGenerationInputSchema.safeParse({ ...validInput, price: -1 }).success).toBe(false);
  });

  it("rejects a price above the maximum", () => {
    const result = CreateGenerationInputSchema.safeParse({
      ...validInput,
      price: MAX_PRICE + 1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts the maximum price", () => {
    const result = CreateGenerationInputSchema.safeParse({ ...validInput, price: MAX_PRICE });
    expect(result.success).toBe(true);
  });

  it("rejects a price with more than two decimals", () => {
    const result = CreateGenerationInputSchema.safeParse({ ...validInput, price: 14.999 });
    expect(result.success).toBe(false);
  });

  it("normalizes a valid fractional price", () => {
    const result = CreateGenerationInputSchema.safeParse({ ...validInput, price: 10.5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(10.5);
    }
  });

  it("rejects a non-numeric price", () => {
    const result = CreateGenerationInputSchema.safeParse({ ...validInput, price: "14.99" });
    expect(result.success).toBe(false);
  });
});

describe("formatPrice", () => {
  it("formats small prices with two decimals", () => {
    expect(formatPrice(14.99)).toBe("$14.99");
    expect(formatPrice(9)).toBe("$9.00");
    expect(formatPrice(999)).toBe("$999.00");
  });

  it("uses K, M, B, T suffixes for large prices", () => {
    expect(formatPrice(10_000)).toBe("$10K");
    expect(formatPrice(1_500_000)).toBe("$1.5M");
    expect(formatPrice(2_000_000_000)).toBe("$2B");
    expect(formatPrice(5_500_000_000_000)).toBe("$5.5T");
    expect(formatPrice(MAX_PRICE)).toBe("$1000T");
  });
});
