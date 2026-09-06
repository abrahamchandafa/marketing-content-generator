import type { CreateGenerationInput } from "@mc/shared";
import { z } from "zod";
import { DEFAULT_PALETTE, type BackgroundSource, type Palette } from "./poster-composer";
import type { Env } from "../config/env";

export interface CreativeSuggestion {
  palette: Palette;
  background: BackgroundSource;
}

export interface AiService {
  suggest(input: CreateGenerationInput): Promise<CreativeSuggestion>;
}

export class OfflineAiService implements AiService {
  async suggest(_input: CreateGenerationInput): Promise<CreativeSuggestion> {
    return { palette: DEFAULT_PALETTE, background: { kind: "fixed" } };
  }
}

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

const IMAGE_MODEL_FALLBACKS = ["bytedance-seed/seedream-4.5", "qwen/qwen-image-3"];

const HEX_COLOR = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

const PosterSpecSchema = z.object({
  tagline: z.string().optional(),
  backgroundPrompt: z.string().min(10),
  palette: z
    .object({
      skyTop: z.string().regex(HEX_COLOR).optional(),
      skyBottom: z.string().regex(HEX_COLOR).optional(),
      sun: z.string().regex(HEX_COLOR).optional(),
      sea: z.string().regex(HEX_COLOR).optional(),
      seaShallow: z.string().regex(HEX_COLOR).optional(),
      sand: z.string().regex(HEX_COLOR).optional(),
      palm: z.string().regex(HEX_COLOR).optional(),
      card: z.string().regex(HEX_COLOR).optional(),
      text: z.string().regex(HEX_COLOR).optional(),
      accent: z.string().regex(HEX_COLOR).optional(),
    })
    .default({}),
});

type PosterSpec = z.infer<typeof PosterSpecSchema>;

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

interface ImageGenerationResponse {
  data?: { b64_json?: string; media_type?: string }[];
}

const SYSTEM_PROMPT = [
  "You are a creative director for product marketing posters.",
  "Given a product and its description, choose a background scene that matches the product's world and intended usage",
  "(for example: a tropical beach for a beach sunscreen, a cozy cafe for coffee, a gym for sportswear, a garden for an organic skincare line).",
  "Respond with JSON only matching this shape:",
  '{ "tagline": "short catchy slogan", "backgroundPrompt": "vivid image-generation prompt for a full-bleed cartoon background scene derived from the product description, with no text, no words, no letters, no logos, no product artwork", "palette": { "skyTop": "#hex", "skyBottom": "#hex", "sun": "#hex", "sea": "#hex", "seaShallow": "#hex", "sand": "#hex", "palm": "#hex", "card": "#ffffffff", "text": "#hex", "accent": "#hex" } }',
  "The background scene must clearly reflect what the product is for, and must never contain readable text.",
].join("\n");

export class OpenRouterAiService implements AiService {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly imageModel: string,
  ) {}

  async suggest(input: CreateGenerationInput): Promise<CreativeSuggestion> {
    try {
      console.log(`[ai] calling LLM (${this.model}) to create poster spec...`);
      const spec = await this.codePosterSpec(input);
      console.log("[ai] poster spec received.");
      console.log(`[ai] background prompt: ${spec.backgroundPrompt}`);
      const dataUrl = await this.generateBackground(spec.backgroundPrompt);
      console.log("[ai] background image generated.");
      return {
        palette: { ...DEFAULT_PALETTE, ...spec.palette },
        background: { kind: "image", dataUrl },
      };
    } catch (error) {
      console.error("[ai] connection failed; falling back to fixed procedural background:", error);
      return { palette: DEFAULT_PALETTE, background: { kind: "fixed" } };
    }
  }

  private async codePosterSpec(input: CreateGenerationInput): Promise<PosterSpec> {
    const userPrompt = [
      `Brand: ${input.brandName}`,
      `Product: ${input.productName}`,
      `Description: ${input.description}`,
      `Price: ${input.price}`,
    ].join("\n");
    const response = await this.post<ChatCompletionResponse>("/chat/completions", {
      model: this.model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
    const content = response.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("LLM returned no content.");
    }
    return PosterSpecSchema.parse(JSON.parse(content));
  }

  private async generateBackground(prompt: string): Promise<string> {
    const candidates = [
      this.imageModel,
      ...IMAGE_MODEL_FALLBACKS.filter((m) => m !== this.imageModel),
    ];
    let lastError: unknown;
    for (const model of candidates) {
      console.log(`[ai] calling image API (${model})...`);
      try {
        return await this.generateWithModel(model, prompt);
      } catch (error) {
        console.warn(
          `[ai] image model ${model} failed; ${error instanceof Error ? error.message : String(error)}`,
        );
        lastError = error;
      }
    }
    throw lastError;
  }

  private async generateWithModel(model: string, prompt: string): Promise<string> {
    const response = await this.post<ImageGenerationResponse>(
      "/images",
      {
        model,
        prompt,
        n: 1,
        aspect_ratio: "4:5",
        output_format: "png",
      },
      120_000,
    );
    const image = response.data?.[0];
    if (!image?.b64_json) {
      throw new Error("Image provider returned no image.");
    }
    const mediaType = typeof image.media_type === "string" ? image.media_type : "image/png";
    return `data:${mediaType};base64,${image.b64_json}`;
  }

  private async post<T>(path: string, body: unknown, timeoutMs = 60_000): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    try {
      const response = await fetch(`${OPENROUTER_BASE}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `OpenRouter ${path} responded with ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
        );
      }
      console.log(`[ai] ${path} returned ${response.status} in ${Date.now() - startedAt}ms`);
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createAiService(env: Env): AiService {
  if (env.BACKGROUND_MODE === "ai") {
    if (env.OPENROUTER_API_KEY) {
      console.log(
        `[ai] enabled (LLM=${env.OPENROUTER_MODEL}, image=${env.OPENROUTER_IMAGE_MODEL})`,
      );
      return new OpenRouterAiService(
        env.OPENROUTER_API_KEY,
        env.OPENROUTER_MODEL,
        env.OPENROUTER_IMAGE_MODEL,
      );
    }
    console.warn(
      "[ai] BACKGROUND_MODE=ai requires OPENROUTER_API_KEY; using fixed procedural background.",
    );
    return new OfflineAiService();
  }
  console.log(
    "[ai] disabled (BACKGROUND_MODE=fixed); to enable set BACKGROUND_MODE=ai and OPENROUTER_API_KEY.",
  );
  return new OfflineAiService();
}
