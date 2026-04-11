import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffectiveIsAdmin } from '@/context/useEffectiveIsAdmin'
import { executeFunction, type ExecuteFunctionOptions } from '@/integrations/appwrite/executeFunction'
import { APPWRITE_FUNCTION_IDS } from '@/services/appwrite'
import type { AdminPlanDetailPayload } from '@/api/stripe/plans'
import { fetchAdminCatalogPlanDetail, fetchAdminCatalogPlans, fetchAdminSubscription } from '@/lib/stripeAdminApi'
import type { StripePlan } from '@/types'
import type {
  AdminFinanceDashboardResponse,
  AdminFinanceSummary,
  AdminPaymentIntentDetail,
  AdminPaymentIntentRow,
  AdminSubscriptionRow,
  FinanceDashboardPeriod,
} from './types'

/** Admin finance must attribute executions to the signed-in operator, not an impersonated user. */
function executeAdminFunction<TResponse = unknown, TPayload = unknown>(
  functionId: string,
  payload?: TPayload,
  options?: ExecuteFunctionOptions,
): Promise<TResponse> {
  return executeFunction<TResponse, TPayload>(functionId, payload, {
    ...options,
    omitImpersonationHeaders: true,
  })
}

const SUBS_FN = APPWRITE_FUNCTION_IDS.STRIPE_SUBSCRIPTIONS
const PRODUCTS_FN = APPWRITE_FUNCTION_IDS.STRIPE_PRODUCTS
const INVOICES_FN = APPWRITE_FUNCTION_IDS.STRIPE_INVOICES

export function useFinanceAdminEnabled() {
  return useEffectiveIsAdmin()
}

export function useFinanceSummary() {
  const enabled = useFinanceAdminEnabled()
  return useQuery<AdminFinanceSummary, Error>({
    queryKey: ['admin', 'finance', 'summary'],
    queryFn: async () => {
      const res = await executeAdminFunction<AdminFinanceSummary>(SUBS_FN, {
        action: 'admin-finance-summary',
      })
      if (!res?.success) throw new Error((res as { error?: string })?.error || 'Summary failed')
      return res
    },
    enabled,
    staleTime: 60_000,
  })
}

export function useFinanceDashboard(period: FinanceDashboardPeriod) {
  const enabled = useFinanceAdminEnabled()
  return useQuery<AdminFinanceDashboardResponse, Error>({
    queryKey: ['admin', 'finance', 'dashboard', period],
    queryFn: async () => {
      // Use optimized sync dashboard that returns fast (< 5 seconds)
      const res = await executeAdminFunction<AdminFinanceDashboardResponse>(SUBS_FN, {
        action: 'admin-finance-dashboard',
        period,
      })
      if (!res?.success) {
        const msg = (res as { error?: string } | null)?.error
        throw new Error(msg || 'Dashboard failed')
      }
      if (!res.stats) {
        throw new Error('Dashboard response missing stats (check stripe-consumer / admin-finance-dashboard).')
      }
      return res
    },
    enabled,
    staleTime: 60_000,
  })
}

export type UseFinanceDashboardDetailsOptions = {
  /** When false, the heavy details job is not started (e.g. run after `useFinanceDashboard` succeeds). */
  enabled?: boolean
}

/**
 * Fetch detailed dashboard statistics asynchronously.
 * This action makes many API calls and should not block the UI.
 * Returns execution ID that can be polled.
 */
export function useFinanceDashboardDetails(
  period: FinanceDashboardPeriod,
  options?: UseFinanceDashboardDetailsOptions,
) {
  const adminEnabled = useFinanceAdminEnabled()
  const startAllowed = options?.enabled !== false
  return useQuery<{ executionId: string }, Error>({
    queryKey: ['admin', 'finance', 'dashboard-details', period, 'start'],
    queryFn: async () => {
      // Start async execution - returns immediately with execution ID
      const res = await executeAdminFunction<{ executionId: string }>(SUBS_FN, {
        action: 'admin-finance-dashboard-details',
        period,
        async: true,  // Request async execution
      })
      if (!res?.executionId) {
        throw new Error('Failed to start async dashboard details execution')
      }
      return res
    },
    enabled: adminEnabled && startAllowed,
    staleTime: 0,  // Don't cache - we want fresh polling every time
  })
}

export type AdminSubscriptionListParams = {
  status?: string
  priceId?: string
  productId?: string
  search?: string
  sortField?: string
  sortDir?: 'asc' | 'desc'
  maxPages?: number
}

