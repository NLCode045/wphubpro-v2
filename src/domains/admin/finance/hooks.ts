import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/domains/auth'
import { executeFunction } from '@/integrations/appwrite/executeFunction'
import { APPWRITE_FUNCTION_IDS } from '@/services/appwrite'
import type { StripePlan, SubscriptionDetailsResponse } from '@/types'
import type {
  AdminFinanceDashboardResponse,
  AdminFinanceSummary,
  AdminPaymentIntentDetail,
  AdminPaymentIntentRow,
  AdminSubscriptionRow,
  FinanceDashboardPeriod,
} from './types'

const SUBS_FN = APPWRITE_FUNCTION_IDS.STRIPE_SUBSCRIPTIONS
const PRODUCTS_FN = APPWRITE_FUNCTION_IDS.STRIPE_PRODUCTS
const INVOICES_FN = APPWRITE_FUNCTION_IDS.STRIPE_INVOICES

export function useFinanceAdminEnabled() {
  const { isAdmin } = useAuth()
  return Boolean(isAdmin)
}

export function useFinanceSummary() {
  const enabled = useFinanceAdminEnabled()
  return useQuery<AdminFinanceSummary, Error>({
    queryKey: ['admin', 'finance', 'summary'],
    queryFn: async () => {
      const res = await executeFunction<AdminFinanceSummary>(SUBS_FN, {
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
      const res = await executeFunction<AdminFinanceDashboardResponse>(
        SUBS_FN,
        { action: 'admin-finance-dashboard', period },
        { longRunning: true, maxAsyncWaitMs: 120_000 },
      )
      if (!res?.success) throw new Error((res as { error?: string })?.error || 'Dashboard failed')
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

export function useAdminSubscriptionList(params: AdminSubscriptionListParams) {
  const enabled = useFinanceAdminEnabled()
  return useQuery<{ subscriptions: AdminSubscriptionRow[]; fetchedPages: number }, Error>({
    queryKey: ['admin', 'finance', 'subscriptions', params],
    queryFn: async () => {
      const res = await executeFunction<{
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
    enabled,
    staleTime: 30_000,
  })
}

export function useAdminSubscriptionDetails(subscriptionId: string | undefined) {
  const enabled = useFinanceAdminEnabled() && Boolean(subscriptionId)
  return useQuery<SubscriptionDetailsResponse, Error>({
    queryKey: ['admin', 'finance', 'subscription', subscriptionId],
    queryFn: async () => {
      return await executeFunction<SubscriptionDetailsResponse>(SUBS_FN, {
        action: 'admin-get-details',
        subscriptionId,
      })
    },
    enabled,
    staleTime: 30_000,
  })
}

export function useAdminStripePlansList() {
  const enabled = useFinanceAdminEnabled()
  return useQuery<StripePlan[], Error>({
    queryKey: ['admin', 'finance', 'plans'],
    queryFn: async () => {
      const res = await executeFunction<{ plans?: StripePlan[] }>(PRODUCTS_FN, {
        action: 'list',
        active_only: false,
        exclude_hidden: false,
        exclude_non_sellable: false,
      })
      return res.plans ?? []
    },
    enabled,
    staleTime: 120_000,
  })
}

export type AdminPlanDetailResponse = {
  success: boolean
  plan: {
    id: string
    name: string
    description: string
    status: string
    monthlyPrice: number
    yearlyPrice: number
    monthlyPriceId: string | null
    yearlyPriceId: string | null
    currency: string
    metadata: { key: string; value: string }[]
    stripeLink: string
  }
  stats: {
    totalSubscriptions: number
    subscriptionsMonthly: number
    subscriptionsYearly: number
    totalEarnings: number
    upgradedTo: number
    downgradedTo: number
    downgradedFrom: number
  }
  subscribers: Array<{
    subscriptionId: string
    customerId: string
    email: string
    name: string
    billingInterval: string
    subscribedSince: number
    status: string
    userId?: string | null
  }>
}

export function useAdminPlanDetail(productId: string | undefined) {
  const enabled = useFinanceAdminEnabled() && Boolean(productId)
  return useQuery<AdminPlanDetailResponse, Error>({
    queryKey: ['admin', 'finance', 'plan', productId],
    queryFn: async () => {
      const res = await executeFunction<AdminPlanDetailResponse>(PRODUCTS_FN, {
        action: 'get',
        productId,
      })
      if (!res?.success) throw new Error('Plan detail failed')
      return res
    },
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
      const res = await executeFunction<{ success?: boolean; orders?: AdminPaymentIntentRow[]; message?: string }>(
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

export function useAdminPaymentDetail(paymentIntentId: string | undefined) {
  const enabled = useFinanceAdminEnabled() && Boolean(paymentIntentId)
  return useQuery<AdminPaymentIntentDetail, Error>({
    queryKey: ['admin', 'finance', 'payment', paymentIntentId],
    queryFn: async () => {
      const res = await executeFunction<AdminPaymentIntentDetail>(INVOICES_FN, {
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
      const res = await executeFunction<{ success?: boolean; message?: string }>(PRODUCTS_FN, {
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
      const res = await executeFunction<{ success?: boolean; message?: string }>(PRODUCTS_FN, {
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
      const res = await executeFunction<{ success?: boolean; message?: string }>(PRODUCTS_FN, {
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
      const res = await executeFunction<AdminDeletePlanResponse>(
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
      const res = await executeFunction<{ success?: boolean; priceId?: string; message?: string }>(
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
      const res = await executeFunction<{ success?: boolean; error?: string }>(SUBS_FN, {
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
        const res = await executeFunction<{ success?: boolean; error?: string }>(SUBS_FN, {
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
      const res = await executeFunction<{ success?: boolean; error?: string }>(SUBS_FN, {
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
      const res = await executeFunction<{ success?: boolean; error?: string }>(SUBS_FN, {
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
      const res = await executeFunction<{ success?: boolean; error?: string }>(SUBS_FN, {
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
