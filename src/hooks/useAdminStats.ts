import { useQuery } from '@tanstack/react-query';

import type { AdminFinanceSummary } from '@/domains/admin/finance/types';
import { useEffectiveIsAdmin } from '@/context/useEffectiveIsAdmin';
import { executeFunction } from '@/integrations/appwrite/executeFunction';
import { APPWRITE_FUNCTION_IDS } from '@/services/appwrite';
import type { StripeAdminDashboardStats } from '@/types/stripeAdmin';

const SUBS_FN = APPWRITE_FUNCTION_IDS.STRIPE_SUBSCRIPTIONS;

export const adminStatsQueryKey = ['stripe-admin', 'stats'] as const;

function mapSummaryToDashboardStats(s: AdminFinanceSummary): StripeAdminDashboardStats {
  const counts = s.subscriptionCountsByStatus ?? {};
  const activeSubscriptionCount = typeof counts.active === 'number' ? counts.active : 0;
  const totalSubscriptions = Object.values(counts).reduce(
    (acc, n) => acc + (typeof n === 'number' ? n : 0),
    0,
  );
  return {
    mrrCents: s.approximateMrrCents ?? 0,
    activeSubscriptionCount,
    currency: 'eur',
    livePayments24h: 0,
    totalSubscriptions,
    recentFailedPaymentIntents7d: s.recentFailedPaymentIntents7d,
    revenueFromLast30PaidInvoicesCents: s.revenueFromLast30PaidInvoicesCents,
  };
}

/**
 * Live Stripe KPIs via Appwrite `stripe-consumer` → gateway (`admin-finance-summary`).
 * This uses the same backend as the legacy finance admin hooks, not `/api/stripe/admin/stats`.
 */
export function useAdminStats() {
  const admin = useEffectiveIsAdmin();
  return useQuery({
    queryKey: adminStatsQueryKey,
    queryFn: async () => {
      const res = await executeFunction<AdminFinanceSummary>(SUBS_FN, {
        action: 'admin-finance-summary',
      });
      if (!res?.success) {
        throw new Error((res as { error?: string; message?: string } | null)?.error ?? 'Admin stats failed');
      }
      return mapSummaryToDashboardStats(res);
    },
    enabled: admin,
    staleTime: 30_000,
  });
}
