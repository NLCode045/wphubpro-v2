/**
 * Server-only — aggregated metrics from Stripe (live). Do not import from React components.
 */
import type Stripe from 'stripe';

import type { BillingAdminStats } from '@/types/stripe';
import type { StripeAdminDashboardStats } from '@/types/stripeAdmin';

import { getStripeFromEnv } from './client';
import { getPlanDetailForAdmin, listPlansForAdmin } from './plans';
import { getSubscription } from './subscriptions';

function recurringAmountToMonthlyCents(price: Stripe.Price, quantity: number): number {
  if (price.unit_amount == null || !price.recurring) return 0;
  const line = price.unit_amount * quantity;
  switch (price.recurring.interval) {
    case 'month':
      return line;
    case 'year':
      return Math.round(line / 12);
    case 'week':
      return Math.round((line * 52) / 12);
    case 'day':
      return Math.round((line * 365) / 12);
    default:
      return line;
  }
}

function subscriptionMonthlyCents(sub: Stripe.Subscription): { cents: number; currency?: string } {
  let cents = 0;
  let currency: string | undefined;
  for (const item of sub.items.data) {
    const price = item.price;
    if (!price) continue;
    currency = price.currency;
    cents += recurringAmountToMonthlyCents(price, item.quantity ?? 1);
  }
  return { cents, currency };
}

function addMonthlyFromSubscription(mrr: { total: number; currency?: string }, sub: Stripe.Subscription): void {
  const row = subscriptionMonthlyCents(sub);
  mrr.total += row.cents;
  if (!mrr.currency && row.currency) mrr.currency = row.currency;
}

/**
 * GET: MRR (approximate, normalized to monthly) and active subscription count from Stripe.
 */
export async function getBillingAdminStats(): Promise<BillingAdminStats> {
  const stripe = getStripeFromEnv();
  const mrr = { total: 0, currency: undefined as string | undefined };
  let activeSubscriptionCount = 0;

  for await (const sub of stripe.subscriptions.list({
    status: 'active',
    limit: 100,
    expand: ['data.items.data.price'],
  })) {
    activeSubscriptionCount += 1;
    addMonthlyFromSubscription(mrr, sub);
  }

  return {
    mrrCents: mrr.total,
    activeSubscriptionCount,
    currency: (mrr.currency ?? 'usd').toLowerCase(),
  };
}

/**
 * Dashboard KPIs + live payment volume (24h) + total subscription count (capped).
 */
export async function getStripeAdminDashboardStats(): Promise<StripeAdminDashboardStats> {
  const base = await getBillingAdminStats();
  const stripe = getStripeFromEnv();
  const gte = Math.floor(Date.now() / 1000) - 86400;
  let livePayments24h = 0;
  for await (const pi of stripe.paymentIntents.list({ limit: 100, created: { gte } })) {
    if (pi.status === 'succeeded') livePayments24h += 1;
  }

  let totalSubscriptions = 0;
  const MAX_TOTAL = 1000;
  for await (const _ of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
    totalSubscriptions += 1;
    if (totalSubscriptions >= MAX_TOTAL) break;
  }

  return {
    ...base,
    livePayments24h,
    totalSubscriptions,
  };
}

const MAX_SUB_LIST = 500;

export async function listStripeSubscriptionsForAdmin(): Promise<{ subscriptions: import('stripe').Stripe.Subscription[] }> {
  const stripe = getStripeFromEnv();
  const subscriptions: import('stripe').Stripe.Subscription[] = [];
  for await (const sub of stripe.subscriptions.list({
    status: 'all',
    limit: 100,
    expand: ['data.customer', 'data.items.data.price.product'],
  })) {
    subscriptions.push(sub);
    if (subscriptions.length >= MAX_SUB_LIST) break;
  }
  return { subscriptions };
}

