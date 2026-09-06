# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-09-06

### Added

- Full-stack marketing poster generator.
- Shared, versioned contract between frontend and backend (`@mc/shared`):
  - Zod input schema (`brandName`, `productName`, `description`, `price`).
  - `GenerationStatus` enum and DTOs for API responses.
- Backend API (`@mc/api`, Express + TypeScript):
  - `POST /api/generations` with validation, returns `202` with a `pending` generation.
  - `GET /api/generations` history listing.
  - `GET /api/generations/:id` status and result metadata.
  - `GET /api/generations/:id/poster` renders the poster as PNG.
  - Asynchronous in-process generation job: `pending -> generating -> composing -> completed/failed`.
  - SQLite persistence via `sql.js` (WASM, zero native compile) with a typed repository.
  - Deterministic SVG poster composer (procedural cartoony beach background + white content card) rasterized with `@resvg/resvg-js`.
  - `BACKGROUND_MODE` config: `fixed` (procedural SVG scene) or `ai` (OpenRouter-generated background image).
  - OpenRouter AI service implementing the `AiService` interface: LLM-coded poster spec (palette + background prompt) and Image API background generation, with graceful fallback to the fixed scene on failure.
  - Fixed `.env` resolution (root `.env` was previously not found because of an off-by-one in the path derivation), plus fallback image models when the configured one is unavailable.
  - Centralized error handling, request size caps, and rate limiting on the generation endpoint.
  - Environment configuration validated with Zod.
- Web app (`@mc/web`, React + TypeScript + Vite):
  - Controlled form validated against the shared schema with inline messages.
  - Loading/progress state while generating.
  - Result poster display and previous generations history.
  - Responsive single-file stylesheet (desktop and mobile).
  - Development proxy to the API (no CORS setup required locally).
- Tests (Vitest):
  - API integration tests with Supertest (create, history, get, validation, failure path).
  - Composer unit tests (`wrapText`, poster composition).
  - Shared schema tests.
  - React component tests with Testing Library.
- Tooling: ESLint (flat config) + typescript-eslint + Prettier, `tsc --noEmit` typechecking, `npm run check` aggregate script.

### Notes

- `BACKGROUND_MODE=fixed` is the default and requires no API key; set `BACKGROUND_MODE=ai` with an `OPENROUTER_API_KEY` to enable AI-generated backgrounds. Any AI failure falls back to the fixed scene so a poster is always produced. See `README.md`.
