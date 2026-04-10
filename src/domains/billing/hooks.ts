import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Query } from 'appwrite';
import { useNotificationContext } from '@/context/useNotificationContext';
import type {
  PreparePayInvoiceResponse,
  StripeInlinePaymentPayload,
  StripeInvoice,
  StripePaymentMethod,
  StripePlan,
  StripeProrationPreviewResponse,
  Subscription,
  SubscriptionDetailsCustomerAddress,
  SubscriptionDetailsResponse,
} from '@/types';
import { useAuth } from '@/domains/auth';
import { executeFunction } from '@/integrations/appwrite/executeFunction';
import { APPWRITE_FUNCTION_IDS, COLLECTIONS, DATABASE_ID, databases } from '@/services/appwrite';

const STRIPE_LIST_PRODUCTS_FUNCTION_ID = APPWRITE_FUNCTION_IDS.STRIPE_PRODUCTS;
const STRIPE_CREATE_CHECKOUT_SESSION_FUNCTION_ID = APPWRITE_FUNCTION_IDS.STRIPE_ORDER_PAYMENTS;
const STRIPE_CANCEL_SUBSCRIPTION_FUNCTION_ID = APPWRITE_FUNCTION_IDS.STRIPE_SUBSCRIPTIONS;
const LIST_INVOICES_FUNCTION_ID = APPWRITE_FUNCTION_IDS.STRIPE_INVOICES;
const GET_SUBSCRIPTION_FUNCTION_ID = APPWRITE_FUNCTION_IDS.STRIPE_SUBSCRIPTIONS;
const STRIPE_PAYMENT_METHODS_FUNCTION_ID = APPWRITE_FUNCTION_IDS.STRIPE_PAYMENT_METHODS;
const STRIPE_CREATE_CUSTOMER_FUNCTION_ID = APPWRITE_FUNCTION_IDS.STRIPE_CREATE_CUSTOMER;

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
  subscriptionId?: string | null;
  status?: string;
  message?: string;
  payment?: StripeInlinePaymentPayload | null;
};

export const useInvoices = (ctx?: BillingAccountContext) => {
  const { user } = useAuth();
  return useQuery<StripeInvoice[], Error>({
    queryKey: ['invoices', user?.$id, ctx?.stripeCustomerId],
    queryFn: async () => {
      if (!user) return [];
      const result = await executeFunction<{ invoices: StripeInvoice[] }>(LIST_INVOICES_FUNCTION_ID, {
        stripeScope: 'invoices',
      });
      return result?.invoices ?? [];
    },
    enabled: stripeBillingEnabled(user?.$id, ctx),
    staleTime: 1000 * 60 * 2,
  });
};

export type UseStripePlansOptions = {
  /** When true, include hidden and non-sellable products (e.g. admin default-signup picker). */
  listAllProducts?: boolean;
};

