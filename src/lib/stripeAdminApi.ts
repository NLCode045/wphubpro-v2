/**
 * Client calls to `/api/stripe/admin/*` (secured server-side). Uses session cookies / JWT per your API gateway.
 */
import { fetchStripeJson, patchStripeJson, postStripeJson } from '@/lib/stripe-loader';
import type {
  AdminBillingOverviewPayload,
  AdminPlansCatalogPayload,
  StripeAdminDashboardStats,
} from '@/types/stripeAdmin';

const BASE = '/api/stripe/admin' as const;

export function fetchAdminStats() {
  return fetchStripeJson<StripeAdminDashboardStats>(`${BASE}/stats`);
}

export function fetchAdminSubscriptions() {
  return fetchStripeJson<{ subscriptions: Record<string, unknown>[] }>(`${BASE}/subscriptions`);
}

export function fetchAdminSubscription(subscriptionId: string) {
  return fetchStripeJson<{ subscription: Record<string, unknown>; customer: Record<string, unknown> | null }>(
    `${BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`,
  );
}

export function postAdminSubscriptionAction(subscriptionId: string, body: { action: 'cancel' | 'pause' | 'resume' }) {
  return postStripeJson<{ subscription: Record<string, unknown> }>(
    `${BASE}/subscriptions/${encodeURIComponent(subscriptionId)}/actions`,
    body,
  );
}

export function fetchAdminPlansCatalog() {
  return fetchStripeJson<AdminPlansCatalogPayload>(`${BASE}/plans`);
}

export function postAdminCreateProduct(body: { name: string; description?: string }) {
  return postStripeJson<{ product: Record<string, unknown> }>(`${BASE}/plans/products`, body);
}

export function patchAdminProduct(productId: string, body: { name?: string; description?: string; active?: boolean }) {
  return patchStripeJson<{ product: Record<string, unknown> }>(
    `${BASE}/plans/products/${encodeURIComponent(productId)}`,
    body,
  );
}

export function postAdminCreatePrice(body: {
  productId: string;
  unit_amount: number;
  currency: string;
  interval: 'month' | 'year' | 'week' | 'day';
}) {
  return postStripeJson<{ price: Record<string, unknown> }>(`${BASE}/plans/prices`, body);
}

export function fetchAdminBillingOverview() {
  return fetchStripeJson<AdminBillingOverviewPayload>(`${BASE}/billing`);
}

export function fetchAdminInvoice(invoiceId: string) {
  return fetchStripeJson<{ invoice: Record<string, unknown> }>(
    `${BASE}/billing/invoices/${encodeURIComponent(invoiceId)}`,
  );
}