export type UseAdminSubscriptionListOptions = {
  /** When false, the list request is not started (e.g. wait until another query finishes). */
  enabled?: boolean
}

export function useAdminSubscriptionList(
  params: AdminSubscriptionListParams,
  options?: UseAdminSubscriptionListOptions,
) {
  const adminEnabled = useFinanceAdminEnabled()
  const startAllowed = options?.enabled !== false
  return useQuery<{ subscriptions: AdminSubscriptionRow[]; fetchedPages: number }, Error>({
    queryKey: ['admin', 'finance', 'subscriptions', params],
    queryFn: async () => {
      const res = await executeAdminFunction<{
        success: boolean
        subscriptions?: AdminSubscriptionRow[]
        fetchedPages?: number
        error?: string
      }>(SUBS_FN, {
        action: 'admin-list-subscriptions',
        ...params,
      })
      if (!res?.success) throw new Error(res?.error || 'List failed')
      return {
        subscriptions: res.subscriptions ?? [],
        fetchedPages: res.fetchedPages ?? 0,
      }
    },
    enabled: adminEnabled && startAllowed,
    staleTime: 30_000,
  })
}

export type AdminSubscriptionDetailFromApi = Awaited<ReturnType<typeof fetchAdminSubscription>>

/**
 * Admin subscription detail via `GET /api/stripe/admin/subscriptions/:id`, implemented server-side with
 * `src/api/stripe/subscriptions.ts#getSubscription` (see `getStripeSubscriptionForAdmin` in `admin.ts`).
 * Does not use Appwrite Functions.
 */
export function useAdminSubscriptionDetails(subscriptionId: string | undefined) {
  const enabled = useFinanceAdminEnabled() && Boolean(subscriptionId)
  return useQuery<AdminSubscriptionDetailFromApi, Error>({
    queryKey: ['admin', 'finance', 'subscription', 'api', subscriptionId],
    queryFn: async () => fetchAdminSubscription(subscriptionId!),
    enabled,
    staleTime: 30_000,
  })
}

export type AdminStripePlansListData = {
  plans: StripePlan[]
  subscriptionCountsTruncated: boolean
}

export type UseAdminStripePlansListOptions = {
  /** When false, the plans request is not started (e.g. wait until another query finishes). */
  enabled?: boolean
}

/**
 * Admin plan list via `GET /api/stripe/admin/plans/catalog` → `listPlansForAdmin` in `src/api/stripe/plans.ts`.
 * Does not use Appwrite Functions.
 */
export function useAdminStripePlansList(options?: UseAdminStripePlansListOptions) {
  const adminEnabled = useFinanceAdminEnabled()
  const startAllowed = options?.enabled !== false
  return useQuery<AdminStripePlansListData, Error>({
    queryKey: ['admin', 'finance', 'plans', 'api', 'catalog'],
    queryFn: async () => fetchAdminCatalogPlans(),
    enabled: adminEnabled && startAllowed,
    staleTime: 120_000,
  })
}

/**
 * Plan detail via `GET /api/stripe/admin/plans/catalog/:productId` → `getPlanDetailForAdmin` in `plans.ts`.
 */
export function useAdminPlanDetail(productId: string | undefined) {
  const enabled = useFinanceAdminEnabled() && Boolean(productId)
  return useQuery<AdminPlanDetailPayload, Error>({
    queryKey: ['admin', 'finance', 'plan', 'api', 'catalog', productId],
    queryFn: async () => fetchAdminCatalogPlanDetail(productId!),
    enabled,
    staleTime: 60_000,
  })
}

export type AdminPaymentsListParams = {
  limit?: number
  customer?: string
  status?: string
}

export function useAdminPaymentsList(params: AdminPaymentsListParams) {
  const enabled = useFinanceAdminEnabled()
  return useQuery<{ orders: AdminPaymentIntentRow[] }, Error>({
    queryKey: ['admin', 'finance', 'payments', params],
    queryFn: async () => {
      const res = await executeAdminFunction<{ success?: boolean; orders?: AdminPaymentIntentRow[]; message?: string }>(
        INVOICES_FN,
        {
          action: 'admin-list-payment-intents',
          ...params,
        },
      )
      if (res && 'success' in res && res.success === false) {
        throw new Error(res.message || 'Payments list failed')
      }
      return { orders: res?.orders ?? [] }
    },
    enabled,
    staleTime: 30_000,
  })
}

export type AdminRecentInvoicesParams = {
  limit?: number
}

