/**
 * Server-only — aggregated metrics from Stripe (live). Do not import from React components.
 */
import type {
  BillingAdminStats,
  StripeCustomer,
  StripeInvoice,
  StripePaymentIntent,
  StripePrice,
  StripeProduct,
  StripeSubscription,
} from '@/types/stripe';
import type { StripeAdminDashboardStats } from '@/types/stripeAdmin';

import { getStripeFromEnv } from './client';
import { getPlanDetailForAdmin, listPlansForAdmin } from './plans';
import { getSubscription } from './subscriptions';

function recurringAmountToMonthlyCents(price: StripePrice, quantity: number): number {
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

function subscriptionMonthlyCents(sub: StripeSubscription): { cents: number; currency?: string } {
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

function addMonthlyFromSubscription(mrr: { total: number; currency?: string }, sub: StripeSubscription): void {
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
 * Dashboard KPIs + live payment volume (24h) + subscription totals + failed-PI + 30d invoice revenue.
 * Served at `GET /api/stripe/admin/stats` (Stripe secret on API host only — not Appwrite).
 */
export async function getStripeAdminDashboardStats(): Promise<StripeAdminDashboardStats> {
  const base = await getBillingAdminStats();
  const stripe = getStripeFromEnv();
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;

  let livePayments24h = 0;
  let piCursor: string | undefined;
  for (let p = 0; p < 5; p++) {
    const piPage24h = await stripe.paymentIntents.list({
      limit: 100,
      created: { gte: dayAgo },
      starting_after: piCursor,
    });
    for (const pi of piPage24h.data) {
      if (pi.status === 'succeeded') livePayments24h += 1;
    }
    if (!piPage24h.has_more || piPage24h.data.length === 0) break;
    piCursor = piPage24h.data[piPage24h.data.length - 1].id;
  }

  let totalSubscriptions = 0;
  let subCursor: string | undefined;
  for (let p = 0; p < 15; p++) {
    const subPage = await stripe.subscriptions.list({
      status: 'all',
      limit: 100,
      starting_after: subCursor,
    });
    totalSubscriptions += subPage.data.length;
    if (!subPage.has_more || subPage.data.length === 0) break;
    subCursor = subPage.data[subPage.data.length - 1].id;
  }

  const sevenDaysAgo = now - 7 * 86400;
  let recentFailedPaymentIntents7d = 0;
  let failedPiCursor: string | undefined;
  for (let p = 0; p < 5; p++) {
    const failedPiPage = await stripe.paymentIntents.list({
      limit: 100,
      created: { gte: sevenDaysAgo },
      starting_after: failedPiCursor,
    });
    for (const pi of failedPiPage.data) {
      if (pi.last_payment_error || pi.status === 'requires_payment_method') recentFailedPaymentIntents7d += 1;
    }
    if (!failedPiPage.has_more || failedPiPage.data.length === 0) break;
    failedPiCursor = failedPiPage.data[failedPiPage.data.length - 1].id;
  }

  const thirtyDaysAgo = now - 30 * 86400;
  let revenueFromLast30PaidInvoicesCents = 0;
  let invCursor: string | undefined;
  for (let p = 0; p < 10; p++) {
    const paidInvPage = await stripe.invoices.list({
      status: 'paid',
      created: { gte: thirtyDaysAgo },
      limit: 100,
      starting_after: invCursor,
    });
    for (const inv of paidInvPage.data) {
      revenueFromLast30PaidInvoicesCents += inv.amount_paid ?? 0;
    }
    if (!paidInvPage.has_more || paidInvPage.data.length === 0) break;
    invCursor = paidInvPage.data[paidInvPage.data.length - 1].id;
  }

  return {
    ...base,
    livePayments24h,
    totalSubscriptions,
    recentFailedPaymentIntents7d,
    revenueFromLast30PaidInvoicesCents,
  };
}

const MAX_SUB_LIST = 500;

export async function listStripeSubscriptionsForAdmin(): Promise<{ subscriptions: StripeSubscription[] }> {
  const stripe = getStripeFromEnv();
  const subscriptions: StripeSubscription[] = [];
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
): Promise<{ subscription: StripeSubscription; customer: StripeCustomer | null }> {
  /** Single retrieve path — `subscriptions.ts#getSubscription` (expand + server-only Stripe). */
  const subscription = await getSubscription(subscriptionId);
  const cust = subscription.customer;
  let customer: StripeCustomer | null = null;
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
): Promise<StripeSubscription> {
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
  catalog: Array<{ product: StripeProduct; prices: StripePrice[] }>;
}> {
  const stripe = getStripeFromEnv();
  const products = await stripe.products.list({ limit: 100 });
  const catalog: Array<{ product: StripeProduct; prices: StripePrice[] }> = [];
  for (const product of products.data) {
    const prices = await stripe.prices.list({ product: product.id, limit: 100, active: true });
    catalog.push({ product, prices: prices.data });
  }
  return { catalog };
}

export async function createStripeProductAdmin(params: {
  name: string;
  description?: string;
}): Promise<StripeProduct> {
  const stripe = getStripeFromEnv();
  return stripe.products.create({ name: params.name, description: params.description });
}

export async function updateStripeProductAdmin(
  productId: string,
  params: { name?: string; description?: string; active?: boolean },
): Promise<StripeProduct> {
  const stripe = getStripeFromEnv();
  return stripe.products.update(productId, params);
}

export async function createStripePriceAdmin(params: {
  productId: string;
  unit_amount: number;
  currency: string;
  interval: 'month' | 'year' | 'week' | 'day';
}): Promise<StripePrice> {
  const stripe = getStripeFromEnv();
  return stripe.prices.create({
    product: params.productId,
    unit_amount: params.unit_amount,
    currency: params.currency,
    recurring: { interval: params.interval },
  });
}

export async function getStripeAdminBillingOverview(): Promise<{
  recentInvoices: StripeInvoice[];
  failedPayments: StripePaymentIntent[];
}> {
  const stripe = getStripeFromEnv();
  const recentInvoices = await stripe.invoices.list({
    limit: 40,
    expand: ['data.customer', 'data.lines.data.price.product'],
  });
  const failed: StripePaymentIntent[] = [];
  for await (const pi of stripe.paymentIntents.list({ limit: 50 })) {
    if (pi.last_payment_error || pi.status === 'requires_payment_method') {
      failed.push(pi);
    }
    if (failed.length >= 20) break;
  }
  return { recentInvoices: recentInvoices.data, failedPayments: failed };
}

export async function getStripeInvoiceForAdmin(invoiceId: string): Promise<StripeInvoice> {
  const stripe = getStripeFromEnv();
  return stripe.invoices.retrieve(invoiceId, {
    expand: ['customer', 'payment_intent', 'lines.data.price.product'],
  });
}

export async function listAdminInvoicesRecent(limit: number): Promise<{ invoices: StripeInvoice[] }> {
  const stripe = getStripeFromEnv();
  const lim = Math.min(Math.max(limit, 1), 100);
  const list = await stripe.invoices.list({
    limit: lim,
    expand: ['data.customer', 'data.lines.data.price.product'],
  });
  return { invoices: list.data };
}

export { getAdminFinanceDashboard } from './financeDashboard';
export { listAdminSubscriptionRows } from './adminSubscriptionList';
export { listAdminPaymentIntentRows, getAdminPaymentIntentDetail } from './adminPaymentIntents';
export {
  adminCancelSubscription,
  adminPauseSubscription,
  adminResumeSubscription,
  adminArchiveSubscription,
  adminUpdateSubscriptionPrice,
} from './adminSubscriptionActions';
export {
  updateAdminPlanProduct,
  setAdminProductActive,
  setAdminPriceActive,
  createAdminPriceForProduct,
} from './plans';
