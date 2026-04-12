/**
 * Server-only — finance period dashboard (Stripe SDK). Do not import from React components.
 */
import type {
  AdminFinanceDashboardResponse,
  FinanceDashboardPeriod,
} from '@/domains/admin/finance/types';
import { getStripeFromEnv } from './client';

type StripeListPage<T> = { data: T[]; has_more: boolean };

function windowForPeriod(period: FinanceDashboardPeriod): {
  windowStart: number;
  windowEnd: number;
  rangeLabel: string;
  bucketCount: number;
  bucketLabel: (index: number, bucketStart: number) => string;
} {
  const windowEnd = Math.floor(Date.now() / 1000);
  let seconds: number;
  let rangeLabel: string;
  let bucketCount: number;
  let bucketLabel: (index: number, bucketStart: number) => string;

  switch (period) {
    case 'day':
      seconds = 86400;
      rangeLabel = 'Last 24 hours';
      bucketCount = 24;
      bucketLabel = (i) => `H${String(i).padStart(2, '0')}`;
      break;
    case 'week':
      seconds = 7 * 86400;
      rangeLabel = 'Last 7 days';
      bucketCount = 7;
      bucketLabel = (_, bucketStart) =>
        new Date(bucketStart * 1000).toLocaleDateString(undefined, { weekday: 'short' });
      break;
    case 'month':
      seconds = 30 * 86400;
      rangeLabel = 'Last 30 days';
      bucketCount = 10;
      bucketLabel = (i) => `P${i + 1}`;
      break;
    case 'year':
      seconds = 365 * 86400;
      rangeLabel = 'Last 12 months';
      bucketCount = 12;
      bucketLabel = (i) =>
        new Date((windowEnd - (11 - i) * 30 * 86400) * 1000).toLocaleString(undefined, {
          month: 'short',
        });
      break;
    default:
      seconds = 7 * 86400;
      rangeLabel = 'Last 7 days';
      bucketCount = 7;
      bucketLabel = () => '';
  }

  const windowStart = windowEnd - seconds;
  return { windowStart, windowEnd, rangeLabel, bucketCount, bucketLabel };
}

function buildBuckets(
  windowStart: number,
  windowEnd: number,
  bucketCount: number,
  bucketLabel: (index: number, bucketStart: number) => string,
): Array<{ start: number; end: number; label: string }> {
  const span = windowEnd - windowStart;
  const step = Math.max(1, Math.floor(span / bucketCount));
  const out: Array<{ start: number; end: number; label: string }> = [];
  for (let i = 0; i < bucketCount; i++) {
    const start = windowStart + i * step;
    const end = i === bucketCount - 1 ? windowEnd : Math.min(windowStart + (i + 1) * step, windowEnd);
    out.push({
      start,
      end,
      label: bucketLabel(i, start),
    });
  }
  return out;
}

function bucketIndexFor(
  t: number,
  bounds: Array<{ start: number; end: number }>,
): number {
  for (let i = 0; i < bounds.length; i++) {
    const last = i === bounds.length - 1;
    if (last) {
      if (t >= bounds[i].start && t <= bounds[i].end) return i;
    } else if (t >= bounds[i].start && t < bounds[i].end) {
      return i;
    }
  }
  return Math.min(bounds.length - 1, Math.max(0, bounds.length - 1));
}

/**
 * KPIs and charts for admin finance dashboard — replaces legacy Appwrite `admin-finance-dashboard`.
 */