/** Account-wide recent invoices (Stripe `invoices.list`), via stripe-gateway `list-invoices`. */
export function useAdminRecentInvoicesList(params: AdminRecentInvoicesParams = {}) {
  const enabled = useFinanceAdminEnabled()
  const limit = Math.min(Math.max(params.limit ?? 25, 1), 100)
  return useQuery<{ invoices: Record<string, unknown>[] }, Error>({
    queryKey: ['admin', 'finance', 'invoices-recent', limit],
    queryFn: async () => {
      const res = await executeAdminFunction<{
        success?: boolean
        invoices?: Record<string, unknown>[]
        message?: string
      }>(INVOICES_FN, {
        action: 'list-invoices',
        limit,
      })
      if (res && 'success' in res && res.success === false) {
        throw new Error(res.message || 'Invoice list failed')
      }
      return { invoices: res?.invoices ?? [] }
    },
    enabled,
    staleTime: 30_000,
  })
}

/** Single invoice by id (Stripe `invoices.retrieve`), via stripe-gateway `get-invoice`. */
export function useAdminStripeInvoice(invoiceId: string | undefined) {
  const enabled = useFinanceAdminEnabled() && Boolean(invoiceId)
  return useQuery<{ invoice: Record<string, unknown> }, Error>({
    queryKey: ['admin', 'finance', 'invoice', invoiceId],
    queryFn: async () => {
      const res = await executeAdminFunction<{
        success?: boolean
        invoice?: Record<string, unknown>
        message?: string
      }>(INVOICES_FN, {
        action: 'get-invoice',
        invoice_id: invoiceId,
      })
      if (!res?.invoice) {
        throw new Error((res as { message?: string } | undefined)?.message || 'Invoice not found')
      }
      return { invoice: res.invoice }
    },
    enabled,
    staleTime: 60_000,
  })
}

export function useAdminPaymentDetail(paymentIntentId: string | undefined) {
  const enabled = useFinanceAdminEnabled() && Boolean(paymentIntentId)
  return useQuery<AdminPaymentIntentDetail, Error>({
    queryKey: ['admin', 'finance', 'payment', paymentIntentId],
    queryFn: async () => {
      const res = await executeAdminFunction<AdminPaymentIntentDetail>(INVOICES_FN, {
        action: 'admin-get-payment-intent',
        paymentIntentId,
      })
      if (!res?.success) throw new Error('Payment detail failed')
      return res
    },
    enabled,
    staleTime: 60_000,
  })
}

export function useAdminUpdatePlan() {
  const qc = useQueryClient()
  return useMutation<
    { success: boolean },
    Error,
    {
      productId: string
      name?: string
      description?: string
      sites_limit?: number
      library_limit?: number
      storage_limit?: number
      non_sellable?: boolean
      hidden?: boolean
    }
  >({
    mutationFn: async (body) => {
      const res = await executeAdminFunction<{ success?: boolean; message?: string }>(PRODUCTS_FN, {
        action: 'update',
        ...body,
      })
      if (!res?.success) throw new Error(res?.message || 'Update failed')
      return { success: true }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance', 'plans'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'finance', 'plan'] })
    },
  })
}

export function useAdminSetPlanActive() {
  const qc = useQueryClient()
  return useMutation<{ success: boolean }, Error, { productId: string; active: boolean }>({
    mutationFn: async ({ productId, active }) => {
      const res = await executeAdminFunction<{ success?: boolean; message?: string }>(PRODUCTS_FN, {
        action: 'set-active',
        productId,
        active,
      })
      if (!res?.success) throw new Error(res?.message || 'Archive failed')
      return { success: true }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance', 'plans'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'finance', 'plan'] })
    },
  })
}

export function useAdminSetPriceActive() {
  const qc = useQueryClient()
  return useMutation<{ success: boolean }, Error, { priceId: string; active: boolean }>({
    mutationFn: async ({ priceId, active }) => {
      const res = await executeAdminFunction<{ success?: boolean; message?: string }>(PRODUCTS_FN, {
        action: 'set-price-active',
        priceId,
        active,
      })
      if (!res?.success) throw new Error(res?.message || 'Price update failed')
      return { success: true }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance', 'plans'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'finance', 'plan'] })
    },
  })
}

export type AdminDeletePlanResponse = {
  success: boolean
  mode?: 'deleted' | 'archived' | 'retired'
  message?: string
  migratedCount?: number
  failedMigrations?: { subscriptionId: string; error: string }[]
  subscriptionCount?: number
  remainingCount?: number
}

