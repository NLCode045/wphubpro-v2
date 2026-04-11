import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

function json(res: ServerResponse, data: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function notFound(res: ServerResponse, message: string) {
  json(res, { error: 'stripe_api_dev_mock', message }, 404);
}

/**
 * When `VITE_STRIPE_ADMIN_DEV_MOCK` is `1` or `true`, handle `/api/stripe/*` in dev **before** the Vite
 * proxy (`/api` → `api.wphub.pro`). Without this, legacy `fetchStripeJson('/plans')` etc. hit a non-JSON
 * route and return HTML (often 401), which triggers confusing errors.
 *
 * Stubs:
 * - `/api/stripe/plans`, `/billing`, `/subscriptions` — member REST used by `hooks/usePlans` & friends
 * - `/api/stripe/admin/*` — admin REST from `stripeAdminApi.ts`
 *
 * Finance admin UIs use Appwrite `executeFunction` (not these URLs). Enable this mock only for local
 * JSON stubs, or add `http://localhost:5173` under Appwrite Platforms for real API + Functions.
 */
export function stripeAdminDevMockPlugin(enabled: boolean): Plugin {
  return {
    name: 'stripe-api-dev-mock',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      if (!enabled) return;

      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const raw = req.url?.split('?')[0] ?? '';
        if (!raw.startsWith('/api/stripe')) {
          next();
          return;
        }

        const method = req.method ?? 'GET';

        /** Legacy member REST (`src/hooks/usePlans.ts`, `useInvoices.ts`, `useSubscription.ts`). */
        if (method === 'GET' && raw === '/api/stripe/plans') {
          json(res, { plans: [] });
          return;
        }
        if (method === 'GET' && raw.startsWith('/api/stripe/billing')) {
          json(res, { invoices: [] });
          return;
        }
        if (raw === '/api/stripe/subscriptions') {
          if (method === 'GET') {
            json(res, { subscriptions: [] });
            return;
          }
          if (method === 'POST') {
            json(res, { success: true, subscription: { id: 'sub_dev_mock', status: 'active' } });
            return;
          }
        }

        if (!raw.startsWith('/api/stripe/admin')) {
          notFound(res, `No dev mock for ${method} ${raw}. Add a handler in vite/stripeAdminDevMockPlugin.ts`);
          return;
        }

        if (method === 'GET' && raw === '/api/stripe/admin/stats') {
          json(res, {
            mrrCents: 0,
            activeSubscriptionCount: 0,
            currency: 'eur',
            livePayments24h: 0,
            totalSubscriptions: 0,
          });
          return;
        }

        if (method === 'GET' && raw === '/api/stripe/admin/subscriptions') {
          json(res, { subscriptions: [] });
          return;
        }

        const subDetail = raw.match(/^\/api\/stripe\/admin\/subscriptions\/([^/]+)$/);
        if (method === 'GET' && subDetail) {
          json(res, {
            subscription: { id: subDetail[1], status: 'active', items: { data: [] } },
            customer: null,
          });
          return;
        }

        const subAction = raw.match(/^\/api\/stripe\/admin\/subscriptions\/([^/]+)\/actions$/);
        if (method === 'POST' && subAction) {
          json(res, { subscription: { id: subAction[1], status: 'canceled' } });
          return;
        }

        if (method === 'GET' && raw === '/api/stripe/admin/plans') {
          json(res, { catalog: [] });
          return;
        }

        if (method === 'POST' && raw === '/api/stripe/admin/plans/products') {
          json(res, { product: { id: 'prod_dev_mock', name: 'Mock', active: true } });
          return;
        }

        const patchProduct = raw.match(/^\/api\/stripe\/admin\/plans\/products\/([^/]+)$/);
        if (method === 'PATCH' && patchProduct) {
          json(res, { product: { id: patchProduct[1], active: true } });
          return;
        }

        if (method === 'POST' && raw === '/api/stripe/admin/plans/prices') {
          json(res, { price: { id: 'price_dev_mock', active: true } });
          return;
        }

        if (method === 'GET' && raw === '/api/stripe/admin/billing') {
          json(res, { recentInvoices: [], failedPayments: [] });
          return;
        }

        const invDetail = raw.match(/^\/api\/stripe\/admin\/billing\/invoices\/([^/]+)$/);
        if (method === 'GET' && invDetail) {
          json(res, {
            invoice: {
              id: invDetail[1],
              status: 'paid',
              amount_due: 0,
              amount_paid: 0,
              currency: 'eur',
              created: Math.floor(Date.now() / 1000),
            },
          });
          return;
        }

        notFound(res, `No dev mock for admin route ${method} ${raw}`);
      });
    },
  };
}