export async function getStripeSubscriptionForAdmin(
  subscriptionId: string,
): Promise<{ subscription: import('stripe').Stripe.Subscription; customer: import('stripe').Stripe.Customer | null }> {
  /** Single retrieve path — `subscriptions.ts#getSubscription` (expand + server-only Stripe). */
  const subscription = await getSubscription(subscriptionId);
  const cust = subscription.customer;
  let customer: import('stripe').Stripe.Customer | null = null;
  if (typeof cust === 'string') {
    const stripe = getStripeFromEnv();
    const c = await stripe.customers.retrieve(cust);
    customer = 'deleted' in c && c.deleted ? null : c;
  } else if (cust && !('deleted' in cust && cust.deleted)) {
    customer = cust;
  }
  return { subscription, customer };
}

export async function runStripeSubscriptionAdminAction(
  subscriptionId: string,
  action: 'cancel' | 'pause' | 'resume',
  options?: { cancelAtPeriodEnd?: boolean },
): Promise<import('stripe').Stripe.Subscription> {
  const stripe = getStripeFromEnv();
  if (action === 'cancel') {
    if (options?.cancelAtPeriodEnd === true) {
      return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    }
    return stripe.subscriptions.cancel(subscriptionId);
  }
  if (action === 'pause') {
    return stripe.subscriptions.update(subscriptionId, {
      pause_collection: { behavior: 'mark_uncollectible' },
    });
  }
  return stripe.subscriptions.update(subscriptionId, { pause_collection: null });
}

/** Admin finance plan list — delegates to `plans.ts` (`listPlansForAdmin`). */
export async function getStripeAdminCatalogPlans() {
  return listPlansForAdmin({
    activeOnly: false,
    excludeHidden: false,
    excludeNonSellable: false,
    includeCounts: true,
  });
}

export async function getStripeAdminCatalogPlanDetail(productId: string) {
  return getPlanDetailForAdmin(productId);
}

export async function listProductsAndPricesForAdmin(): Promise<{
  catalog: Array<{ product: import('stripe').Stripe.Product; prices: import('stripe').Stripe.Price[] }>;
}> {
  const stripe = getStripeFromEnv();
  const products = await stripe.products.list({ limit: 100 });
  const catalog: Array<{ product: import('stripe').Stripe.Product; prices: import('stripe').Stripe.Price[] }> = [];
  for (const product of products.data) {
    const prices = await stripe.prices.list({ product: product.id, limit: 100, active: true });
    catalog.push({ product, prices: prices.data });
  }
  return { catalog };
}

export async function createStripeProductAdmin(params: {
  name: string;
  description?: string;
}): Promise<import('stripe').Stripe.Product> {
  const stripe = getStripeFromEnv();
  return stripe.products.create({ name: params.name, description: params.description });
}

export async function updateStripeProductAdmin(
  productId: string,
  params: { name?: string; description?: string; active?: boolean },
): Promise<import('stripe').Stripe.Product> {
  const stripe = getStripeFromEnv();
  return stripe.products.update(productId, params);
}

export async function createStripePriceAdmin(params: {
  productId: string;
  unit_amount: number;
  currency: string;
  interval: 'month' | 'year' | 'week' | 'day';
}): Promise<import('stripe').Stripe.Price> {
  const stripe = getStripeFromEnv();
  return stripe.prices.create({
    product: params.productId,
    unit_amount: params.unit_amount,
    currency: params.currency,
    recurring: { interval: params.interval },
  });
}

export async function getStripeAdminBillingOverview(): Promise<{
  recentInvoices: import('stripe').Stripe.Invoice[];
  failedPayments: import('stripe').Stripe.PaymentIntent[];
}> {
  const stripe = getStripeFromEnv();
  const recentInvoices = await stripe.invoices.list({
    limit: 40,
    expand: ['data.customer', 'data.lines.data.price.product'],
  });
  const failed: import('stripe').Stripe.PaymentIntent[] = [];
  for await (const pi of stripe.paymentIntents.list({ limit: 50 })) {
    if (pi.last_payment_error || pi.status === 'requires_payment_method') {
      failed.push(pi);
    }
    if (failed.length >= 20) break;
  }
  return { recentInvoices: recentInvoices.data, failedPayments: failed };
}

export async function getStripeInvoiceForAdmin(invoiceId: string): Promise<import('stripe').Stripe.Invoice> {
  const stripe = getStripeFromEnv();
  return stripe.invoices.retrieve(invoiceId, {
    expand: ['customer', 'payment_intent', 'lines.data.price.product'],
  });
}