export async function getAdminFinanceDashboard(
  period: FinanceDashboardPeriod,
): Promise<AdminFinanceDashboardResponse> {
  const stripeClient = getStripeFromEnv() as any;
  const { windowStart, windowEnd, rangeLabel, bucketCount, bucketLabel } = windowForPeriod(period);
  const bounds = buildBuckets(windowStart, windowEnd, bucketCount, bucketLabel);

  const revenueByBucket = new Array(bucketCount).fill(0);
  const newByBucket = new Array(bucketCount).fill(0);
  const cancelByBucket = new Array(bucketCount).fill(0);

  let invStart: string | undefined;
  for (let p = 0; p < 30; p++) {
    const page = (await stripeClient.invoices.list({
      status: 'paid',
      created: { gte: windowStart, lte: windowEnd },
      limit: 100,
      starting_after: invStart,
    })) as StripeListPage<any>;
    for (const inv of page.data) {
      const t = inv.status_transitions?.paid_at ?? inv.created;
      const bi = bucketIndexFor(t, bounds);
      revenueByBucket[bi] += inv.amount_paid ?? 0;
    }
    if (!page.has_more || page.data.length === 0) break;
    invStart = page.data[page.data.length - 1].id;
  }

  let subStart: string | undefined;
  for (let page = 0; page < 20; page++) {
    const batch = (await stripeClient.subscriptions.list({
      status: 'all',
      limit: 100,
      starting_after: subStart,
      expand: ['data.customer', 'data.items.data.price.product'],
    })) as StripeListPage<any>;
    for (const sub of batch.data) {
      const c = sub.created;
      if (c >= windowStart && c <= windowEnd) {
        const bi = bucketIndexFor(c, bounds);
        newByBucket[bi] += 1;
      }
      const ca = sub.canceled_at;
      if (ca != null && ca >= windowStart && ca <= windowEnd) {
        const bi = bucketIndexFor(ca, bounds);
        cancelByBucket[bi] += 1;
      }
    }
    if (!batch.has_more || batch.data.length === 0) break;
    subStart = batch.data[batch.data.length - 1].id;
  }

  const buckets = bounds.map((b, i) => ({
    label: b.label,
    start: b.start,
    end: b.end,
    revenueCents: revenueByBucket[i] ?? 0,
    newSubscriptions: newByBucket[i] ?? 0,
    cancellations: cancelByBucket[i] ?? 0,
    upgrades: 0,
    downgrades: 0,
    cumulativeNetSubscriptions: 0,
  }));

  let cum = 0;
  for (const row of buckets) {
    cum += row.newSubscriptions - row.cancellations;
    row.cumulativeNetSubscriptions = cum;
  }

  let revenueInPeriodCents = 0;
  for (const b of buckets) {
    revenueInPeriodCents += b.revenueCents;
  }

  let activeSubscriptionsNow = 0;
  let actStart: string | undefined;
  for (let page = 0; page < 5; page++) {
    const batch = (await stripeClient.subscriptions.list({
      status: 'active',
      limit: 100,
      starting_after: actStart,
    })) as StripeListPage<any>;
    activeSubscriptionsNow += batch.data.length;
    if (!batch.has_more || batch.data.length === 0) break;
    actStart = batch.data[batch.data.length - 1].id;
  }

  const newInPeriod = newByBucket.reduce((a, n) => a + n, 0);
  const canceledInPeriod = cancelByBucket.reduce((a, n) => a + n, 0);

  let revenueAllTimeCents = 0;
  let invAll: string | undefined;
  for (let p = 0; p < 5; p++) {
    const page = (await stripeClient.invoices.list({ status: 'paid', limit: 100, starting_after: invAll })) as StripeListPage<any>;
    for (const inv of page.data) {
      revenueAllTimeCents += inv.amount_paid ?? 0;
    }
    if (!page.has_more || page.data.length === 0) break;
    invAll = page.data[page.data.length - 1].id;
  }

  const productCounts = new Map<string, { name: string; count: number }>();
  let prodStart: string | undefined;
  for (let page = 0; page < 8; page++) {
    const batch = (await stripeClient.subscriptions.list({
      status: 'active',
      limit: 100,
      starting_after: prodStart,
      expand: ['data.items.data.price.product'],
    })) as StripeListPage<any>;
    for (const sub of batch.data) {
      const item = sub.items.data[0];
      const pr = item?.price?.product;
      const pid = typeof pr === 'string' ? pr : pr && 'id' in pr ? pr.id : null;
      const name =
        typeof pr === 'object' && pr && 'name' in pr && typeof pr.name === 'string' ? pr.name : pid ?? '—';
      if (!pid) continue;
      const cur = productCounts.get(pid) ?? { name, count: 0 };
      cur.count += 1;
      productCounts.set(pid, cur);
    }
    if (!batch.has_more || batch.data.length === 0) break;
    prodStart = batch.data[batch.data.length - 1].id;
  }

  const byPlan = [...productCounts.entries()].map(([productId, v]) => ({
    productId,
    name: v.name,
    count: v.count,
  }));

  const recentPaidInvoices: AdminFinanceDashboardResponse['recentPaidInvoices'] = [];
  let recentStart: string | undefined;
  for (let p = 0; p < 5; p++) {
    const page = (await stripeClient.invoices.list({
      status: 'paid',
      created: { gte: windowStart, lte: windowEnd },
      limit: 25,
      starting_after: recentStart,
    })) as StripeListPage<any>;
    for (const inv of page.data) {
      const cust = inv.customer;
      const customerId = typeof cust === 'string' ? cust : cust && 'id' in cust ? cust.id : null;
      let customerDisplayName = '—';
      if (typeof cust === 'object' && cust && !('deleted' in cust && cust.deleted)) {
        customerDisplayName = cust.name?.trim() || cust.email?.trim() || cust.id;
      }
      let subscriptionId: string | null = null;
      if (inv.subscription) {
        subscriptionId =
          typeof inv.subscription === 'string' ? inv.subscription : inv.subscription.id ?? null;
      }
      recentPaidInvoices.push({
        id: inv.id,
        number: inv.number,
        amount_paid: inv.amount_paid ?? 0,
        currency: inv.currency,
        created: inv.created,
        customerId,
        customerDisplayName,
        subscriptionId,
      });
    }
    if (!page.has_more || page.data.length === 0) break;
    recentStart = page.data[page.data.length - 1].id;
  }

  return {
    success: true,
    period,
    rangeLabel,
    windowStart,
    windowEnd,
    recentPaidInvoices,
    recentSubscriptionChanges: [],
    stats: {
      buckets,
      kpis: {
        activeSubscriptionsNow,
        newInPeriod,
        canceledInPeriod,
        revenueInPeriodCents,
        revenueAllTimeCents,
        revenueAllTimeTruncated: true,
        upgradesInPeriod: 0,
        downgradesInPeriod: 0,
      },
      byPlan,
      truncated: true,
      upgradeDowngradeNote: 'Upgrade/downgrade counts are not computed in the REST dashboard.',
      rangeLabel,
    },
  };
}
