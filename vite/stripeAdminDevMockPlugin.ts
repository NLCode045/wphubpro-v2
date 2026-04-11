import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

function json(res: ServerResponse, data: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function notFound(res: ServerResponse) {
  json(res, { error: 'stripe_admin_dev_mock', message: 'Route not mocked; add handler in vite/stripeAdminDevMockPlugin.ts' }, 404);
}

/**
 * When `VITE_STRIPE_ADMIN_DEV_MOCK` is set, short-circuit `/api/stripe/admin/*` so the SPA gets JSON
 * instead of HTML (e.g. Appwrite/router fallback) during `npm run dev`.
 */
export function stripeAdminDevMockPlugin(enabled: boolean): Plugin {
  return {
    name: 'stripe-admin-dev-mock',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      if (!enabled) return;

      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const raw = req.url?.split('?')[0] ?? '';
        if (!raw.startsWith('/api/stripe/admin')) {
          next();
          return;
        }

        const method = req.method ?? 'GET';

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

        notFound(res);
      });
    },
  };
}