export function useAdminDeletePlan() {
  const qc = useQueryClient()
  return useMutation<
    AdminDeletePlanResponse,
    Error,
    {
      productId: string
      migrateSubscribers: boolean
      targetPriceId?: string
      proration_behavior?: 'always_invoice' | 'none'
    }
  >({
    mutationFn: async (body) => {
      const res = await executeAdminFunction<AdminDeletePlanResponse>(
        PRODUCTS_FN,
        {
          action: 'delete-plan',
          productId: body.productId,
          migrateSubscribers: body.migrateSubscribers,
          targetPriceId: body.targetPriceId,
          proration_behavior: body.proration_behavior,
        },
        { longRunning: true, maxAsyncWaitMs: 180_000 },
      )
      if (!res?.success) throw new Error(res?.message || 'Delete plan failed')
      return res
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
    },
  })
}

export function useAdminCreatePrice() {
  const qc = useQueryClient()
  return useMutation<
    { success: boolean; priceId?: string },
    Error,
    { productId: string; amount: number; interval: 'month' | 'year'; currency?: string }
  >({
    mutationFn: async (body) => {
      const res = await executeAdminFunction<{ success?: boolean; priceId?: string; message?: string }>(
        PRODUCTS_FN,
        {
          action: 'create-price',
          product_id: body.productId,
          amount: body.amount,
          interval: body.interval,
          currency: body.currency ?? 'eur',
        },
      )
      if (!res?.success) throw new Error(res?.message || 'Create price failed')
      return { success: true, priceId: res.priceId }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance', 'plans'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'finance', 'plan'] })
    },
  })
}

export function useAdminCancelSubscription() {
  const qc = useQueryClient()
  return useMutation<{ success: boolean }, Error, { subscriptionId: string; immediate?: boolean }>({
    mutationFn: async ({ subscriptionId, immediate }) => {
      const res = await executeAdminFunction<{ success?: boolean; error?: string }>(SUBS_FN, {
        action: 'admin-cancel-subscription',
        subscriptionId,
        immediate: Boolean(immediate),
      })
      if (!res?.success) throw new Error(res?.error || 'Cancel failed')
      return { success: true }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
    },
  })
}

export function useAdminPauseSubscription() {
  const qc = useQueryClient()
  return useMutation<{ success: boolean }, Error, { subscriptionId: string; behavior?: 'void' | 'mark_uncollectible' }>(
    {
      mutationFn: async ({ subscriptionId, behavior }) => {
        const res = await executeAdminFunction<{ success?: boolean; error?: string }>(SUBS_FN, {
          action: 'admin-pause-subscription',
          subscriptionId,
          behavior: behavior ?? 'mark_uncollectible',
        })
        if (!res?.success) throw new Error(res?.error || 'Pause failed')
        return { success: true }
      },
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
      },
    },
  )
}

export function useAdminResumeSubscription() {
  const qc = useQueryClient()
  return useMutation<{ success: boolean }, Error, { subscriptionId: string }>({
    mutationFn: async ({ subscriptionId }) => {
      const res = await executeAdminFunction<{ success?: boolean; error?: string }>(SUBS_FN, {
        action: 'admin-resume-subscription',
        subscriptionId,
      })
      if (!res?.success) throw new Error(res?.error || 'Resume failed')
      return { success: true }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
    },
  })
}

export function useAdminArchiveSubscription() {
  const qc = useQueryClient()
  return useMutation<
    { success: boolean },
    Error,
    { subscriptionId: string; cancelAtPeriodEnd?: boolean; immediate?: boolean }
  >({
    mutationFn: async (body) => {
      const res = await executeAdminFunction<{ success?: boolean; error?: string }>(SUBS_FN, {
        action: 'admin-archive-subscription',
        ...body,
      })
      if (!res?.success) throw new Error(res?.error || 'Archive failed')
      return { success: true }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
    },
  })
}

export function useAdminUpdateSubscriptionPrice() {
  const qc = useQueryClient()
  return useMutation<
    { success: boolean },
    Error,
    {
      subscriptionId: string
      newPriceId: string
      proration_behavior?: 'always_invoice' | 'none'
      sameProductOnly?: boolean
    }
  >({
    mutationFn: async (body) => {
      const res = await executeAdminFunction<{ success?: boolean; error?: string }>(SUBS_FN, {
        action: 'admin-update-subscription-price',
        subscriptionId: body.subscriptionId,
        newPriceId: body.newPriceId,
        proration_behavior: body.proration_behavior,
        sameProductOnly: body.sameProductOnly ?? true,
      })
      if (!res?.success) throw new Error(res?.error || 'Plan change failed')
      return { success: true }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
    },
  })
}
