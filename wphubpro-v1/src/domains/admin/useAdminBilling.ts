import { useQuery } from '@tanstack/react-query';
import { executeFunction } from '../../integrations/appwrite/executeFunction';
import { useAuth } from '../auth';
import type {
  AdminPaymentIntentRow,
  AdminSubscriptionDetailResponse,
  AdminSubscriptionRow,
} from '../../types';

const ADMIN_BILLING_FN = 'admin-billing';

export function useAdminSubscriptions() {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin', 'subscriptions'],
    queryFn: async () => {
      const res = await executeFunction<{ subscriptions: AdminSubscriptionRow[]; hasMore?: boolean }>(
        ADMIN_BILLING_FN,
        { action: 'subscriptions-list' }
      );
      return res;
    },
    enabled: !!user && !!isAdmin,
  });
}

export function useAdminSubscriptionDetail(subscriptionId: string | undefined) {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin', 'subscription', subscriptionId],
    queryFn: async () => {
      const res = await executeFunction<AdminSubscriptionDetailResponse>(ADMIN_BILLING_FN, {
        action: 'subscription-detail',
        subscriptionId,
      });
      return res;
    },
    enabled: !!user && !!isAdmin && !!subscriptionId,
  });
}

export function useAdminPaymentIntents() {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin', 'paymentIntents'],
    queryFn: async () => {
      const res = await executeFunction<{ paymentIntents: AdminPaymentIntentRow[]; hasMore?: boolean }>(
        ADMIN_BILLING_FN,
        { action: 'payment-intents-list' }
      );
      return res;
    },
    enabled: !!user && !!isAdmin,
  });
}
