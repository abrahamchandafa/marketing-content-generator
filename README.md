# Marketing Content Generator

A small full-stack application that turns four pieces of product information — brand name, product name, description, and price — into a ready-to-share marketing poster image.

The poster is a deterministic SVG composition: a procedural cartoon beach background (sky, sun, sea, sand, palm tree) with a white content card carrying the user's text. Rasterized to PNG server-side with a bundled font so the output is pixel-identical on every machine.

## Tech Stack

| Layer      | Choice                                     | Why                                                         |
| ---------- | ------------------------------------------ | ----------------------------------------------------------- |
| Frontend   | React + TypeScript + Vite                  | Required stack, fast build                                  |
| Backend    | Express + TypeScript                       | Required stack                                              |
| Validation | Zod (shared)                               | Single schema used by both frontend and backend             |
| Database   | SQLite via `sql.js` (WASM)                 | Zero native compilation; `npm install` works everywhere     |
| Image      | SVG + `@resvg/resvg-js`                    | Deterministic, crisp, bundled font                          |
| AI         | Optional OpenRouter hook (offline default) | Runs fully with no API key; AI slots in behind an interface |
| Testing    | Vitest + Supertest + Testing Library       | Lightweight unit + integration + component tests            |
| Tooling    | TypeScript (strict), ESLint, Prettier      | `npm run check` runs typecheck + lint + tests               |

## Repository Layout

```
apps/
  api/     Express backend (routes, services, composition, persistence)
  web/     React frontend
packages/
  shared/  Zod schemas, status enum, DTOs, shared constants
```

## Requirements

- Node.js >= 20 (tested on Node 24)

## Running Locally

```bash
npm install
npm run dev
```

This starts:

- API on http://localhost:3001
- Web app on http://localhost:5173 (proxies `/api` to the API)

Open http://localhost:5173, fill in the form, and generate a poster. SQLite data lives in `data/`, generated images in `storage/`.

### Without an API key

The app runs end-to-end with no configuration: `BACKGROUND_MODE=fixed` renders the procedural beach scene, and the AI service returns a default palette entirely locally. Setting `BACKGROUND_MODE=ai` plus an `OPENROUTER_API_KEY` switches to AI-generated backgrounds (see "AI Generation").

## Environment Variables

`.env` is read by the API from the `apps/api` directory.

| Variable                 | Default                       | Purpose                                                            |
| ------------------------ | ----------------------------- | ------------------------------------------------------------------ |
| `PORT`                   | `3001`                        | API port                                                           |
| `DATABASE_PATH`          | `./data/marketing.db`         | SQLite database file path                                          |
| `STORAGE_DIR`            | `./storage`                   | Directory for generated poster images                              |
| `NODE_ENV`               | `development`                 | Disables rate limiting in `test`                                   |
| `BACKGROUND_MODE`        | `fixed`                       | `fixed` = procedural SVG scene, `ai` = OpenRouter background image |
| `OPENROUTER_API_KEY`     | _(empty)_                     | Required for `BACKGROUND_MODE=ai`                                  |
| `OPENROUTER_MODEL`       | `openai/gpt-4o-mini`          | LLM used to produce the poster spec (palette + background prompt)  |
| `OPENROUTER_IMAGE_MODEL` | `bytedance-seed/seedream-4.5` | Image model used to generate the background                        |

Copy `.env.example` to `.env` to customize. No secret values are required for `BACKGROUND_MODE=fixed`.

## API

- `POST /api/generations` — validate and create a generation. Returns `202` with `{ id, status: "pending" }`; generation runs asynchronously in-process.
- `GET /api/generations` — history of previous generations (newest first).
- `GET /api/generations/:id` — status and metadata for one generation.
- `GET /api/generations/:id/poster` — the generated poster PNG (once `completed`).

**Status flow:** `pending → generating → composing → completed | failed`. The frontend polls `GET /:id` every second — no WebSockets needed for this scale.

Validation errors return `400` with `{ error, details: [{ path, message }] }`; unknown generation IDs return `404`. The `POST` endpoint is rate limited (10 req/min) and the JSON body is capped at 32 KB.

