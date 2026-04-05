# Cloud Agent Starter Skill (WPHub)

Use this skill when an agent needs to get productive quickly in this repo: sign in, run the app, validate a specific area, and handle common Appwrite/Stripe/feature-flag setup issues.

## 1) Quick start (first 5 minutes)

1. Open repo root: `/workspace`.
2. Install dependencies (once per fresh environment): `npm install`.
3. Start frontend: `npm run dev`.
4. Open the app at the Vite URL (usually `http://localhost:5173`).
5. Sign in at `/login` with a valid Appwrite user.

### Required client env (frontend)

Set these in `.env` or `.env.local` when defaults are not correct:

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_DATABASE_ID`
- `STRIPE_PUBLISHABLE_KEY` (billing UI paths)

Optional but useful:

- `APPWRITE_HEARTBEAT_URL`
- `APPWRITE_FUNCTION_*` overrides (point frontend calls to alternate function IDs for testing)

Notes:

- Vite exposes `VITE_*`, `APPWRITE_*`, and `STRIPE_*` env keys to the client.
- The app has hardcoded fallbacks for many IDs, but stale/mismatched environments are a common failure mode.

## 2) Login and session reality check

Primary auth route: `/login`.

Supported sign-in behavior to verify when touching auth:

- Email + password
- MFA second step (email and/or authenticator) when required
- GitHub OAuth sign-in and identity link flow
- Redirect behavior:
  - unauthenticated users -> login
  - authenticated users on auth pages -> dashboard

If login feels broken, check admin auth flags (section 4) before debugging UI code.

## 3) Feature flags and how to mock them fast

There is no single `feature_flags` table. The practical flag source is platform settings key `auth`, read through `public-auth-config`.

### Auth flag keys used by login/profile flows

- `forceMfaForAllUsers`
- `mfaOtpMailEnabled`
- `mfaAuthenticatorEnabled`

### Fast ways to set flags

1. Preferred: Admin UI -> `/admin/settings` -> Security tab.
2. Backend path: `manage-settings` function upsert for category `auth`.

### Fast ways to mock behavior

- Override frontend function IDs with `.env.local` (`APPWRITE_FUNCTION_PUBLIC_AUTH_CONFIG`, etc.) and point to test functions.
- For local UI-only debugging, keep real backend but toggle admin settings to simulate enabled/disabled combinations.

## 4) Codebase areas and practical test workflows

Use only the sections relevant to your change. Do not run broad, unrelated checks.

### A. Auth + Profile Security

Key routes:

- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/profile?tab=security`

Key code:

- `src/domains/auth/context.tsx`
- `src/domains/auth/publicAuthConfig.ts`
- `src/views/auth/auth-1/sign-in/index.tsx`
- `src/components/AuthScreenGate.tsx`
- `src/components/ProtectedRoute.tsx`

High-signal workflow:

1. Sign out and open `/login`.
2. Validate password step.
3. If MFA is expected, validate method picker and code verification.
4. Validate dashboard redirect on success.
5. Open `/profile?tab=security` and verify settings/state round-trip.

### B. Sites + Bridge + Health

Key routes:

- `/sites`
- `/sites/:siteId`

Key code:

- `src/domains/sites/hooks.ts`
- `functions/wphub-sites`
- `functions/site-heartbeat`
- `functions/site-heartbeat-poke`
- `functions/sync-site-meta`

Function env that must exist in Appwrite for this area:

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `ENCRYPTION_KEY` (required for bridge-related encryption/decryption flows)

High-signal workflow:

1. Open `/sites` and confirm list loads.
2. Open one site detail page.
3. Trigger heartbeat/health refresh actions from the UI path you changed.
4. Confirm status/meta updates are reflected after refetch/poll.
5. If bridge data fails, check function logs for missing `ENCRYPTION_KEY` first.

### C. Library

Key route:

- `/library`

Key code:

- `src/views/library/index.tsx`
- `src/hooks/useLibrary.ts`
- `src/hooks/useLibraryCategories.ts`
- `src/hooks/useLibraryFamiliesAndCollections.ts`
- `functions/zip-parser`

High-signal workflow:

1. Open `/library`.
2. Test only affected flows: search/filter, categories, families, collections, or add/import/upload path.
3. Confirm list refresh and detail state after mutation.

### D. Admin settings (including auth flags)

Key routes:

- `/admin`
- `/admin/settings`

Key code:

- `src/views/admin/settings/index.tsx`
- `src/domains/admin/usePlatformSettings.ts`
- `functions/manage-settings`
- `functions/public-auth-config`

High-signal workflow:

1. Sign in as admin user.
2. Open `/admin/settings`.
3. Update relevant setting.
4. Verify save success and reload persistence.
5. Verify downstream consumer page (for auth flags, re-check `/login`).

### E. Billing + Stripe

Key routes:

- `/profile?tab=subscription`
- `/admin/finance/*`

Key code:

- `src/domains/billing/hooks.ts`
- `src/integrations/stripe/*`
- `functions/stripe-*`

Function env usually required:

- `STRIPE_SECRET_KEY`
- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`

Frontend env:

- `STRIPE_PUBLISHABLE_KEY`

High-signal workflow:

1. Open subscription UI.
2. Validate plan list and current subscription state.
3. Validate only impacted actions (checkout/session creation, payment methods, invoices, cancellation, admin finance actions).
4. Confirm function response handling and user-facing error messaging.

### F. Support + communication surfaces

Key areas:

- Tickets (`functions/tickets`, `src/domains/tickets/hooks.ts`)
- Notifications (`functions/notifications`, `src/domains/notifications/hooks.ts`)
- Forum (`functions/forum`, `src/domains/forum/hooks.ts`)
- Conversations/messages (`src/domains/messages/hooks.ts`)

High-signal workflow:

1. Open the affected UI surface.
2. Execute one create/update action and one read/list action.
3. Confirm query invalidation refreshed the changed data.

## 5) Common failure patterns (check these first)

- `401` on function execution during auth flows: session can be MFA-pending; verify guest-execution paths where expected.
- Admin-only actions returning forbidden: confirm user is in admin team/labels.
- Bridge/site functions failing unexpectedly: verify `ENCRYPTION_KEY` exists and is consistent across related functions.
- Billing screens partially load: verify both client publishable key and server `STRIPE_SECRET_KEY`.

## 6) How to keep this skill updated

Whenever you discover a new testing trick or runbook fix:

1. Add it under the relevant area section (A-F), not a random notes dump.
2. Keep each addition in this format:
   - **Symptom**
   - **Root cause**
   - **Fastest fix**
   - **How to verify**
3. Prefer concrete route/file/function references over generic advice.
4. Remove stale guidance when behavior changes (do not keep conflicting instructions).

That keeps this skill short, practical, and immediately usable by the next Cloud agent.