export const useStripePlans = (ctx?: BillingAccountContext, options?: UseStripePlansOptions) => {
  const { user } = useAuth();
  const listAll = Boolean(options?.listAllProducts);
  return useQuery<StripePlan[], Error>({
    queryKey: ['stripePlans', user?.$id, ctx?.stripeCustomerId, listAll],
    queryFn: async () => {
      const response = await executeFunction<{ plans: StripePlan[] }>(STRIPE_LIST_PRODUCTS_FUNCTION_ID, {
        action: 'list',
        exclude_hidden: !listAll,
        exclude_non_sellable: !listAll,
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
    {
      priceId: string;
      returnUrl?: string;
      updateType?: 'upgrade' | 'downgrade';
      /** Attached card to use when the customer has no default payment method */
      paymentMethodId?: string;
    }
  >({
    mutationFn: async ({ priceId, returnUrl, updateType, paymentMethodId }) => {
      const baseUrl = returnUrl ?? window.location.origin;
      const result = await executeFunction<CheckoutSessionResult>(
        STRIPE_CREATE_CHECKOUT_SESSION_FUNCTION_ID,
        {
          priceId,
          returnUrl: baseUrl,
          updateType,
          ...(paymentMethodId ? { paymentMethodId } : {}),
        }
      );
      return result ?? {};
    },
    onSuccess: (data) => {
      if (data?.payment?.clientSecret) {
        return;
      }
      if (data?.url) {
        return;
      }
      if (data?.subscriptionId) {
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
        queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        notify.success('Plan updated', data.message ?? 'Your plan has been updated.');
      }
    },
    onError: (error) => {
      notify.error('Error', `Could not start checkout: ${error.message}`);
    },
  });
};

export type CancelSubscriptionResult = {
  success: boolean;
  message?: string;
  cancelAt?: number;
};

export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  const notify = useBillingNotify();
  return useMutation<CancelSubscriptionResult, Error, void>({
    mutationFn: async () => {
      return await executeFunction<CancelSubscriptionResult>(STRIPE_CANCEL_SUBSCRIPTION_FUNCTION_ID, {
        action: 'cancel',
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const endMsg = data.cancelAt
        ? `You keep access until ${new Date(data.cancelAt * 1000).toLocaleDateString('nl-NL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}.`
        : (data.message ?? 'Your subscription will end at the end of the billing period.');
      notify.success('Subscription cancelled', endMsg);
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

export type StripeCustomerBilling = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  address: SubscriptionDetailsCustomerAddress | null;
};

export const useStripeCustomerProfile = (
  ctx?: BillingAccountContext,
  options?: { enabled?: boolean }
) => {
  const { user } = useAuth();
  const enabled =
    (options?.enabled ?? true) && stripeBillingEnabled(user?.$id, ctx);
  return useQuery<StripeCustomerBilling | null, Error>({
    queryKey: ['stripeCustomerProfile', user?.$id, ctx?.stripeCustomerId],
    queryFn: async () => {
      const result = await executeFunction<{ success?: boolean; customer?: StripeCustomerBilling }>(
        STRIPE_PAYMENT_METHODS_FUNCTION_ID,
        { action: 'get-customer' }
      );
      return result?.customer ?? null;
    },
    enabled,
    staleTime: 1000 * 60 * 2,
  });
};

export type PaymentMethodsData = {
  paymentMethods: StripePaymentMethod[];
  /** Stripe customer `invoice_settings.default_payment_method` */
  defaultPaymentMethodId: string | null;
};

export const usePaymentMethods = (ctx?: BillingAccountContext) => {
  const { user } = useAuth();
  return useQuery<PaymentMethodsData, Error>({
    queryKey: ['paymentMethods', user?.$id, ctx?.stripeCustomerId],
    queryFn: async () => {
      if (!user) {
        return { paymentMethods: [], defaultPaymentMethodId: null };
      }
      const result = await executeFunction<{
        paymentMethods: StripePaymentMethod[];
        defaultPaymentMethodId?: string | null;
      }>(STRIPE_PAYMENT_METHODS_FUNCTION_ID, { action: 'list' });
      return {
        paymentMethods: result?.paymentMethods ?? [],
        defaultPaymentMethodId: result?.defaultPaymentMethodId ?? null,
      };
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

export const usePreviewProration = () => {
  const notify = useBillingNotify();
  return useMutation<
    StripeProrationPreviewResponse,
    Error,
    { subscriptionId: string; newPriceId: string }
  >({
    mutationFn: async ({ subscriptionId, newPriceId }) => {
      return await executeFunction<StripeProrationPreviewResponse>(GET_SUBSCRIPTION_FUNCTION_ID, {
        action: 'preview-proration',
        subscriptionId,
        newPriceId,
      });
    },
    onError: (error) => {
      notify.error('Preview', error.message || 'Could not load proration estimate.');
    },
  });
};

export const usePreparePayInvoice = () => {
  const queryClient = useQueryClient();
  const notify = useBillingNotify();
  return useMutation<PreparePayInvoiceResponse, Error, { invoiceId: string }>({
    mutationFn: async ({ invoiceId }) => {
      return await executeFunction<PreparePayInvoiceResponse>(LIST_INVOICES_FUNCTION_ID, {
        action: 'prepare-pay-invoice',
        invoiceId,
      });
    },
    onSuccess: (data) => {
      if (data.paid) {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
        queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
        notify.success('Invoice paid', 'Payment completed.');
      }
    },
    onError: (error) => {
      notify.error('Invoice', error.message || 'Could not prepare payment.');
    },
  });
};

export type UpdateBillingDetailsPayload = {
  name?: string;
  email?: string;
  phone?: string;
  address?: SubscriptionDetailsCustomerAddress | null;
};

export const useUpdateBillingDetails = () => {
  const queryClient = useQueryClient();
  const notify = useBillingNotify();
  return useMutation<void, Error, UpdateBillingDetailsPayload>({
    mutationFn: async (body) => {
      await executeFunction(STRIPE_PAYMENT_METHODS_FUNCTION_ID, {
        action: 'update-customer',
        ...body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
      queryClient.invalidateQueries({ queryKey: ['stripeCustomerProfile'] });
      notify.success('Billing details', 'Your billing information was updated.');
    },
    onError: (error) => {
      notify.error('Billing details', error.message || 'Could not save.');
    },
  });
};

export type EnsureStripeCustomerResult = {
  success: boolean;
  skipped?: boolean;
  stripeCustomerId?: string;
  message?: string;
};

export const useEnsureStripeCustomer = () => {
  const queryClient = useQueryClient();
  const notify = useBillingNotify();
  const { user } = useAuth();
  return useMutation<EnsureStripeCustomerResult, Error, void>({
    mutationFn: async () => {
      return await executeFunction<EnsureStripeCustomerResult>(STRIPE_CREATE_CUSTOMER_FUNCTION_ID, {
        action: 'ensure',
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['my-account-doc', user?.$id] });
      notify.success(
        'Billing ready',
        data.skipped ? 'Your billing profile was already set up.' : (data.message ?? 'Stripe customer created.'),
      );
    },
    onError: (error) => {
      notify.error('Billing setup', error.message || 'Could not set up billing.');
    },
  });
};

export const useCancelScheduledPlanChange = () => {
  const queryClient = useQueryClient();
  const notify = useBillingNotify();
  return useMutation<
    { success: boolean; scheduleId?: string },
    Error,
    { scheduleId?: string; subscriptionId?: string }
  >({
    mutationFn: async (payload) => {
      return await executeFunction<{ success: boolean; scheduleId?: string }>(
        STRIPE_CANCEL_SUBSCRIPTION_FUNCTION_ID,
        { action: 'cancel-schedule-update', ...payload }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
      notify.success('Plan change', 'Scheduled downgrade was cancelled.');
    },
    onError: (error) => {
      notify.error('Plan change', error.message || 'Could not cancel scheduled change.');
    },
  });
};
