import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Query } from 'appwrite';
import { useNotificationContext } from '@/context/useNotificationContext';
import type {
  StripeInvoice,
  StripePaymentMethod,
  StripePlan,
  Subscription,
  SubscriptionDetailsResponse,
} from '@/types';
import { useAuth } from '@/domains/auth';
import { executeFunction } from '@/integrations/appwrite/executeFunction';
import { COLLECTIONS, DATABASE_ID, databases } from '@/services/appwrite';

const STRIPE_LIST_PRODUCTS_FUNCTION_ID = 'stripe-products';
const STRIPE_CREATE_CHECKOUT_SESSION_FUNCTION_ID = 'stripe-order-payments';
const STRIPE_CANCEL_SUBSCRIPTION_FUNCTION_ID = 'stripe-subscriptions';
const LIST_INVOICES_FUNCTION_ID = 'stripe-invoices';
const GET_SUBSCRIPTION_FUNCTION_ID = 'stripe-subscriptions';
const STRIPE_PAYMENT_METHODS_FUNCTION_ID = 'stripe-payment-methods';

/** Pass from profile after `useMyAccountDoc` resolves to avoid duplicate account reads and unnecessary Stripe calls. */
export type BillingAccountContext = {
  accountReady: boolean;
  /** Raw or trimmed `stripe_customer_id`; empty when absent */
  stripeCustomerId: string;
};

function useBillingNotify() {
  const { showNotification } = useNotificationContext();
  return {
    error: (title: string, message: string) =>
      showNotification({ title, message, variant: 'danger', delay: 4000 }),
    success: (title: string, message: string) =>
      showNotification({ title, message, variant: 'success', delay: 3000 }),
  };
}

function stripeBillingEnabled(userId: string | undefined, ctx: BillingAccountContext | undefined) {
  if (!userId) return false;
  if (!ctx) return true;
  return ctx.accountReady && Boolean(ctx.stripeCustomerId.trim());
}

export type CheckoutSessionResult = {
  sessionId?: string;
  url?: string | null;
  subscriptionId?: string;
  status?: string;
  message?: string;
};

export const useInvoices = (ctx?: BillingAccountContext) => {
  const { user } = useAuth();
  return useQuery<StripeInvoice[], Error>({
    queryKey: ['invoices', user?.$id, ctx?.stripeCustomerId],
    queryFn: async () => {
      if (!user) return [];
      const result = await executeFunction<{ invoices: StripeInvoice[] }>(LIST_INVOICES_FUNCTION_ID);
      return result?.invoices ?? [];
    },
    enabled: stripeBillingEnabled(user?.$id, ctx),
    staleTime: 1000 * 60 * 2,
  });
};

export const useStripePlans = (ctx?: BillingAccountContext) => {
  const { user } = useAuth();
  return useQuery<StripePlan[], Error>({
    queryKey: ['stripePlans', user?.$id, ctx?.stripeCustomerId],
    queryFn: async () => {
      const response = await executeFunction<{ plans: StripePlan[] }>(STRIPE_LIST_PRODUCTS_FUNCTION_ID, {
        action: 'list',
        exclude_hidden: true,
        exclude_non_sellable: true,
      });
      return response.plans || [];
    },
    enabled: stripeBillingEnabled(user?.$id, ctx),
    staleTime: 1000 * 60 * 60,
  });
};

export const useCreateCheckoutSession = () => {
  const queryClient = useQueryClient();
  const notify = useBillingNotify();
  return useMutation<
    CheckoutSessionResult,
    Error,
    { priceId: string; returnUrl?: string; updateType?: 'upgrade' | 'downgrade' }
  >({
    mutationFn: async ({ priceId, returnUrl, updateType }) => {
      const baseUrl = returnUrl ?? window.location.origin;
      const result = await executeFunction<CheckoutSessionResult>(
        STRIPE_CREATE_CHECKOUT_SESSION_FUNCTION_ID,
        { priceId, returnUrl: baseUrl, updateType }
      );
      return result ?? {};
    },
    onSuccess: (data) => {
      if (data?.subscriptionId && !data?.url) {
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
        queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
        notify.success('Plan updated', data.message ?? 'Your plan has been updated.');
      }
    },
    onError: (error) => {
      notify.error('Error', `Could not start checkout: ${error.message}`);
    },
  });
};

export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  const notify = useBillingNotify();
  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: async () => {
      return await executeFunction<{ success: boolean }>(STRIPE_CANCEL_SUBSCRIPTION_FUNCTION_ID, {
        action: 'cancel',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      notify.success(
        'Subscription cancelled',
        'Your subscription will end at the end of the current billing period.'
      );
    },
    onError: (error) => {
      notify.error('Error', `Could not cancel subscription: ${error.message}`);
    },
  });
};

