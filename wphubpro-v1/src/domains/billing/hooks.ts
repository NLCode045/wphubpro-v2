import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Query } from 'appwrite';
import { redirectToBillingPortal } from '../../services/stripe';
import { useToast } from '../../contexts/ToastContext';
import {
  StripeInvoice,
  StripePlan,
  StripeProrationPreview,
  StripePaymentMethod,
  Subscription,
  SubscriptionDetailsResponse,
  UsageMetrics,
} from '../../types';
import { useAuth } from '../auth';
import { executeFunction } from '../../integrations/appwrite/executeFunction';
import { databases, DATABASE_ID, COLLECTIONS } from '../../services/appwrite';
import { useLibraryItems } from '../../hooks/useLibrary';
import { useSites } from '../sites/hooks';

const STRIPE_LIST_PRODUCTS_FUNCTION_ID = 'stripe-products';
const STRIPE_CREATE_CHECKOUT_SESSION_FUNCTION_ID = 'stripe-order-payments';
const STRIPE_CANCEL_SUBSCRIPTION_FUNCTION_ID = 'stripe-subscriptions';
const LIST_INVOICES_FUNCTION_ID = 'stripe-invoices';
const GET_SUBSCRIPTION_FUNCTION_ID = 'stripe-subscriptions';
const STRIPE_PAYMENT_METHODS_FUNCTION_ID = 'stripe-payment-methods';

export const useManageSubscription = () => {
  const { toast } = useToast();

  return useMutation<void, Error>({
    mutationFn: redirectToBillingPortal,
    onError: (error) => {
      toast({
        title: 'Redirection Failed',
        description: error.message || 'Could not redirect to the billing portal.',
        variant: 'destructive',
      });
    },
  });
};

export const useInvoices = () => {
  const { user } = useAuth();
  return useQuery<StripeInvoice[], Error>({
    queryKey: ['invoices', user?.$id],
    queryFn: async () => {
      if (!user) return [];
      const result = await executeFunction<{ invoices: StripeInvoice[] }>(LIST_INVOICES_FUNCTION_ID);
      return result?.invoices ?? [];
    },
    enabled: !!user,
  });
};

