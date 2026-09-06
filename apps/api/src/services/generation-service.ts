import crypto from "node:crypto";
import type { CreateGenerationInput } from "@mc/shared";
import { GenerationRepository, type GenerationRow } from "../db/generation-repository";
import type { AiService } from "./ai-service";
import type { PosterRenderer } from "./poster-service";

function now(): string {
  return new Date().toISOString();
}

export class GenerationService {
  constructor(
    private readonly repository: GenerationRepository,
    private readonly ai: AiService,
    private readonly renderer: PosterRenderer,
  ) {}

  create(input: CreateGenerationInput): GenerationRow {
    const timestamp = now();
    const row: GenerationRow = {
      id: crypto.randomUUID(),
      brandName: input.brandName,
      productName: input.productName,
      description: input.description,
      price: input.price,
      status: "pending",
      posterPath: null,
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.repository.insert(row);
    void this.run(row);
    return row;
  }

  private async run(row: GenerationRow): Promise<void> {
    try {
      this.update(row, { status: "generating" });
      const suggestion = await this.ai.suggest(this.toInput(row));
      this.update(row, { status: "composing" });
      const posterPath = await this.renderer.render(this.toInput(row), suggestion);
      this.update(row, { status: "completed", posterPath });
    } catch (error) {
      this.update(row, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private toInput(row: GenerationRow): CreateGenerationInput {
    return {
      brandName: row.brandName,
      productName: row.productName,
      description: row.description,
      price: row.price,
    };
  }

  private update(row: GenerationRow, patch: Partial<GenerationRow>): void {
    this.repository.update({
      ...row,
      ...patch,
      updatedAt: now(),
    });
  }
}
