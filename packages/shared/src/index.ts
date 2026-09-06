import { z } from "zod";

export const MAX_BRAND_NAME = 60;
export const MAX_PRODUCT_NAME = 60;
export const MAX_DESCRIPTION = 220;
export const MAX_PRICE = 9999.99;

export const CreateGenerationInputSchema = z.object({
  brandName: z
    .string()
    .trim()
    .min(1, "Brand name is required.")
    .max(MAX_BRAND_NAME, `Brand name must be at most ${MAX_BRAND_NAME} characters.`),
  productName: z
    .string()
    .trim()
    .min(1, "Product name is required.")
    .max(MAX_PRODUCT_NAME, `Product name must be at most ${MAX_PRODUCT_NAME} characters.`),
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(MAX_DESCRIPTION, `Description must be at most ${MAX_DESCRIPTION} characters.`),
  price: z
    .number({ invalid_type_error: "Price must be a number." })
    .positive("Price must be greater than zero.")
    .max(MAX_PRICE, `Price must not exceed ${MAX_PRICE}.`)
    .refine(
      (value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6,
      "Price can have at most two decimal places.",
    )
    .transform((value) => Math.round(value * 100) / 100),
});

export type CreateGenerationInput = z.infer<typeof CreateGenerationInputSchema>;

export const GenerationStatusSchema = z.enum([
  "pending",
  "generating",
  "composing",
  "completed",
  "failed",
]);

export type GenerationStatus = z.infer<typeof GenerationStatusSchema>;

export const GenerationSchema = z.object({
  id: z.string(),
  brandName: z.string(),
  productName: z.string(),
  description: z.string(),
  price: z.number(),
  status: GenerationStatusSchema,
  posterUrl: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Generation = z.infer<typeof GenerationSchema>;

export interface CreateGenerationResponse {
  id: string;
  status: GenerationStatus;
}

export interface ListGenerationsResponse {
  generations: Generation[];
}

export const GENERATION_HISTORY_LIMIT = 20;

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
