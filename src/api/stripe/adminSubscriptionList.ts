/**
 * Server-only — admin subscription table rows (Stripe SDK). Do not import from React components.
 */
import type { AdminSubscriptionRow } from '@/domains/admin/finance/types';
import { getStripeFromEnv } from './client';

export type AdminSubscriptionListParams = {
  status?: string;
  priceId?: string;
  productId?: string;
  search?: string;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  maxPages?: number;
};

function mapSubscription(sub: any): AdminSubscriptionRow {
  const item = sub.items.data[0];
  const price = item?.price;
  const product = price?.product;
  const productId = typeof product === 'string' ? product : product && 'id' in product ? product.id : null;
  const planName =
    typeof product === 'object' && product && 'name' in product && typeof product.name === 'string'
      ? product.name
      : null;

  const cust = sub.customer;
  let customerId: string | null = null;
  let customerEmail: string | null = null;
  let customerName: string | null = null;
  if (typeof cust === 'object' && cust !== null && !('deleted' in cust && cust.deleted)) {
    customerId = cust.id;
    customerEmail = cust.email ?? null;
    customerName = cust.name ?? null;
  } else if (typeof cust === 'string') {
    customerId = cust;
  }

  const hubArchived = sub.metadata?.hub_archived === 'true';

  return {
    subscriptionId: sub.id,
    status: sub.status,
    startDate: sub.start_date,
    endDate: sub.ended_at,
    currentPeriodEnd: sub.current_period_end,
    nextBillingDate: sub.current_period_end,
    billingCycle: price?.recurring?.interval ?? null,
    billingIntervalCount: price?.recurring?.interval_count ?? 1,
    planName,
    priceId: price?.id ?? null,
    productId,
    customerId,
    customerEmail,
    customerName,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    hubArchived,
    userId: sub.metadata?.appwrite_user_id ? String(sub.metadata.appwrite_user_id) : null,
    username: sub.metadata?.username ? String(sub.metadata.username) : null,
  };
}

function matchesFilters(
  row: AdminSubscriptionRow,
  params: AdminSubscriptionListParams,
): boolean {
  if (params.status && params.status !== 'all' && row.status !== params.status) return false;
  if (params.productId && row.productId !== params.productId) return false;
  if (params.priceId && row.priceId !== params.priceId) return false;
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    const hay = [
      row.subscriptionId,
      row.customerId,
      row.customerEmail,
      row.customerName,
      row.planName,
      row.userId,
      row.username,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function sortKey(row: AdminSubscriptionRow, field: string): string | number {
  switch (field) {
    case 'startDate':
      return row.startDate;
    case 'endDate':
      return row.endDate ?? 0;
    case 'nextBillingDate':
      return row.nextBillingDate;
    case 'billingCycle':
      return row.billingCycle ?? '';
    case 'plan':
      return row.planName ?? '';
    case 'status':
      return row.status;
    case 'username':
      return row.username ?? row.customerEmail ?? '';
    default:
      return row.startDate;
  }
}

/**
 * Paginates Stripe subscriptions and maps to admin table rows (filters applied in memory).
 */
export async function listAdminSubscriptionRows(
  params: AdminSubscriptionListParams,
): Promise<{ subscriptions: AdminSubscriptionRow[]; fetchedPages: number }> {
  const stripeClient = getStripeFromEnv() as any;
  const maxPages = Math.min(Math.max(params.maxPages ?? 5, 1), 20);
  const rows: AdminSubscriptionRow[] = [];
  let startingAfter: string | undefined;
  let pages = 0;

  for (let p = 0; p < maxPages; p++) {
    const listParams: Record<string, unknown> = {
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.customer', 'data.items.data.price.product'],
    };
    if (params.status && params.status !== 'all') {
      listParams.status = params.status;
    }
    const batch = (await stripeClient.subscriptions.list(listParams)) as {
      data: any[];
      has_more: boolean;
    };
    pages += 1;
    for (const sub of batch.data) {
      const row = mapSubscription(sub);
      if (matchesFilters(row, params)) {
        rows.push(row);
      }
    }
    if (!batch.has_more || batch.data.length === 0) break;
    startingAfter = batch.data[batch.data.length - 1].id;
  }

  const sortField = params.sortField ?? 'startDate';
  const sortDir = params.sortDir ?? 'desc';
  rows.sort((a, b) => {
    const va = sortKey(a, sortField);
    const vb = sortKey(b, sortField);
    const cmp =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return { subscriptions: rows, fetchedPages: pages };
}
