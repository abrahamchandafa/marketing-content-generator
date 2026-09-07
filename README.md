# Marketing Content Generator
<img width="1560" height="1286" alt="cover" src="https://github.com/user-attachments/assets/3264ff33-5ee8-40ae-b954-c43e50c060c5" />


Turns brand name, product name, description, and price into a shareable marketing poster using
either a deterministic `fixed` background, or an `AI-generated background that uses input info to produce a more stylistic option` with a white text card is rasterized to PNG server-side.

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

1. **AI generates the asset, not the text.** 
2. **SVG + `resvg`, not a screenshot pipeline.**
3. **Shared Zod contract.** `packages/shared` is imported by both apps, so frontend and backend can't drift.
4. **AI fails gracefully.** If OpenRouter errors, the service logs and falls back to `fixed` — a poster is always produced.

## Testing

`npm run check` runs typecheck, ESLint, and Vitest across all workspaces (schema rules, API lifecycle + validation via Supertest, composer units, React component tests).

## Limitations / Future Work

- Local filesystem storage and an in-process job queue.
- A restart mid-generation leaves a stuck status.
- No authentication, no cloud storage etc.
- Future work would involve:
  - A more stylistic visual appearance.
  - better image history management (eg download all, delete all, clear history etc)
  - multiple images generated per single request, each slightly different.
  - employ more powerful image generation models to engage different design templates.


## AI Tools Used

Architecture and code assisted by  (ideation), DeepSeek (suggestion), and opencode (Deeppseek V4 Flash 0731 for code implementation);

## License

MIT. See `LICENSE`.