export const useSubscription = (ctx?: BillingAccountContext) => {
  const { user } = useAuth();
  return useQuery<Subscription | null, Error>({
    queryKey: ['subscription', user?.$id, ctx?.stripeCustomerId ?? 'self-fetch'],
    queryFn: async () => {
      if (!user?.$id) return null;

      let stripeCustomerId: string | null = null;
      if (ctx) {
        stripeCustomerId = ctx.stripeCustomerId.trim() || null;
      } else {
        try {
          const accountDocs = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ACCOUNTS, [
            Query.equal('user_id', user.$id),
            Query.limit(1),
          ]);
          if (accountDocs.documents.length > 0) {
            const raw = (accountDocs.documents[0] as { stripe_customer_id?: string | null }).stripe_customer_id;
            stripeCustomerId = raw?.trim() || null;
          }
        } catch (e) {
          console.error('Failed to fetch accounts:', e);
        }
      }

      if (!stripeCustomerId) return null;

      try {
        const responseBody = await executeFunction<Record<string, unknown>>(GET_SUBSCRIPTION_FUNCTION_ID, {
          action: 'get',
        });
        if (responseBody && responseBody.status !== 'canceled') {
          const b = responseBody as Record<string, unknown>;
          return {
            ...responseBody,
            userId: user.$id,
            source: 'stripe',
            cancelAtPeriodEnd:
              (b.cancelAtPeriodEnd as boolean | undefined) ??
              (b.cancel_at_period_end as boolean | undefined),
            currentPeriodEnd:
              (b.currentPeriodEnd as number | undefined) ??
              (b.current_period_end as number | undefined),
          } as Subscription;
        }
      } catch (e) {
        console.error('Failed to fetch Stripe subscription:', e);
      }

      return null;
    },
    enabled:
      !!user?.$id && (ctx ? ctx.accountReady && Boolean(ctx.stripeCustomerId.trim()) : true),
    staleTime: 1000 * 60 * 5,
  });
};

export const usePaymentMethods = (ctx?: BillingAccountContext) => {
  const { user } = useAuth();
  return useQuery<StripePaymentMethod[], Error>({
    queryKey: ['paymentMethods', user?.$id, ctx?.stripeCustomerId],
    queryFn: async () => {
      if (!user) return [];
      const result = await executeFunction<{ paymentMethods: StripePaymentMethod[] }>(
        STRIPE_PAYMENT_METHODS_FUNCTION_ID,
        { action: 'list' }
      );
      return result?.paymentMethods ?? [];
    },
    enabled: stripeBillingEnabled(user?.$id, ctx),
    staleTime: 1000 * 60 * 2,
  });
};

export const useCreateSetupIntent = () => {
  const queryClient = useQueryClient();
  const notify = useBillingNotify();
  return useMutation<{ clientSecret: string }, Error, void>({
    mutationFn: async () => {
      const result = await executeFunction<{ clientSecret: string }>(
        STRIPE_PAYMENT_METHODS_FUNCTION_ID,
        { action: 'create-setup-intent' }
      );
      if (!result?.clientSecret) throw new Error('No client secret returned');
      return { clientSecret: result.clientSecret };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
    onError: (error) => {
      notify.error('Error', error.message || 'Could not start add card.');
    },
  });
};

export const useAttachPaymentMethod = () => {
  const queryClient = useQueryClient();
  const notify = useBillingNotify();
  return useMutation<void, Error, { paymentMethodId: string; setAsDefault?: boolean }>({
    mutationFn: async ({ paymentMethodId, setAsDefault }) => {
      await executeFunction(STRIPE_PAYMENT_METHODS_FUNCTION_ID, {
        action: 'attach',
        paymentMethodId,
        setAsDefault: setAsDefault ?? true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
      notify.success('Card added', 'Payment method saved.');
    },
    onError: (error) => {
      notify.error('Error', error.message || 'Could not add card.');
    },
  });
};

export const useDetachPaymentMethod = () => {
  const queryClient = useQueryClient();
  const notify = useBillingNotify();
  return useMutation<void, Error, string>({
    mutationFn: async (paymentMethodId) => {
      await executeFunction(STRIPE_PAYMENT_METHODS_FUNCTION_ID, { action: 'detach', paymentMethodId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
      notify.success('Card removed', 'Payment method removed.');
    },
    onError: (error) => {
      notify.error('Error', error.message || 'Could not remove card.');
    },
  });
};

export const useSetDefaultPaymentMethod = () => {
  const queryClient = useQueryClient();
  const notify = useBillingNotify();
  return useMutation<void, Error, string>({
    mutationFn: async (paymentMethodId) => {
      await executeFunction(STRIPE_PAYMENT_METHODS_FUNCTION_ID, { action: 'set-default', paymentMethodId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
      notify.success('Default updated', 'Default payment method updated.');
    },
    onError: (error) => {
      notify.error('Error', error.message || 'Could not set default.');
    },
  });
};

export const useSubscriptionDetails = (
  subscriptionId: string | null | undefined,
  ctx?: BillingAccountContext
) => {
  const { user } = useAuth();
  return useQuery<SubscriptionDetailsResponse, Error>({
    queryKey: ['subscriptionDetails', user?.$id, subscriptionId, ctx?.stripeCustomerId],
    queryFn: async () => {
      if (!subscriptionId) throw new Error('No subscription ID');
      return await executeFunction<SubscriptionDetailsResponse>(GET_SUBSCRIPTION_FUNCTION_ID, {
        action: 'get-details',
        subscriptionId,
      });
    },
    enabled: Boolean(user && subscriptionId && stripeBillingEnabled(user.$id, ctx)),
    staleTime: 1000 * 60 * 2,
  });
};
