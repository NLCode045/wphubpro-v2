/**
 * `GET /api/stripe/billing` — cached invoice list.
 * If this name clashes with `@/domains/billing`’s `useInvoices`, import as an alias.
 */
import { useQuery } from '@tanstack/react-query';

import { fetchStripeJson } from '@/lib/stripe-loader';
import type { StripeInvoice } from '@/types/stripe';

export const stripeInvoicesQueryKey = (customerId: string) =>
  ['stripe', 'invoices', customerId] as const;

function normalizeInvoices(json: unknown): StripeInvoice[] {
  if (Array.isArray(json)) {
    return json as StripeInvoice[];
  }
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as StripeInvoice[];
    if (Array.isArray(o.invoices)) return o.invoices as StripeInvoice[];
  }
  return [];
}

export function useInvoices(stripeCustomerId: string | null) {
  return useQuery({
    queryKey: stripeCustomerId ? stripeInvoicesQueryKey(stripeCustomerId) : ['stripe', 'invoices', 'none'],
    queryFn: async () => {
      if (!stripeCustomerId) return [] as StripeInvoice[];
      const q = new URLSearchParams({ customerId: stripeCustomerId });
      const raw = await fetchStripeJson<unknown>(`/billing?${q.toString()}`);
      return normalizeInvoices(raw);
    },
    enabled: Boolean(stripeCustomerId),
    staleTime: 30_000,
  });
}
