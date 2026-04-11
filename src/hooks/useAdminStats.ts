import { useQuery } from '@tanstack/react-query';

import { fetchAdminStats } from '@/lib/stripeAdminApi';

export const adminStatsQueryKey = ['stripe-admin', 'stats'] as const;

/**
 * Live Stripe admin dashboard KPIs (`GET /api/stripe/admin/stats`).
 */
export function useAdminStats() {
  return useQuery({
    queryKey: adminStatsQueryKey,
    queryFn: fetchAdminStats,
    staleTime: 30_000,
  });
}
