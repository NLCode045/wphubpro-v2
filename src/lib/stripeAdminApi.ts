/**
 * Client calls to `/api/stripe/admin/*` (secured server-side). Uses session cookies / JWT per your API gateway.
 *
 * Expected server mapping (implement in your API layer; see `src/api/stripe/admin.ts`):
 * - `GET .../stats` → `getStripeAdminDashboardStats`
 * - `GET .../subscriptions` → `listStripeSubscriptionsForAdmin`
 * - `GET .../subscriptions/:id` → `getStripeSubscriptionForAdmin`
 * - `POST .../subscriptions/:id/actions` body `{ action, atPeriodEnd?: boolean }` (`cancel` + `atPeriodEnd: true` = end of period) → `runStripeSubscriptionAdminAction`
 * - `GET .../plans` → `listProductsAndPricesForAdmin`
 * - `GET .../plans/catalog` → `getStripeAdminCatalogPlans` (`src/api/stripe/plans.ts`)
 * - `GET .../plans/catalog/:productId` → `getStripeAdminCatalogPlanDetail` (`plans.ts`)
 * - `POST .../plans/products` → `createStripeProductAdmin`
 * - `PATCH .../plans/products/:productId` → `updateStripeProductAdmin`
 * - `POST .../plans/prices` → `createStripePriceAdmin`
 * - `GET .../billing` → `getStripeAdminBillingOverview`
 * - `GET .../billing/invoices/:invoiceId` → `getStripeInvoiceForAdmin`
 * - `GET .../finance-dashboard?period=` → `getAdminFinanceDashboard`
 * - `GET .../subscription-rows?...` → `listAdminSubscriptionRows`
 * - `GET .../payment-intents?...` → `listAdminPaymentIntentRows`
 * - `GET .../payment-intents/:id` → `getAdminPaymentIntentDetail`
 * - `GET .../invoices/recent?limit=` → `listAdminInvoicesRecent`
 * - `POST .../subscriptions/:id/cancel|pause|resume` → `adminCancelSubscription` / `adminPauseSubscription` / `adminResumeSubscription`
 * - `POST .../subscriptions/:id/change-price` → `adminUpdateSubscriptionPrice`
 * - `POST .../plans/catalog-metadata` → `updateAdminPlanProduct`
 * - `POST .../plans/product-active` → `setAdminProductActive`
 * - `POST .../plans/price-active` → `setAdminPriceActive`
 * - `POST .../plans/prices-major` → `createAdminPriceForProduct` (amount in major currency units)
 */
import type { AdminPlanDetailPayload } from '@/api/stripe/plans';
import type {
  AdminFinanceDashboardResponse,
  AdminPaymentIntentDetail,
  AdminPaymentIntentRow,
  AdminSubscriptionRow,
  FinanceDashboardPeriod,
} from '@/domains/admin/finance/types';
import { fetchStripeJson, patchStripeJson, postStripeJson } from '@/lib/stripe-loader';
import type {
  AdminBillingOverviewPayload,
  AdminPlansCatalogListPayload,
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

export function postAdminSubscriptionAction(
  subscriptionId: string,
  body: { action: 'cancel' | 'pause' | 'resume'; atPeriodEnd?: boolean },
) {
  return postStripeJson<{ subscription: Record<string, unknown> }>(
    `${A}/subscriptions/${encodeURIComponent(subscriptionId)}/actions`,
    body,
  );
}

export function fetchAdminPlansCatalog() {
  return fetchStripeJson<AdminPlansCatalogPayload>(`${A}/plans`);
}

export function fetchAdminCatalogPlans() {
  return fetchStripeJson<AdminPlansCatalogListPayload>(`${A}/plans/catalog`);
}

export function fetchAdminCatalogPlanDetail(productId: string) {
  return fetchStripeJson<AdminPlanDetailPayload>(
    `${A}/plans/catalog/${encodeURIComponent(productId)}`,
  );
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

export function fetchAdminFinanceDashboard(period: FinanceDashboardPeriod) {
  const q = new URLSearchParams({ period });
  return fetchStripeJson<AdminFinanceDashboardResponse>(`${A}/finance-dashboard?${q.toString()}`);
}

export function fetchAdminSubscriptionRows(params: {
  status?: string;
  productId?: string;
  priceId?: string;
  search?: string;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  maxPages?: number;
}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    q.set(k, String(v));
  }
  const qs = q.toString();
  return fetchStripeJson<{ subscriptions: AdminSubscriptionRow[]; fetchedPages: number }>(
    `${A}/subscription-rows${qs ? `?${qs}` : ''}`,
  );
}

export function fetchAdminPaymentIntents(params: { limit?: number; customer?: string; status?: string }) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    q.set(k, String(v));
  }
  const qs = q.toString();
  return fetchStripeJson<{ orders: AdminPaymentIntentRow[] }>(
    `${A}/payment-intents${qs ? `?${qs}` : ''}`,
  );
}

export function fetchAdminPaymentIntentDetail(paymentIntentId: string) {
  return fetchStripeJson<AdminPaymentIntentDetail>(
    `${A}/payment-intents/${encodeURIComponent(paymentIntentId)}`,
  );
}

export function fetchAdminInvoicesRecent(limit: number) {
  const q = new URLSearchParams({ limit: String(limit) });
  return fetchStripeJson<{ invoices: Record<string, unknown>[] }>(`${A}/invoices/recent?${q.toString()}`);
}

export function postAdminSubscriptionCancel(
  subscriptionId: string,
  body: { immediate?: boolean } = {},
) {
  return postStripeJson<{ success: boolean }>(
    `${A}/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    body,
  );
}

export function postAdminSubscriptionPause(
  subscriptionId: string,
  body: { behavior?: 'void' | 'mark_uncollectible' } = {},
) {
  return postStripeJson<{ success: boolean }>(
    `${A}/subscriptions/${encodeURIComponent(subscriptionId)}/pause`,
    body,
  );
}

export function postAdminSubscriptionResume(subscriptionId: string) {
  return postStripeJson<{ success: boolean }>(
    `${A}/subscriptions/${encodeURIComponent(subscriptionId)}/resume`,
    {},
  );
}

export function postAdminSubscriptionChangePrice(
  subscriptionId: string,
  body: {
    newPriceId: string;
    proration_behavior?: 'always_invoice' | 'none';
    sameProductOnly?: boolean;
  },
) {
  return postStripeJson<{ success: boolean }>(
    `${A}/subscriptions/${encodeURIComponent(subscriptionId)}/change-price`,
    body,
  );
}

export function postAdminPlanCatalogMetadata(body: {
  productId: string;
  name?: string;
  description?: string;
  sites_limit?: number;
  library_limit?: number;
  storage_limit?: number;
  non_sellable?: boolean;
  hidden?: boolean;
}) {
  return postStripeJson<{ product: Record<string, unknown> }>(`${A}/plans/catalog-metadata`, body);
}

export function postAdminProductActive(body: { productId: string; active: boolean }) {
  return postStripeJson<{ product: Record<string, unknown> }>(`${A}/plans/product-active`, body);
}

export function postAdminPriceActive(body: { priceId: string; active: boolean }) {
  return postStripeJson<{ price: Record<string, unknown> }>(`${A}/plans/price-active`, body);
}

export function postAdminCreatePriceMajor(body: {
  productId: string;
  amount: number;
  interval: 'month' | 'year';
  currency?: string;
}) {
  return postStripeJson<{ price: Record<string, unknown> }>(`${A}/plans/prices-major`, {
    product_id: body.productId,
    amount: body.amount,
    interval: body.interval,
    currency: body.currency,
  });
}
