# Marketing Content Generator

Turns brand name, product name, description, and price into a shareable marketing poster. A deterministic SVG composition (procedural cartoon beach, or an AI-generated background) with a white text card is rasterized to PNG server-side with a bundled font — so text is always pixel-perfect.

**Stack:** React + TypeScript + Vite · Express + TypeScript · Zod (shared contract) · SQLite via `sql.js` (WASM, zero native compile) · SVG + `@resvg/resvg-js` · Vitest + Supertest + Testing Library. Runs fully offline without an API key.

## Run

```bash
npm install
npm run dev        # API :3001, web :5173 (open http://localhost:5173)
npm run check      # typecheck + lint + tests
```

Data lives in `data/`, posters in `storage/` (both gitignored).

## Config

Copy `.env.example` to `.env`. Key vars:

| Variable | Default | Purpose |
| --- | --- | --- |
| `BACKGROUND_MODE` | `fixed` | `fixed` (offline SVG scene) or `ai` (OpenRouter uses AI for background generation-- kindly `email me` for openrouter API key) |
| `OPENROUTER_API_KEY` | — | Required for `BACKGROUND_MODE=ai` |
| `OPENROUTER_MODEL` / `OPENROUTER_IMAGE_MODEL` | `deepseek/deepseek-v4-flash-0731` / `bytedance-seed/seedream-4.5` | LLM for the poster spec, image model for the background |

## API

- `POST /api/generations` → `202 { id, status: "pending" }`; generation runs async.
- `GET /api/generations` → history (newest first).
- `GET /api/generations/:id` → status/metadata.
- `GET /api/generations/:id/poster` → poster PNG when `completed`.

Status flow: `pending → generating → composing → completed | failed`. The frontend polls every second — no WebSockets needed. POST is rate-limited (10/min) and body-capped at 32 KB; validation errors are `400 { error, details }`.

## Design Decisions

1. **AI generates the asset, not the text.** Image models mangle text — a poster must never misspell the price. AI (palette + background image) is layered under a deterministically-rendered SVG text card.
2. **SVG + `resvg`, not a screenshot pipeline.** No Puppeteer/Playwright; layout logic (`wrapText`, XML escaping, composition) is pure and unit-testable.
3. **Shared Zod contract.** `packages/shared` is imported by both apps, so frontend and backend can't drift.
4. **`sql.js` instead of native SQLite bindings.** No compiler required on any OS.
5. **AI fails gracefully.** If OpenRouter errors, the service logs and falls back to `fixed` — a poster is always produced.

## Testing

`npm run check` runs typecheck, ESLint, and Vitest across all workspaces (schema rules, API lifecycle + validation via Supertest, composer units, React component tests).

## Limitations / Future Work

- Local filesystem storage and an in-process job queue — fine for one user, not multi-instance.
- A restart mid-generation leaves a stuck status; a durable worker would fix it.
- No auth; per-request background choice and history pagination are future niceties.

## AI Tools Used

Architecture and code assisted by  (ideation), DeepSeek (suggestion), and opencode (Deeppseek V4 Flash 0731 for code implementation); 
Poster font: [Outfit](https://fonts.google.com/specimen/Outfit) (OFL), bundled in `apps/api/src/assets/`.

## License

MIT. See `LICENSE`.