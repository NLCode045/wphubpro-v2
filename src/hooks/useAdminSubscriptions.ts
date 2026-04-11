import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchAdminSubscription,
  fetchAdminSubscriptions,
  postAdminSubscriptionAction,
} from '@/lib/stripeAdminApi';

export const adminSubscriptionsQueryKey = ['stripe-admin', 'subscriptions'] as const;

export function adminSubscriptionDetailQueryKey(id: string) {
  return ['stripe-admin', 'subscription', id] as const;
}

export function useAdminSubscriptionsList() {
  return useQuery({
    queryKey: adminSubscriptionsQueryKey,
    queryFn: fetchAdminSubscriptions,
    staleTime: 15_000,
  });
}

export function useAdminSubscriptionDetail(subscriptionId: string | undefined) {
  return useQuery({
    queryKey: subscriptionId ? adminSubscriptionDetailQueryKey(subscriptionId) : ['stripe-admin', 'subscription', 'none'],
    queryFn: () => fetchAdminSubscription(subscriptionId!),
    enabled: Boolean(subscriptionId),
  });
}

export function useAdminSubscriptionAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      subscriptionId: string;
      action: 'cancel' | 'pause' | 'resume';
      /** When `action` is `cancel`, set `true` to schedule cancel at period end instead of immediate cancel. */
      atPeriodEnd?: boolean;
    }) =>
      postAdminSubscriptionAction(args.subscriptionId, {
        action: args.action,
        ...(args.action === 'cancel' && args.atPeriodEnd !== undefined
          ? { atPeriodEnd: args.atPeriodEnd }
          : {}),
      }),
    onSuccess: (_d, args) => {
      void qc.invalidateQueries({ queryKey: adminSubscriptionsQueryKey });
      void qc.invalidateQueries({ queryKey: adminSubscriptionDetailQueryKey(args.subscriptionId) });
      void qc.invalidateQueries({ queryKey: ['stripe-admin', 'stats'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'finance'] });
    },
  });
}
