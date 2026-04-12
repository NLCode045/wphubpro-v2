import { useQuery } from '@tanstack/react-query';

import { useEffectiveIsAdmin } from '@/context/useEffectiveIsAdmin';
import { fetchAdminStats } from '@/lib/stripeAdminApi';
import type { StripeAdminDashboardStats } from '@/types/stripeAdmin';

export const adminStatsQueryKey = ['stripe-admin', 'stats'] as const;

/**
 * Live Stripe KPIs via `GET /api/stripe/admin/stats` (server-side Stripe SDK + `STRIPE_SECRET_KEY` on the API host).
 */
export function useAdminStats() {
  const admin = useEffectiveIsAdmin();
  return useQuery<StripeAdminDashboardStats, Error>({
    queryKey: adminStatsQueryKey,
    queryFn: () => fetchAdminStats(),
    enabled: admin,
    staleTime: 30_000,
  });
}