## Key Technical Decisions

1. **AI generates the asset, not the text.** Image models are unreliable at rendering text — a marketing poster must never misspell the price. The text is rendered deterministically as SVG; AI (when enabled) only influences the creative direction.
2. **SVG instead of a screenshot pipeline.** Writing the poster as an SVG string avoids Puppeteer/Playwright (headless Chrome) entirely. `resvg` rasterizes it in a single step with a bundled font, and all layout logic (`wrapText`, XML escaping, composition) is pure and unit-testable.
3. **Shared Zod contract.** `packages/shared` defines the input schema plus DTOs imported by both apps, so frontend and backend can't drift.
4. **SQLite without native modules.** `sql.js` is SQLite compiled to WebAssembly, so `npm install` never invokes a compiler, on any OS.
5. **Minimal dependencies on the frontend.** Plain controlled form + a small poll loop. React Hook Form, TanStack Query, and Tailwind were deliberately left out.

## AI Generation

`BACKGROUND_MODE` selects the background strategy:

- **`fixed`** (default): the procedural beach SVG scene. No API key, fully offline, deterministic.
- **`ai`**: an OpenRouter pipeline. A cheap LLM (`OPENROUTER_MODEL`) turns the product into a structured poster spec — a JSON palette and an image-generation prompt — then the Image API (`POST /api/v1/images`, `OPENROUTER_IMAGE_MODEL`) renders a 4:5 cartoon background image. The image is returned as base64, embedded directly into the SVG as a data URL, and rasterized by `resvg` (so the text is still rendered deterministically — AI only supplies the creative backdrop).

Both paths live behind the `AiService` interface in `apps/api/src/services/ai-service.ts`. The image call tries `OPENROUTER_IMAGE_MODEL` first, then falls back through a small list of broadly available models (`bytedance-seed/seedream-4.5`, `qwen/qwen-image-3`) since some providers are region-gated. If every attempt fails, the service logs the error and gracefully falls back to `fixed`, so a poster is always produced. Calls use a 60s LLM timeout and a 120s image-generation timeout; the frontend polls for up to 3 minutes.

## Testing

```bash
npm test                       # run all workspace tests
npm run typecheck              # tsc --noEmit across workspaces
npm run lint                   # ESLint
npm run check                  # typecheck + lint + test
```

Verified coverage:

- Shared: schema validation rules (required, length limits, price rules).
- API (Supertest): create, validation errors, oversized payload (413), history list, single fetch, full lifecycle to `completed` with a downloadable PNG, 404s.
- Composer: `wrapText`, XML escaping, poster composition, palette override.
- Web (Testing Library): form rendering, validation messages, submit → completed poster, failure error state.

## Known Limitations

- Image storage is the local filesystem and the SQLite file is rewritten on each write — fine for a single-user tool, not for multi-instance hosting.
- Generation runs asynchronously inside the API process, not in a durable job queue. A process restart mid-generation leaves a `pending` record.
- No auth; anyone with API access can generate posters (rate limited).
- The poster background is either the single procedural beach scene or an OpenRouter-generated cartoon image, not yet user-selectable per request.

## What I'd Improve With More Time

- Per-request background choice (`fixed` vs `ai`) exposed to the user in the UI, instead of a global env flag.
- A background-job worker for durable generation, so statuses survive restarts.
- Object storage (S3/R2) for poster images with signed URLs.
- Pagination for history, and download/share of posters.
- End-to-end coverage with Playwright (browser-level) in addition to the current unit/integration tests.

## AI Tools Used

- Architecture review and code generation assisted by OpenAI ChatGPT, DeepSeek, and opencode (Anthropic/Claude class models). The two initial solution proposals from ChatGPT and DeepSeek are preserved in `inspo/`.
- Web font: [Outfit](https://fonts.google.com/specimen/Outfit) (SIL Open Font License), bundled at `apps/api/src/assets/` for deterministic rendering.

## License

MIT. See `LICENSE`.
