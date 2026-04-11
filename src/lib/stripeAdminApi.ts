/**
 * Client calls to `/api/stripe/admin/*` (secured server-side). Uses session cookies / JWT per your API gateway.
 *
 * Expected server mapping (implement in your API layer; see `src/api/stripe/admin.ts`):
 * - `GET .../stats` → `getStripeAdminDashboardStats`
 * - `GET .../subscriptions` → `listStripeSubscriptionsForAdmin`
 * - `GET .../subscriptions/:id` → `getStripeSubscriptionForAdmin`
 * - `POST .../subscriptions/:id/actions` body `{ action: 'cancel'|'pause'|'resume' }` → `runStripeSubscriptionAdminAction`
 * - `GET .../plans` → `listProductsAndPricesForAdmin`
 * - `POST .../plans/products` → `createStripeProductAdmin`
 * - `PATCH .../plans/products/:productId` → `updateStripeProductAdmin`
 * - `POST .../plans/prices` → `createStripePriceAdmin`
 * - `GET .../billing` → `getStripeAdminBillingOverview`
 * - `GET .../billing/invoices/:invoiceId` → `getStripeInvoiceForAdmin`
 */
import { fetchStripeJson, patchStripeJson, postStripeJson } from '@/lib/stripe-loader';
import type {
  AdminBillingOverviewPayload,
  AdminPlansCatalogPayload,
  StripeAdminDashboardStats,
} from '@/types/stripeAdmin';

/**
 * Paths are relative to `STRIPE_API_BASE` (`/api/stripe` in `stripe-loader.ts`).
 * Do not prefix with `/api/stripe` here — that would double the path (e.g. `/api/stripe/api/stripe/admin/...`).
 */
const A = '/admin' as const;

export function fetchAdminStats() {
  return fetchStripeJson<StripeAdminDashboardStats>(`${A}/stats`);
}

export function fetchAdminSubscriptions() {
  return fetchStripeJson<{ subscriptions: Record<string, unknown>[] }>(`${A}/subscriptions`);
}

export function fetchAdminSubscription(subscriptionId: string) {
  return fetchStripeJson<{ subscription: Record<string, unknown>; customer: Record<string, unknown> | null }>(
    `${A}/subscriptions/${encodeURIComponent(subscriptionId)}`,
  );
}

export function postAdminSubscriptionAction(subscriptionId: string, body: { action: 'cancel' | 'pause' | 'resume' }) {
  return postStripeJson<{ subscription: Record<string, unknown> }>(
    `${A}/subscriptions/${encodeURIComponent(subscriptionId)}/actions`,
    body,
  );
}

export function fetchAdminPlansCatalog() {
  return fetchStripeJson<AdminPlansCatalogPayload>(`${A}/plans`);
}

export function postAdminCreateProduct(body: { name: string; description?: string }) {
  return postStripeJson<{ product: Record<string, unknown> }>(`${A}/plans/products`, body);
}

export function patchAdminProduct(productId: string, body: { name?: string; description?: string; active?: boolean }) {
  return patchStripeJson<{ product: Record<string, unknown> }>(
    `${A}/plans/products/${encodeURIComponent(productId)}`,
    body,
  );
}

export function postAdminCreatePrice(body: {
  productId: string;
  unit_amount: number;
  currency: string;
  interval: 'month' | 'year' | 'week' | 'day';
}) {
  return postStripeJson<{ price: Record<string, unknown> }>(`${A}/plans/prices`, body);
}

export function fetchAdminBillingOverview() {
  return fetchStripeJson<AdminBillingOverviewPayload>(`${A}/billing`);
}

export function fetchAdminInvoice(invoiceId: string) {
  return fetchStripeJson<{ invoice: Record<string, unknown> }>(
    `${A}/billing/invoices/${encodeURIComponent(invoiceId)}`,
  );
}
