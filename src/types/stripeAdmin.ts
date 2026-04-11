/**
 * JSON shapes returned by `/api/stripe/admin/*` (live Stripe data, serialized).
 */
import type { BillingAdminStats } from '@/types/stripe';

export interface StripeAdminDashboardStats extends BillingAdminStats {
  /** Successful PaymentIntents in the last 24h (approximate). */
  livePayments24h: number;
  /** Total subscription count (all statuses), capped server-side if needed. */
  totalSubscriptions?: number;
}

/** Flattened row for admin subscription table (optional helper; often derived client-side). */
export interface AdminSubscriptionTableRow {
  id: string;
  customerId: string;
  customerEmail: string | null;
  customerName: string | null;
  customerAddress: string | null;
  status: string;
  planLabel: string;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  billingInterval: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface AdminBillingOverviewPayload {
  recentInvoices: Record<string, unknown>[];
  failedPayments: Record<string, unknown>[];
}

export interface AdminPlansCatalogPayload {
  catalog: Array<{
    product: Record<string, unknown>;
    prices: Record<string, unknown>[];
  }>;
}
