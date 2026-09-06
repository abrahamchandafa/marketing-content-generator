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

  it("rejects a price with more than two decimals", () => {
    const result = CreateGenerationInputSchema.safeParse({ ...validInput, price: 1.234 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric price", () => {
    const result = CreateGenerationInputSchema.safeParse({ ...validInput, price: "14.99" });
    expect(result.success).toBe(false);
  });

  it("rounds prices to two decimals", () => {
    const parsed = CreateGenerationInputSchema.parse({ ...validInput, price: 14.999 });
    expect(parsed.price).toBe(15.0);
  });
});

describe("formatPrice", () => {
  it("formats prices with two decimals", () => {
    expect(formatPrice(14.99)).toBe("$14.99");
    expect(formatPrice(9)).toBe("$9.00");
  });
});
