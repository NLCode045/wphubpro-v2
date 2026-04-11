import { useQuery } from '@tanstack/react-query';

import { fetchStripeJson } from '@/lib/stripe-loader';
import type { StripePlan } from '@/types/stripe';

export const stripePlansQueryKey = ['stripe', 'plans'] as const;

function normalizePlans(json: unknown): StripePlan[] {
  if (Array.isArray(json)) {
    return json as StripePlan[];
  }
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as StripePlan[];
    if (Array.isArray(o.plans)) return o.plans as StripePlan[];
  }
  return [];
}

/**
 * Active products/prices from `GET /api/stripe/plans` (cached).
 */
export function usePlans() {
  return useQuery({
    queryKey: stripePlansQueryKey,
    queryFn: async () => {
      const raw = await fetchStripeJson<unknown>('/plans');
      return normalizePlans(raw);
    },
    staleTime: 60_000,
  });
}
