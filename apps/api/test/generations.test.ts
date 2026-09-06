import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import type { Env } from "../src/config/env";
import type { Generation } from "@mc/shared";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mc-api-test-"));
const env: Env = {
  NODE_ENV: "test",
  PORT: 0,
  DATABASE_PATH: path.join(tmpDir, "test.db"),
  STORAGE_DIR: path.join(tmpDir, "storage"),
  BACKGROUND_MODE: "fixed",
  OPENROUTER_API_KEY: "",
  OPENROUTER_MODEL: "openai/gpt-4o-mini",
  OPENROUTER_IMAGE_MODEL: "bytedance-seed/seedream-4.5",
};

const app = await createApp(env);

const validInput = {
  brandName: "Sunshield",
  productName: "Tropical Glow",
  description: "SPF 50+ Broad Spectrum, Water Resistant, Lightweight, Non-Greasy Formula.",
  price: 14.99,
};

async function waitForCompletion(id: string, timeoutMs = 10_000): Promise<Generation> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request(app).get(`/api/generations/${id}`);
    expect(res.status).toBe(200);
    const body = res.body as Generation;
    if (body.status === "completed" || body.status === "failed") {
      return body;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("timed out waiting for generation to complete");
}

describe("POST /api/generations", () => {
  it("accepts valid input and returns a pending generation", async () => {
    const res = await request(app).post("/api/generations").send(validInput);
    expect(res.status).toBe(202);
    expect(res.body.id).toBeTypeOf("string");
    expect(res.body.status).toBe("pending");
  });

  it("rejects invalid input with field-level messages", async () => {
    const res = await request(app)
      .post("/api/generations")
      .send({ brandName: "", productName: "x", description: "y", price: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed.");
    expect(res.body.details).toBeInstanceOf(Array);
  });

  it("rejects non-numeric price", async () => {
    const res = await request(app)
      .post("/api/generations")
      .send({ ...validInput, price: "not-a-number" });
    expect(res.status).toBe(400);
  });

  it("rejects a payload that is too large", async () => {
    const res = await request(app)
      .post("/api/generations")
      .send({ ...validInput, description: "z".repeat(40_000) });
    expect(res.status).toBe(413);
  });
});

describe("generation lifecycle", () => {
  it("reaches completed with a poster URL", async () => {
    const created = await request(app).post("/api/generations").send(validInput);
    const generation = await waitForCompletion(created.body.id);
    expect(generation.status).toBe("completed");
    expect(generation.error).toBeNull();
    expect(generation.posterUrl).toMatch(/^\/api\/generations\/.+\/poster$/);

    const poster = await request(app).get(generation.posterUrl!);
    expect(poster.status).toBe(200);
    expect(poster.headers["content-type"]).toContain("image/png");
    expect(poster.body.length).toBeGreaterThan(1000);
  });
});

describe("GET /api/generations", () => {
  it("lists previous generations newest first", async () => {
    const res = await request(app).get("/api/generations");
    expect(res.status).toBe(200);
    const generations = res.body.generations as Generation[];
    expect(generations.length).toBeGreaterThanOrEqual(1);
    for (const generation of generations) {
      expect(generation.productName).toBeTypeOf("string");
      expect(["pending", "generating", "composing", "completed", "failed"]).toContain(
        generation.status,
      );
    }
  });
});

describe("GET /api/generations/:id", () => {
  it("returns 404 for an unknown id", async () => {
    const res = await request(app).get("/api/generations/missing");
    expect(res.status).toBe(404);
  });

  it("returns the requested generation", async () => {
    const created = await request(app).post("/api/generations").send(validInput);
    const res = await request(app).get(`/api/generations/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.brandName).toBe("Sunshield");
    expect(res.body.price).toBe(14.99);
  });
});

describe("GET /api/generations/:id/poster", () => {
  it("returns 404 before the poster is available", async () => {
    const created = await request(app).post("/api/generations").send(validInput);
    const res = await request(app).get(`/api/generations/${created.body.id}/poster`);
    expect([200, 404]).toContain(res.status);
    if (res.status === 404) {
      expect(res.body.error).toBe("Poster not available yet.");
    }
  });
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
