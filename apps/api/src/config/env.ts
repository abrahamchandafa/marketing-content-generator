import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_PATH: z.string().default(path.join(REPO_ROOT, "data", "marketing.db")),
  STORAGE_DIR: z.string().default(path.join(REPO_ROOT, "storage")),
  BACKGROUND_MODE: z.enum(["fixed", "ai"]).default("fixed"),
  OPENROUTER_API_KEY: z.string().optional().default(""),
  OPENROUTER_MODEL: z.string().optional().default("openai/gpt-4o-mini"),
  OPENROUTER_IMAGE_MODEL: z.string().optional().default("bytedance-seed/seedream-4.5"),
});

export type Env = z.infer<typeof EnvSchema>;

export type BackgroundMode = Env["BACKGROUND_MODE"];

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  return EnvSchema.parse(source);
}
