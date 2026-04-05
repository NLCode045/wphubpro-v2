# AGENTS.md

## Cursor Cloud specific instructions

### Overview

WPHub Pro is a WordPress site management SaaS platform. Local development covers the **frontend React SPA only**; the backend runs entirely on Appwrite Cloud (no local DB or containers needed).

### Running the app

```bash
npm run dev        # Vite dev server on port 5173
```

### Lint / Build / Format

- **Lint:** `npm run lint` — note: ESLint config has a pre-existing `Cannot redefine plugin "react-hooks"` error due to the plugin being both extended via `reactHooks.configs['recommended-latest']` and manually declared in `plugins`. This is a known issue in the repo's `eslint.config.js`.
- **Type check:** `npx tsc -b` (clean as of the base branch)
- **Build:** `npm run build` (runs `tsc -b && vite build`)
- **Format:** `npm run format` (Prettier on `src/`)

### Environment variables

The app reads Appwrite credentials from `.env` (gitignored). All have hardcoded defaults in `src/services/appwrite.ts`, so the dev server starts without a `.env` file. Key env vars (`envPrefix` in `vite.config.ts` covers `VITE_*`, `APPWRITE_*`, `STRIPE_*`, `_*`):

| Variable | Purpose |
|---|---|
| `APPWRITE_ENDPOINT` / `_ENDPOINT` | Appwrite API URL |
| `APPWRITE_PROJECT_ID` / `_PROJECT_ID` | Appwrite project ID |
| `APPWRITE_DATABASE_ID` / `_DATABASE_ID` | Main database ID |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Elements (billing features) |

### Project structure

- `src/` — React SPA (TypeScript, React 19, React Router 7, Vite 7, Bootstrap 5 / SCSS)
- `functions/` — 31 Appwrite Cloud Functions (JS/Node.js 20), deployed to Appwrite Cloud separately
- `scripts/` — migration/release utilities (not part of dev workflow)

### Gotchas

- The Vite config sets `server.open: true`, which tries to open a browser on startup. In headless environments the dev server still starts fine.
- Path alias `@/` → `src/` is configured in both `tsconfig.app.json` and `vite.config.ts`.
- No automated test suite exists in this repo; validation is via `tsc -b` (type check) and `npm run lint`.
