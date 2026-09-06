import express from "express";
import { loadEnv, type Env } from "./config/env";
import { GenerationRepository } from "./db/generation-repository";
import { errorHandler } from "./middleware/error-handler";
import { createGenerationsRouter } from "./routes/generations";
import { createAiService } from "./services/ai-service";
import { GenerationService } from "./services/generation-service";
import { ResvgPosterRenderer } from "./services/poster-service";

export async function createApp(env: Env = loadEnv()): Promise<express.Express> {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));

  const repository = await GenerationRepository.create(env.DATABASE_PATH);
  const ai = createAiService(env);
  const renderer = new ResvgPosterRenderer(env.STORAGE_DIR);
  const service = new GenerationService(repository, ai, renderer);

  app.use(
    "/api/generations",
    createGenerationsRouter(repository, service, env.NODE_ENV !== "test"),
  );

  app.use("/api/health", ((_req, res) => {
    res.json({ status: "ok" });
  }) as express.RequestHandler);

  app.use(errorHandler);

  return app;
}
