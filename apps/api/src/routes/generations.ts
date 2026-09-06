import path from "node:path";
import { Router, type RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import {
  CreateGenerationInputSchema,
  GenerationStatusSchema,
  type CreateGenerationResponse,
  type Generation,
  type ListGenerationsResponse,
} from "@mc/shared";
import { NotFoundError, validate } from "../middleware/error-handler";
import type { GenerationRepository, GenerationRow } from "../db/generation-repository";
import type { GenerationService } from "../services/generation-service";

function toDto(row: GenerationRow): Generation {
  return {
    id: row.id,
    brandName: row.brandName,
    productName: row.productName,
    description: row.description,
    price: row.price,
    status: GenerationStatusSchema.parse(row.status),
    posterUrl: row.posterPath ? `/api/generations/${row.id}/poster` : null,
    error: row.error,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createGenerationsRouter(
  repository: GenerationRepository,
  service: GenerationService,
  enableRateLimit: boolean,
): Router {
  const router = Router();

  const createLimiter: RequestHandler | undefined = enableRateLimit
    ? rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false })
    : undefined;

  router.post(
    "/",
    ...(createLimiter ? [createLimiter] : []),
    validate(CreateGenerationInputSchema),
    ((req, res) => {
      const row = service.create(req.body);
      const body: CreateGenerationResponse = {
        id: row.id,
        status: GenerationStatusSchema.parse(row.status),
      };
      res.status(202).json(body);
    }) as RequestHandler,
  );

  router.get("/", ((_req, res) => {
    const rows = repository.listRecent();
    const body: ListGenerationsResponse = { generations: rows.map(toDto) };
    res.json(body);
  }) as RequestHandler);

  router.get("/:id", ((req, res) => {
    const row = repository.findById(req.params.id);
    if (!row) {
      throw new NotFoundError("Generation not found.");
    }
    res.json(toDto(row));
  }) as RequestHandler);

  router.get("/:id/poster", ((req, res) => {
    const row = repository.findById(req.params.id);
    if (!row) {
      throw new NotFoundError("Generation not found.");
    }
    if (row.status !== "completed" || !row.posterPath) {
      throw new NotFoundError("Poster not available yet.");
    }
    res.type("png").sendFile(path.resolve(row.posterPath));
  }) as RequestHandler);

  return router;
}
