import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer | string) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

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
 * Plan list/detail also use `/api/stripe/admin/plans/catalog` (`src/api/stripe/plans.ts` on the server).
 * Enable this mock only for local
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
          const sid = subDetail[1];
          const now = Math.floor(Date.now() / 1000);
          json(res, {
            subscription: {
              id: sid,
              status: 'active',
              cancel_at_period_end: false,
              current_period_start: now - 86400 * 10,
              current_period_end: now + 86400 * 20,
              trial_end: null,
              canceled_at: null,
              collection_method: 'charge_automatically',
              currency: 'eur',
              items: {
                data: [
                  {
                    id: 'si_dev_mock',
                    quantity: 1,
                    price: {
                      id: 'price_dev_mock',
                      unit_amount: 2900,
                      currency: 'eur',
                      recurring: { interval: 'month', interval_count: 1 },
                      product: { id: 'prod_dev_mock', name: 'Pro (dev mock)' },
                    },
                  },
                ],
              },
              latest_invoice: {
                id: 'in_dev_mock',
                status: 'paid',
                total: 2900,
                currency: 'eur',
                hosted_invoice_url: 'https://dashboard.stripe.com/test/invoices/in_dev_mock',
              },
              default_payment_method: {
                type: 'card',
                card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
              },
              metadata: { env: 'vite-dev-mock' },
            },
            customer: {
              id: 'cus_dev_mock',
              email: 'customer@example.com',
              name: 'Dev Customer',
              phone: null,
              balance: 0,
              currency: 'eur',
              address: { line1: '1 Test St', city: 'Amsterdam', country: 'NL' },
            },
          });
          return;
        }

        const subAction = raw.match(/^\/api\/stripe\/admin\/subscriptions\/([^/]+)\/actions$/);
        if (method === 'POST' && subAction) {
          const sid = subAction[1];
          void readJsonBody(req)
            .then((body) => {
              const action = String(body.action ?? '').toLowerCase();
              const atPeriodEnd = body.atPeriodEnd === true;
              if (action === 'cancel') {
                if (atPeriodEnd) {
                  json(res, {
                    subscription: {
                      id: sid,
                      status: 'active',
                      cancel_at_period_end: true,
                      current_period_end: Math.floor(Date.now() / 1000) + 86400 * 5,
                    },
                  });
                } else {
                  json(res, {
                    subscription: { id: sid, status: 'canceled', cancel_at_period_end: false },
                  });
                }
                return;
              }
              if (action === 'pause') {
                json(res, {
                  subscription: {
                    id: sid,
                    status: 'active',
                    pause_collection: { behavior: 'mark_uncollectible' },
                  },
                });
                return;
              }
              if (action === 'resume') {
                json(res, {
                  subscription: { id: sid, status: 'active', pause_collection: null },
                });
                return;
              }
              json(res, { error: 'stripe_api_dev_mock', message: `Unknown action: ${action}` }, 400);
            })
            .catch(() => {
              json(res, { error: 'stripe_api_dev_mock', message: 'Invalid JSON body' }, 400);
            });
          return;
        }

        if (method === 'GET' && raw === '/api/stripe/admin/plans/catalog') {
          json(res, { plans: [], subscriptionCountsTruncated: false });
          return;
        }

        const planCatalogDetail = raw.match(/^\/api\/stripe\/admin\/plans\/catalog\/([^/]+)$/);
        if (method === 'GET' && planCatalogDetail) {
          const id = planCatalogDetail[1];
          json(res, {
            plan: {
              id,
              name: 'Mock plan',
              description: '',
              status: 'active',
              monthlyPrice: 0,
              yearlyPrice: 0,
              monthlyPriceId: null,
              yearlyPriceId: null,
              currency: 'eur',
              metadata: [],
              stripeLink: `https://dashboard.stripe.com/products/${encodeURIComponent(id)}`,
            },
            stats: {
              totalSubscriptions: 0,
              subscriptionsMonthly: 0,
              subscriptionsYearly: 0,
              totalEarnings: 0,
              upgradedTo: 0,
              downgradedTo: 0,
              downgradedFrom: 0,
            },
            subscribers: [],
          });
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
