/** Helpers for Stripe objects serialized as JSON from `/api/stripe/admin`. */

export function formatStripeAddress(addr: unknown): string {
  if (!addr || typeof addr !== 'object') return '—';
  const a = addr as Record<string, unknown>;
  const parts = [a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(
    (x) => typeof x === 'string' && x.trim() !== '',
  ) as string[];
  return parts.length ? parts.join(', ') : '—';
}

export function planLabelFromSubscriptionJson(sub: Record<string, unknown>): string {
  const items = sub.items as { data?: Record<string, unknown>[] } | undefined;
  const first = items?.data?.[0];
  const price = first?.price as Record<string, unknown> | string | undefined;
  if (!price || typeof price !== 'object') return '—';
  const product = price.product as Record<string, unknown> | string | undefined;
  if (product && typeof product === 'object' && typeof product.name === 'string') return product.name;
  return typeof price.nickname === 'string' && price.nickname ? price.nickname : '—';
}

export function billingIntervalFromSubscriptionJson(sub: Record<string, unknown>): string | null {
  const items = sub.items as { data?: Record<string, unknown>[] } | undefined;
  const first = items?.data?.[0];
  const price = first?.price as Record<string, unknown> | undefined;
  const rec = price?.recurring as Record<string, unknown> | undefined;
  if (!rec?.interval) return null;
  const count = typeof rec.interval_count === 'number' && rec.interval_count > 1 ? `${rec.interval_count} ` : '';
  return `${count}${String(rec.interval)}${Number(rec.interval_count) > 1 ? 's' : ''}`;
}
