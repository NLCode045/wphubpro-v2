/**
 * Server-only — Stripe catalog (live). Do not import from React components.
 */
import type { StripePlan as AdminStripePlanRow } from '@/types';
import type { StripePlan as ProductPricePlan } from '@/types/stripe';
import type { Stripe as StripeNs } from 'stripe';

import { getStripeFromEnv } from './client';

export type AdminPlanDetailPayload = {
  plan: AdminStripePlanRow & { stripeLink: string };
  stats: {
    totalSubscriptions: number;
    subscriptionsMonthly: number;
    subscriptionsYearly: number;
    totalEarnings: number;
    upgradedTo: number;
    downgradedTo: number;
    downgradedFrom: number;
  };
  subscribers: Array<{
    subscriptionId: string;
    customerId: string;
    email: string;
    name: string;
    billingInterval: string;
    subscribedSince: number;
    status: string;
    userId?: string | null;
  }>;
};

function buildPlanFromProduct(
  product: StripeSdk.Product,
  pricesData: StripeSdk.Price[],
): AdminStripePlanRow {
  const metadata = Object.entries(product.metadata || {}).map(([key, value]) => ({
    key,
    value: String(value),
  }));

  const allPrices = pricesData.map((pr) => ({
    id: pr.id,
    amount: pr.unit_amount != null ? pr.unit_amount / 100 : 0,
    currency: pr.currency || 'eur',
    interval: pr.recurring?.interval || 'one_time',
    interval_count: pr.recurring?.interval_count || 1,
  }));

  let monthlyPrice = 0;
  let yearlyPrice = 0;
  let monthlyPriceId: string | null = null;
  let yearlyPriceId: string | null = null;
  let currency = 'eur';

  for (const pr of pricesData) {
    if (!pr.recurring) continue;
    currency = pr.currency || currency;
    const amount = pr.unit_amount != null ? pr.unit_amount / 100 : 0;
    if (pr.recurring.interval === 'month') {
      monthlyPrice = amount;
      monthlyPriceId = pr.id;
    } else if (pr.recurring.interval === 'year') {
      yearlyPrice = amount;
      yearlyPriceId = pr.id;
    }
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    status: product.active ? 'active' : 'inactive',
    monthlyPrice,
    yearlyPrice,
    monthlyPriceId,
    yearlyPriceId,
    currency,
    metadata,
    allPrices,
  };
}

async function countSubscriptionsByProduct(
  stripe: ReturnType<typeof getStripeFromEnv>,
): Promise<{
  counts: Record<string, number>;
  subscriptionCountsTruncated: boolean;
}> {
  const subIdsByProduct = new Map<string, Set<string>>();
  let subscriptionCountsTruncated = false;
  const statuses = ['active', 'trialing', 'past_due', 'paused'] as const;
  const maxPagesPerStatus = 8;

  for (const status of statuses) {
    let startingAfter: string | undefined;
    for (let page = 0; page < maxPagesPerStatus; page++) {
      const batch = await stripe.subscriptions.list({
        status,
        limit: 100,
        starting_after: startingAfter,
        expand: ['data.items.data.price'],
      });

      for (const sub of batch.data) {
        for (const item of sub.items.data) {
          const price = item.price;
          if (!price) continue;
          const pref = price.product;
          const productId = typeof pref === 'string' ? pref : pref?.id;
          if (!productId) continue;
          if (!subIdsByProduct.has(productId)) subIdsByProduct.set(productId, new Set());
          subIdsByProduct.get(productId)!.add(sub.id);
        }
      }

      if (!batch.has_more) break;
      if (batch.data.length === 0) break;
      startingAfter = batch.data[batch.data.length - 1].id;
      if (page === maxPagesPerStatus - 1 && batch.has_more) {
        subscriptionCountsTruncated = true;
      }
    }
  }

  const counts: Record<string, number> = {};
  for (const [productId, set] of subIdsByProduct.entries()) {
    counts[productId] = set.size;
  }
  return { counts, subscriptionCountsTruncated };
}

export type ListPlansForAdminOptions = {
  activeOnly: boolean;
  excludeHidden: boolean;
  excludeNonSellable: boolean;
  includeCounts: boolean;
};

/**
 * Admin finance plan table — same shape as stripe-gateway `list` + `planCatalog` (WPHub `StripePlan` rows).
 */
