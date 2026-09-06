import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PALETTE } from "../src/services/poster-composer";
import { createAiService, OfflineAiService, OpenRouterAiService } from "../src/services/ai-service";
import type { Env } from "../src/config/env";

const baseEnv: Env = {
  NODE_ENV: "test",
  PORT: 0,
  DATABASE_PATH: "/tmp/mc.db",
  STORAGE_DIR: "/tmp/mc-storage",
  BACKGROUND_MODE: "fixed",
  OPENROUTER_API_KEY: "",
  OPENROUTER_MODEL: "openai/gpt-4o-mini",
  OPENROUTER_IMAGE_MODEL: "bytedance-seed/seedream-4.5",
};

const input = {
  brandName: "Sunshield",
  productName: "Tropical Glow",
  description: "SPF 50+ Broad Spectrum, Water Resistant, Lightweight.",
  price: 14.99,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createAiService", () => {
  it("returns OfflineAiService in fixed mode", () => {
    const service = createAiService(baseEnv);
    expect(service).toBeInstanceOf(OfflineAiService);
  });

  it("returns OfflineAiService in ai mode without an API key", () => {
    const service = createAiService({ ...baseEnv, BACKGROUND_MODE: "ai" });
    expect(service).toBeInstanceOf(OfflineAiService);
  });

  it("returns OpenRouterAiService in ai mode with an API key", () => {
    const service = createAiService({
      ...baseEnv,
      BACKGROUND_MODE: "ai",
      OPENROUTER_API_KEY: "sk-test",
    });
    expect(service).toBeInstanceOf(OpenRouterAiService);
  });
});

describe("OfflineAiService", () => {
  it("returns a fixed background and default palette", async () => {
    const suggestion = await new OfflineAiService().suggest(input);
    expect(suggestion).toEqual({ palette: DEFAULT_PALETTE, background: { kind: "fixed" } });
  });
});

describe("OpenRouterAiService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("codes a poster spec and generates a background image", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  tagline: "Your beach companion",
                  backgroundPrompt: "a sunny cartoon beach with no text",
                  palette: { accent: "#123456" },
                }),
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: [{ b64_json: "aGVsbG8=", media_type: "image/png" }],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const service = new OpenRouterAiService("sk-test", "model-a", "model-img");
    const suggestion = await service.suggest(input);

    expect(suggestion.background.kind).toBe("image");
    if (suggestion.background.kind === "image") {
      expect(suggestion.background.dataUrl).toBe("data:image/png;base64,aGVsbG8=");
    }
    expect(suggestion.palette.accent).toBe("#123456");
    expect(suggestion.palette.text).toBe(DEFAULT_PALETTE.text);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const chatCall = fetchMock.mock.calls[0][1] as { body: string };
    expect(chatCall.body).toContain("model-a");
    expect(chatCall.body).toContain("Sunshield");

    const imageCall = fetchMock.mock.calls[1][1] as { body: string };
    expect(chatCall.body).toContain("model-a");
    expect(imageCall.body).toContain("model-img");
    expect(imageCall.body).toContain("4:5");
  });

  it("falls back to the fixed background when the LLM fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(500, { error: "boom" }));
    vi.stubGlobal("fetch", fetchMock);

    const service = new OpenRouterAiService("sk-test", "model-a", "model-img");
    const suggestion = await service.suggest(input);

    expect(suggestion).toEqual({ palette: DEFAULT_PALETTE, background: { kind: "fixed" } });
  });

  it("falls back when the image provider returns nothing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          choices: [
            {
              message: { content: JSON.stringify({ backgroundPrompt: "some scene", palette: {} }) },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const service = new OpenRouterAiService("sk-test", "model-a", "model-img");
    const suggestion = await service.suggest(input);

    expect(suggestion.background.kind).toBe("fixed");
  });
});