export const useStripePlans = () => {
  const { user } = useAuth();
  return useQuery<StripePlan[], Error>({
    queryKey: ['stripePlans'],
    queryFn: async () => {
      const response = await executeFunction<{ plans: StripePlan[] }>(STRIPE_LIST_PRODUCTS_FUNCTION_ID, {
        action: 'list',
        exclude_hidden: true,
        exclude_non_sellable: true,
      });
      return response.plans || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60,
  });
};

export type CheckoutSessionResult = {
  sessionId?: string;
  url?: string | null;
  subscriptionId?: string;
  status?: string;
  message?: string;
};

export const useCreateCheckoutSession = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
        toast({ title: 'Plan updated', description: data.message ?? 'Your plan has been updated.', variant: 'default' });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Could not initiate subscription: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: async () => {
      return await executeFunction<{ success: boolean }>(
        STRIPE_CANCEL_SUBSCRIPTION_FUNCTION_ID,
        { action: 'cancel' }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription will be cancelled at the end of the billing period.',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Could not cancel subscription: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useSubscription = () => {
  const { user } = useAuth();
  return useQuery<Subscription | null, Error>({
    queryKey: ['subscription', user?.$id],
    queryFn: async () => {
      if (!user?.$id) return null;

      // 1. Get stripe_customer_id from accounts
      let stripeCustomerId: string | null = null;
      try {
        const accountDocs = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.ACCOUNTS,
          [Query.equal('user_id', user.$id), Query.limit(1)]
        );
        if (accountDocs.documents.length > 0) {
          stripeCustomerId = accountDocs.documents[0].stripe_customer_id || null;
        }
      } catch (e) {
        console.error('Failed to fetch accounts:', e);
      }

      // 2. Fetch subscription from Stripe (every user has a plan; Free Tier created if needed)
      if (stripeCustomerId) {
        try {
          const responseBody = await executeFunction<any>(GET_SUBSCRIPTION_FUNCTION_ID, {
            action: 'get',
          });
          if (responseBody && responseBody.status !== 'canceled') {
            return {
              ...responseBody,
              userId: user.$id,
              source: 'stripe',
            } as Subscription;
          }
        } catch (e) {
          console.error('Failed to fetch Stripe subscription:', e);
        }
      }

      return null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUsage = () => {
  const { user } = useAuth();
  const { data: libraryItems } = useLibraryItems();
  const { data: sites } = useSites();

  return useQuery<UsageMetrics, Error>({
    queryKey: ['usage', user?.$id, libraryItems, sites],
    queryFn: async () => {
      const localUploads = libraryItems?.filter((item) => item.source === 'local') || [];

      return {
        sitesUsed: sites?.length || 0,
        libraryUsed: libraryItems?.length || 0,
        storageUsed: localUploads.length,
      };
    },
    enabled: !!user && libraryItems !== undefined && sites !== undefined,
  });
};

export const usePaymentMethods = () => {
  const { user } = useAuth();
  return useQuery<StripePaymentMethod[], Error>({
    queryKey: ['paymentMethods', user?.$id],
    queryFn: async () => {
      if (!user) return [];
      const result = await executeFunction<{ paymentMethods: StripePaymentMethod[] }>(
        STRIPE_PAYMENT_METHODS_FUNCTION_ID,
        { action: 'list' }
      );
      return result?.paymentMethods ?? [];
    },
    enabled: !!user,
  });
};

export const useCreateSetupIntent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
      toast({ title: 'Error', description: error.message || 'Could not start add card.', variant: 'destructive' });
    },
  });
};

export const useAttachPaymentMethod = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
      toast({ title: 'Card added', description: 'Payment method saved.', variant: 'default' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message || 'Could not add card.', variant: 'destructive' });
    },
  });
};

export const useDetachPaymentMethod = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation<void, Error, string>({
    mutationFn: async (paymentMethodId) => {
      await executeFunction(STRIPE_PAYMENT_METHODS_FUNCTION_ID, { action: 'detach', paymentMethodId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast({ title: 'Card removed', description: 'Payment method removed.', variant: 'default' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message || 'Could not remove card.', variant: 'destructive' });
    },
  });
};

export const useSetDefaultPaymentMethod = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation<void, Error, string>({
    mutationFn: async (paymentMethodId) => {
      await executeFunction(STRIPE_PAYMENT_METHODS_FUNCTION_ID, { action: 'set-default', paymentMethodId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast({ title: 'Default updated', description: 'Default payment method updated.', variant: 'default' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message || 'Could not set default.', variant: 'destructive' });
    },
  });
};

export const useSubscriptionDetails = (subscriptionId: string | null | undefined) => {
  const { user } = useAuth();
  return useQuery<SubscriptionDetailsResponse, Error>({
    queryKey: ['subscriptionDetails', user?.$id, subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) throw new Error('No subscription ID');
      return await executeFunction<SubscriptionDetailsResponse>(GET_SUBSCRIPTION_FUNCTION_ID, {
        action: 'get-details',
        subscriptionId,
      });
    },
    enabled: !!user && !!subscriptionId,
    staleTime: 1000 * 60 * 2,
  });
};

export const useProrationPreview = () => {
  const { toast } = useToast();
  return useMutation<StripeProrationPreview, Error, { subscriptionId: string; newPriceId: string }>({
    mutationFn: async ({ subscriptionId, newPriceId }) => {
      const result = await executeFunction<StripeProrationPreview>(GET_SUBSCRIPTION_FUNCTION_ID, {
        action: 'preview-proration',
        subscriptionId,
        newPriceId,
      });
      if (result && typeof result.amountDue === 'number') return result;
      throw new Error('Invalid preview response');
    },
    onError: (error) => {
      toast({ title: 'Preview failed', description: error.message, variant: 'destructive' });
    },
  });
};
