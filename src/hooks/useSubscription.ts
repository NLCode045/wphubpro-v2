/**
 * Live Stripe subscriptions for the current customer (`GET/POST /api/stripe/subscriptions`).
 * If this name clashes with `@/domains/billing`’s `useSubscription`, import as an alias.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchStripeJson, postStripeJson } from '@/lib/stripe-loader';
import { stripeInvoicesQueryKey } from '@/hooks/useInvoices';
import type { StripeSubscription } from '@/types/stripe';

export const stripeSubscriptionsQueryKey = (customerId: string) =>
  ['stripe', 'subscriptions', customerId] as const;

function normalizeSubscriptionList(json: unknown): StripeSubscription[] {
  if (Array.isArray(json)) {
    return json as StripeSubscription[];
  }
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as StripeSubscription[];
    if (Array.isArray(o.subscriptions)) return o.subscriptions as StripeSubscription[];
  }
  return [];
}

export function useSubscription(stripeCustomerId: string | null) {
  return useQuery({
    queryKey: stripeCustomerId ? stripeSubscriptionsQueryKey(stripeCustomerId) : ['stripe', 'subscriptions', 'none'],
    queryFn: async () => {
      if (!stripeCustomerId) return [] as StripeSubscription[];
      const q = new URLSearchParams({ customerId: stripeCustomerId });
      const raw = await fetchStripeJson<unknown>(`/subscriptions?${q.toString()}`);
      return normalizeSubscriptionList(raw);
    },
    enabled: Boolean(stripeCustomerId),
    staleTime: 30_000,
  });
}

export type SubscriptionPostAction = 'create' | 'update' | 'cancel';

export interface SubscriptionPostBody {
  action: SubscriptionPostAction;
  customerId?: string;
  priceId?: string;
  subscriptionId?: string;
}

export interface SubscriptionPostResult {
  success?: boolean;
  clientSecret?: string | null;
  subscription?: StripeSubscription;
  message?: string;
}

export function useSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SubscriptionPostBody) =>
      postStripeJson<SubscriptionPostResult>('/subscriptions', body),
    onSuccess: (_data, variables) => {
      const cid = variables.customerId;
      if (cid) {
        void queryClient.invalidateQueries({ queryKey: stripeSubscriptionsQueryKey(cid) });
        void queryClient.invalidateQueries({ queryKey: stripeInvoicesQueryKey(cid) });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['stripe', 'subscriptions'] });
        void queryClient.invalidateQueries({ queryKey: ['stripe', 'invoices'] });
      }
    },
  });
}
