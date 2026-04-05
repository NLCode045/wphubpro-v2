export type AdminSubscriptionRow = {
  subscriptionId: string
  status: string
  startDate: number
  endDate: number | null
  currentPeriodEnd: number
  nextBillingDate: number
  billingCycle: string | null
  billingIntervalCount: number
  planName: string | null
  priceId: string | null
  productId: string | null
  customerId: string | null
  customerEmail: string | null
  customerName: string | null
  cancelAtPeriodEnd: boolean
  hubArchived: boolean
  userId: string | null
  username: string | null
}

export type AdminFinanceSummary = {
  success: boolean
  subscriptionCountsByStatus: Record<string, number>
  approximateMrrCents: number
  approximateMrr: number
  note?: string
  recentFailedPaymentIntents7d: number
  lastPaidInvoicesSample: Array<{
    id: string
    amount_paid: number
    currency: string
    created: number
    customer: string | null
  }>
  revenueFromLast30PaidInvoicesCents: number
}

export type AdminPaymentIntentRow = {
  id: string
  amount: number
  currency: string
  status: string
  customer: string | null
  email: string | null
  date: number
  description?: string | null
  invoice: {
    id: string
    hosted_invoice_url: string | null
    invoice_pdf: string | null
    number: string | null
  } | null
}

export type FinanceDashboardPeriod = 'day' | 'week' | 'month' | 'year'

export type AdminFinanceDashboardResponse = {
  success: boolean
  period: FinanceDashboardPeriod
  rangeLabel: string
  windowStart: number
  windowEnd: number
  recentPaidInvoices: Array<{
    id: string
    number: string | null
    amount_paid: number
    currency: string
    created: number
    customerId: string | null
    customerDisplayName: string
    subscriptionId: string | null
  }>
  recentSubscriptionChanges: Array<{
    id: string
    created: number
    subscriptionId: string
    customerId: string | null
    userDisplayName: string
    planName: string
    amountCents: number
    currency: string
    action: string
  }>
  stats: {
    buckets: Array<{
      label: string
      start: number
      end: number
      revenueCents: number
      newSubscriptions: number
      cancellations: number
      upgrades: number
      downgrades: number
      cumulativeNetSubscriptions: number
    }>
    kpis: {
      activeSubscriptionsNow: number
      newInPeriod: number
      canceledInPeriod: number
      revenueInPeriodCents: number
      revenueAllTimeCents: number
      revenueAllTimeTruncated: boolean
      upgradesInPeriod: number
      downgradesInPeriod: number
    }
    byPlan: Array<{ productId: string; name: string; count: number }>
    truncated?: boolean
    upgradeDowngradeNote?: string
    rangeLabel?: string
  }
}

export type AdminPaymentIntentDetail = {
  success: boolean
  paymentIntent: {
    id: string
    amount: number
    amount_received: number
    currency: string
    status: string
    created: number
    description: string | null
    receipt_email: string | null
    customer: { id: string; email: string | null; name: string | null } | null
    metadata: Record<string, string>
    last_payment_error: unknown
  }
  charge: {
    id: string
    amount: number
    currency: string
    status: string
    paid: boolean
    receipt_url: string | null
    failure_code: string | null
    failure_message: string | null
    billing_details: unknown
  } | null
}
