import path from "node:path";
import dotenv from "dotenv";
import { createApp } from "./app";
import { REPO_ROOT, loadEnv } from "./config/env";

dotenv.config({ path: path.join(REPO_ROOT, ".env") });

const env = loadEnv();
console.log(`[config] NODE_ENV=${env.NODE_ENV}`);
console.log(`[config] BACKGROUND_MODE=${env.BACKGROUND_MODE}`);
console.log(
  `[config] AI is ${
    env.BACKGROUND_MODE === "ai" && env.OPENROUTER_API_KEY
      ? "enabled via OpenRouter"
      : "disabled (fixed procedural background)"
  }`,
);
const app = await createApp(env);

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
