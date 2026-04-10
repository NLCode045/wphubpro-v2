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
- `functions/` — 31+ Appwrite Cloud Functions (JS/Node.js 20), deployed to Appwrite Cloud separately
- `scripts/` — migration/release utilities (not part of dev workflow)

### Gotchas

- The Vite config sets `server.open: true`, which tries to open a browser on startup. In headless environments the dev server still starts fine.
- Path alias `@/` → `src/` is configured in both `tsconfig.app.json` and `vite.config.ts`.
- No automated test suite exists in this repo; validation is via `tsc -b` (type check) and `npm run lint`.

---

## Credential Management & Gateway Architecture

### Overview

Credentials for third-party services (Stripe, S3, OpenAI/Gemini, Appwrite) are stored encrypted in the `vault.connectors` database table. This prevents credentials from being stored in environment variables or configuration files.

### Vault Structure

Database: `vault` (ID: `69d2ecf3000f449c752f`)
Table: `connectors`

Each credential entry:
- `provider` (text): Credential provider name (`stripe`, `s3`, `gemini`, `google_api`)
- `encrypted_payload` (text): AES-256-GCM encrypted JSON with all credentials for that provider
- `iv` (text): Embedded in encrypted_payload

### Gateway Pattern

All credential access goes through **gateway functions** — not directly from consuming functions. This ensures:

1. **Centralized credential access** — Single point of control per provider
2. **No credential leaks** — Sensitive data never leaves the gateway
3. **Clean separation** — Consuming functions work with domain-specific APIs, not raw SDK clients

#### Gateway Functions

| Gateway | Purpose | Consumers |
|---|---|---|
| `stripe-gateway` | All Stripe API operations (vault-backed Stripe SDK only here) | stripe-products, stripe-invoices, stripe-subscriptions, stripe-payments, stripe-customers, stripe-config, stripe-order-payments, stripe-payment-methods, stripe-create-customer, stripe-portal-link, `stripe-webhook` (verify + orchestration) |
| `s3-gateway` | All S3 operations (upload, download, delete) | zip-parser, file-upload functions |
| `openai-gateway` | All AI/LLM operations (completions, embeddings) | health-ai-agent, content-generation functions |
| `appwrite-gateway` | Admin Appwrite operations (bulk writes, user mgmt) | admin-manage-users, system functions |

#### Example: Stripe Gateway Flow

```
Consumer Function (stripe-products)
    ↓ (calls stripe-gateway with action="list-products")
stripe-gateway
    ↓ (retrieves STRIPE_SECRET_KEY from vault)
vault.connectors (provider="stripe")
    ↓ (returns encrypted_payload)
stripe-gateway (decrypts and uses for API call)
    ↓ (returns processed data)
Consumer Function (receives product list, never sees credentials)
```

#### Gateway Request Format

All gateway functions accept requests with:
- `action` (string): Operation to perform (e.g., `list-products`, `upload`, `generate-content`)
- `payload` (object): Operation-specific parameters

Example:
```json
{
  "action": "list-products",
  "payload": {
    "limit": 50,
    "active": true
  }
}
```

### Vault Setup

1. **Create vault entries** via `scripts/seed-vault.js`:
   ```bash
   node scripts/seed-vault.js
   ```
   This reads `.env` and encrypts credentials into `vault.connectors`.

2. **Environment Variables** (required on all functions):
   - `ENCRYPTION_KEY`: Key for encrypting/decrypting vault payload
   - `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`: Appwrite access (kept as env vars for system bootstrap)
   - `VAULT_DB_ID`: ID of vault database (defaults to `69d2ecf3000f449c752f`)

### Migration Path

Old pattern:
```
Function → reads STRIPE_SECRET_KEY from env → calls Stripe API
```

New pattern (Three-tier architecture):
```
Frontend/Consumer Code
    ↓
Consumer Function (`stripe-consumer`; legacy per-domain copies under `functions/stripe/deprecated/`)
    ↓ (pure data, no credentials)
Gateway Function (stripe-gateway, s3-gateway, etc.)
    ↓ (has vault access)
Vault Database (encrypted credentials)
    ↓
External API (Stripe, S3, OpenAI, etc.)
```

#### Modular boundaries (Stripe)

| Layer | Role |
| --- | --- |
| **`stripe-gateway`** | Sole vault access for Stripe; `handlers/*` actions; merges nested `{ action, payload }` from consumers before dispatch |
| **`stripe-consumer`** | Unified Appwrite function: routes to `handlers/*` (replaces separate `stripe-products`, `stripe-webhook`, etc.). Webhook verifies via gateway `verify-webhook`; sync in `handlers/processStripeWebhookEvent.js` |
| **Consumers (deprecated tree)** | `functions/stripe/deprecated/stripe-*` — old one-function-per-domain layouts; do not add features here |
| **Shared Stripe helpers** | Active: `functions/stripe/stripe-consumer/lib/`. Legacy mirror: `functions/stripe/deprecated/lib/` — not `functions/_shared` |

#### Consumer Functions

Consumer functions:
- Accept requests with `action` and `payload` (when using pure passthrough)
- Call **`stripe-gateway`** via [`functions/stripe/stripe-consumer/lib/callStripeGateway.js`](functions/stripe/stripe-consumer/lib/callStripeGateway.js) with `action` + payload
- May add **local composition** (e.g. `stripe-subscriptions/handlers/*`, admin checks on `stripe-products`)
- **Have ZERO Stripe secret / vault access**

Example (passthrough):
```javascript
const { callStripeGateway } = require('./lib/callStripeGateway');

module.exports = async ({ req, res, log, error }) => {
  try {
    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '').toLowerCase().trim();
    const result = await callStripeGateway(action, payload.payload || payload, log, error);
    return res.json(result);
  } catch (err) {
    return res.json({ success: false, message: err.message }, 500);
  }
};
```

#### Appwrite bootstrap (Stripe consumers)

Each function that uses the Appwrite SDK or `Functions.createExecution` needs **`APPWRITE_ENDPOINT`**, **`APPWRITE_PROJECT_ID`**, **`APPWRITE_API_KEY`** (with optional `APPWRITE_FUNCTION_*` fallbacks — see [`functions/stripe/stripe-consumer/lib/appwriteEnv.js`](functions/stripe/stripe-consumer/lib/appwriteEnv.js)). **Do not** set `STRIPE_SECRET_KEY` on consumers; Stripe credentials live in the vault and are used only inside **`stripe-gateway`**.

#### Available Consumer Functions

| Consumer | Gateway | Purpose |
|---|---|---|
| **stripe-consumer** | stripe-gateway | **Active:** single deployment; `handlers/*` cover catalog, subscriptions, invoices, PMs, portal, checkout, webhook, etc. |
| stripe-products, stripe-subscriptions, … (under `deprecated/`) | stripe-gateway | **Legacy** one-function-per-domain copies only |
| stripe-webhook (`deprecated/`) | stripe-gateway (verify + actions) | Old standalone webhook entry; use **stripe-consumer** + Stripe URL instead |
| s3-storage | s3-gateway | File upload/download/delete |
| ai-content | openai-gateway | AI/LLM operations |
| db-admin | appwrite-gateway | Admin database operations |
