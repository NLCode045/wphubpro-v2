import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffectiveIsAdmin } from '@/context/useEffectiveIsAdmin'
import type { AdminPlanDetailPayload } from '@/api/stripe/plans'
import {
  fetchAdminCatalogPlanDetail,
  fetchAdminCatalogPlans,
  fetchAdminFinanceDashboard,
  fetchAdminInvoice,
  fetchAdminInvoicesRecent,
  fetchAdminPaymentIntentDetail,
  fetchAdminPaymentIntents,
  fetchAdminSubscription,
  fetchAdminSubscriptionRows,
  postAdminCreatePriceMajor,
  postAdminPlanCatalogMetadata,
  postAdminPriceActive,
  postAdminProductActive,
  postAdminSubscriptionCancel,
  postAdminSubscriptionChangePrice,
  postAdminSubscriptionPause,
  postAdminSubscriptionResume,
} from '@/lib/stripeAdminApi'
import type { StripePlan } from '@/types'
import type {
  AdminFinanceDashboardResponse,
  AdminPaymentIntentDetail,
  AdminPaymentIntentRow,
  AdminSubscriptionRow,
  FinanceDashboardPeriod,
} from './types'

export function useFinanceAdminEnabled() {
  return useEffectiveIsAdmin()
}

export function useFinanceDashboard(period: FinanceDashboardPeriod) {
  const enabled = useFinanceAdminEnabled()
  return useQuery<AdminFinanceDashboardResponse, Error>({
    queryKey: ['admin', 'finance', 'dashboard', period],
    queryFn: async () => {
      const res = await fetchAdminFinanceDashboard(period)
      if (!res?.success) {
        const msg = (res as { error?: string } | null)?.error
        throw new Error(msg || 'Dashboard failed')
      }
      if (!res.stats) {
        throw new Error('Dashboard response missing stats (check `/api/stripe/admin/finance-dashboard` on your API host).')
      }
      return res
    },
    enabled,
    staleTime: 60_000,
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
    queryFn: () => fetchAdminSubscriptionRows(params),
    enabled: adminEnabled && startAllowed,
    staleTime: 30_000,
  })
}

export type AdminSubscriptionDetailFromApi = Awaited<ReturnType<typeof fetchAdminSubscription>>

/**
 * Admin subscription detail via `GET /api/stripe/admin/subscriptions/:id` (server: `subscriptions.ts#getSubscription`).
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
    queryFn: () => fetchAdminPaymentIntents(params),
    enabled,
    staleTime: 30_000,
  })
}

export type AdminRecentInvoicesParams = {
  limit?: number
}

/** Account-wide recent invoices via `GET /api/stripe/admin/invoices/recent`. */
export function useAdminRecentInvoicesList(params: AdminRecentInvoicesParams = {}) {
  const enabled = useFinanceAdminEnabled()
  const limit = Math.min(Math.max(params.limit ?? 25, 1), 100)
  return useQuery<{ invoices: Record<string, unknown>[] }, Error>({
    queryKey: ['admin', 'finance', 'invoices-recent', limit],
    queryFn: () => fetchAdminInvoicesRecent(limit),
    enabled,
    staleTime: 30_000,
  })
}

/** Single invoice by id — `GET /api/stripe/admin/billing/invoices/:invoiceId`. */
export function useAdminStripeInvoice(invoiceId: string | undefined) {
  const enabled = useFinanceAdminEnabled() && Boolean(invoiceId)
  return useQuery<{ invoice: Record<string, unknown> }, Error>({
    queryKey: ['admin', 'finance', 'invoice', invoiceId],
    queryFn: () => fetchAdminInvoice(invoiceId!),
    enabled,
    staleTime: 60_000,
  })
}

export function useAdminPaymentDetail(paymentIntentId: string | undefined) {
  const enabled = useFinanceAdminEnabled() && Boolean(paymentIntentId)
  return useQuery<AdminPaymentIntentDetail, Error>({
    queryKey: ['admin', 'finance', 'payment', paymentIntentId],
    queryFn: () => fetchAdminPaymentIntentDetail(paymentIntentId!),
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
      await postAdminPlanCatalogMetadata(body)
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
      await postAdminProductActive({ productId, active })
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
      await postAdminPriceActive({ priceId, active })
      return { success: true }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance', 'plans'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'finance', 'plan'] })
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
      const res = await postAdminCreatePriceMajor(body)
      const id = res.price && typeof res.price === 'object' && 'id' in res.price ? String(res.price.id) : undefined
      return { success: true, priceId: id }
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
      await postAdminSubscriptionCancel(subscriptionId, { immediate: Boolean(immediate) })
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
        await postAdminSubscriptionPause(subscriptionId, { behavior: behavior ?? 'mark_uncollectible' })
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
      await postAdminSubscriptionResume(subscriptionId)
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
      await postAdminSubscriptionCancel(body.subscriptionId, { immediate: body.immediate === true })
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
      await postAdminSubscriptionChangePrice(body.subscriptionId, {
        newPriceId: body.newPriceId,
        proration_behavior: body.proration_behavior,
        sameProductOnly: body.sameProductOnly ?? true,
      })
      return { success: true }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
    },
  })
}
