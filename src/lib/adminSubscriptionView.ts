/** Helpers for admin subscription detail JSON (`/api/stripe/admin/subscriptions/:id`). */

export function formatMoneyFromStripe(cents: unknown, currency: unknown): string {
  if (typeof cents !== 'number') return '—';
  const cur = typeof currency === 'string' ? currency : 'usd';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: cur.toUpperCase(),
  }).format(cents / 100);
}

export function formatUnixSeconds(ts: unknown): string {
  if (typeof ts !== 'number') return '—';
  return new Date(ts * 1000).toLocaleString();
}

export type SubscriptionLineRow = {
  lineId: string;
  productName: string;
  quantity: number;
  unitAmountLabel: string;
  intervalLabel: string;
  priceId: string;
};

export function subscriptionLineRows(sub: Record<string, unknown>): SubscriptionLineRow[] {
  const items = sub.items as { data?: Record<string, unknown>[] } | undefined;
  const data = items?.data ?? [];
  const rows: SubscriptionLineRow[] = [];
  for (const line of data) {
    const price = line?.price as Record<string, unknown> | string | undefined;
    const pr = typeof price === 'object' && price ? price : null;
    const priceId = pr?.id ? String(pr.id) : '—';
    const product = pr?.product as Record<string, unknown> | string | undefined;
    let productName = '—';
    if (typeof product === 'object' && product && typeof product.name === 'string') {
      productName = product.name;
    }
    const qty = typeof line?.quantity === 'number' ? line.quantity : 1;
    const unit = pr?.unit_amount;
    const cur = pr?.currency;
    const unitAmountLabel = formatMoneyFromStripe(unit, cur);
    const rec = pr?.recurring as Record<string, unknown> | undefined;
    const interval = rec?.interval ? String(rec.interval) : '—';
    const intervalCount = typeof rec?.interval_count === 'number' ? rec.interval_count : 1;
    const intervalLabel = intervalCount > 1 ? `${intervalCount} × ${interval}` : interval;
    rows.push({
      lineId: typeof line?.id === 'string' ? line.id : priceId,
      productName,
      quantity: qty,
      unitAmountLabel,
      intervalLabel,
      priceId,
    });
  }
  return rows;
}

export function defaultPaymentMethodLabel(dpm: unknown): string | null {
  if (!dpm || typeof dpm !== 'object') return null;
  const o = dpm as Record<string, unknown>;
  if (o.type === 'card') {
    const card = o.card as Record<string, unknown> | undefined;
    if (card?.brand != null && card?.last4 != null) {
      return `${String(card.brand)} ····${String(card.last4)}`;
    }
  }
  return typeof o.type === 'string' ? o.type : '—';
}

export function latestInvoiceSummary(sub: Record<string, unknown>): {
  id: string | null;
  status: string | null;
  totalLabel: string;
  hostedInvoiceUrl: string | null;
} {
  const inv = sub.latest_invoice as Record<string, unknown> | string | null | undefined;
  if (!inv) {
    return { id: null, status: null, totalLabel: '—', hostedInvoiceUrl: null };
  }
  if (typeof inv === 'string') {
    return { id: inv, status: null, totalLabel: '—', hostedInvoiceUrl: null };
  }
  const id = typeof inv.id === 'string' ? inv.id : null;
  const status = typeof inv.status === 'string' ? inv.status : null;
  const total = inv.total;
  const cur = inv.currency;
  const hosted =
    typeof inv.hosted_invoice_url === 'string' ? inv.hosted_invoice_url : null;
  return {
    id,
    status,
    totalLabel: formatMoneyFromStripe(total, cur),
    hostedInvoiceUrl: hosted,
  };
}

export function metadataEntries(sub: Record<string, unknown>): { key: string; value: string }[] {
  const meta = sub.metadata as Record<string, string> | undefined;
  if (!meta || typeof meta !== 'object') return [];
  return Object.entries(meta).map(([key, value]) => ({ key, value: String(value ?? '') }));
}

export function stripeSubscriptionDashboardUrl(subscriptionId: string): string {
  return `https://dashboard.stripe.com/subscriptions/${encodeURIComponent(subscriptionId)}`;
}
