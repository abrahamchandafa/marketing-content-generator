import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { formatPrice, type CreateGenerationInput } from "@mc/shared";
import type { CreativeSuggestion } from "./ai-service";
import { buildPosterSvg } from "./poster-composer";

const ASSETS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");
const FONT_FILES = [
  path.join(ASSETS_DIR, "outfit-400.ttf"),
  path.join(ASSETS_DIR, "outfit-600.ttf"),
  path.join(ASSETS_DIR, "outfit-800.ttf"),
];

export interface PosterRenderer {
  render(input: CreateGenerationInput, suggestion: CreativeSuggestion): Promise<string>;
}

export class ResvgPosterRenderer implements PosterRenderer {
  constructor(private readonly storageDir: string) {}

  async render(input: CreateGenerationInput, suggestion: CreativeSuggestion): Promise<string> {
    const svg = buildPosterSvg(
      {
        brandName: input.brandName,
        productName: input.productName,
        description: input.description,
        price: formatPrice(input.price),
      },
      suggestion.palette,
      suggestion.background,
    );
    const resvg = new Resvg(svg, {
      font: { fontFiles: FONT_FILES, defaultFontFamily: "Outfit" },
    });
    const png = resvg.render().asPng();
    const filename = `${crypto.randomUUID()}.png`;
    const outputPath = path.join(this.storageDir, filename);
    fs.mkdirSync(this.storageDir, { recursive: true });
    fs.writeFileSync(outputPath, png);
    return outputPath;
  }
}