export async function listPlansForAdmin(
  options: ListPlansForAdminOptions,
): Promise<{ plans: AdminStripePlanRow[]; subscriptionCountsTruncated: boolean }> {
  const stripe = getStripeFromEnv();
  let subCounts: Record<string, number> | null = null;
  let subscriptionCountsTruncated = false;
  if (options.includeCounts) {
    const counted = await countSubscriptionsByProduct(stripe);
    subCounts = counted.counts;
    subscriptionCountsTruncated = counted.subscriptionCountsTruncated;
  }

  const plans: AdminStripePlanRow[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;
  const maxProductPages = 10;

  for (let pPage = 0; pPage < maxProductPages && hasMore; pPage++) {
    const params: { limit: number; active?: boolean; starting_after?: string } = { limit: 100 };
    if (options.activeOnly) params.active = true;
    if (startingAfter) params.starting_after = startingAfter;

    const batch = await stripe.products.list(params);

    for (const product of batch.data) {
      if (options.excludeHidden && product.metadata?.hidden === 'true') continue;
      if (options.excludeNonSellable && product.metadata?.non_sellable === 'true') continue;

      const priceList = await stripe.prices.list({ product: product.id, limit: 100 });
      const row = buildPlanFromProduct(product, priceList.data);
      if (options.includeCounts) {
        row.activeSubscriptionsCount = subCounts ? subCounts[product.id] ?? 0 : 0;
      }
      plans.push(row);
    }

    hasMore = batch.has_more;
    if (batch.data.length > 0) {
      startingAfter = batch.data[batch.data.length - 1].id;
    } else {
      hasMore = false;
    }
  }

  return { plans, subscriptionCountsTruncated };
}

/**
 * Admin plan detail — same as stripe-gateway `get-plan` (plan + stats + subscribers).
 */
export async function getPlanDetailForAdmin(productId: string): Promise<AdminPlanDetailPayload> {
  const stripe = getStripeFromEnv();
  const product = await stripe.products.retrieve(productId);
  const priceList = await stripe.prices.list({ product: productId, limit: 100 });
  const planBase = buildPlanFromProduct(product, priceList.data);
  const stripeLink = `https://dashboard.stripe.com/products/${encodeURIComponent(product.id)}`;
  const plan = { ...planBase, stripeLink };

  const statuses = ['active', 'trialing', 'past_due', 'paused'] as const;
  const subscribers: AdminPlanDetailPayload['subscribers'] = [];
  let subscriptionsMonthly = 0;
  let subscriptionsYearly = 0;
  let totalEarningsCents = 0;

  for (const status of statuses) {
    let startingAfter: string | undefined;
    for (let page = 0; page < 15; page++) {
      const batch = await stripe.subscriptions.list({
        status,
        limit: 100,
        starting_after: startingAfter,
        expand: ['data.customer', 'data.items.data.price'],
      });

      for (const sub of batch.data) {
        let matchInterval: string | null = null;
        let matchAmountCents = 0;

        for (const item of sub.items?.data || []) {
          const pr = item.price;
          if (!pr) continue;
          const pref = pr.product;
          const pid = typeof pref === 'string' ? pref : pref?.id;
          if (pid !== productId) continue;
          if (pr.recurring?.interval === 'year') matchInterval = 'year';
          else if (pr.recurring?.interval === 'month') matchInterval = 'month';
          if (item.price?.unit_amount != null) {
            matchAmountCents = item.price.unit_amount;
          }
          break;
        }

        if (matchInterval == null) continue;

        if (matchInterval === 'year') subscriptionsYearly += 1;
        else subscriptionsMonthly += 1;

        totalEarningsCents += matchAmountCents;

        const cust = sub.customer;
        const customerId = typeof cust === 'string' ? cust : cust?.id ?? '';
        let email = '';
        let name = '';
        if (typeof cust === 'object' && cust !== null && !('deleted' in cust && cust.deleted)) {
          email = cust.email ?? '';
          name = cust.name ?? '';
        }
        const userId = sub.metadata?.appwrite_user_id ? String(sub.metadata.appwrite_user_id) : null;

        subscribers.push({
          subscriptionId: sub.id,
          customerId,
          email,
          name,
          billingInterval: matchInterval,
          subscribedSince: sub.start_date,
          status: sub.status,
          userId,
        });
      }

      if (!batch.has_more || batch.data.length === 0) break;
      startingAfter = batch.data[batch.data.length - 1].id;
    }
  }

  const stats = {
    totalSubscriptions: subscribers.length,
    subscriptionsMonthly,
    subscriptionsYearly,
    totalEarnings: Math.round((totalEarningsCents / 100) * 100) / 100,
    upgradedTo: 0,
    downgradedTo: 0,
    downgradedFrom: 0,
  };

  return { plan, stats, subscribers };
}

/**
 * Lists active products with their recurring prices (live fetch, no DB cache).
 */
export async function getActivePlans(): Promise<ProductPricePlan[]> {
  const stripe = getStripeFromEnv();
  const products = await stripe.products.list({
    active: true,
    limit: 100,
    expand: ['data.default_price'],
  });

  const plans: ProductPricePlan[] = [];

  for (const product of products.data) {
    const prices = await stripe.prices.list({
      active: true,
      product: product.id,
      limit: 100,
      expand: ['data.product'],
    });

    for (const price of prices.data) {
      if (price.recurring) {
        plans.push({ product, price });
      }
    }
  }

  return plans;
}
