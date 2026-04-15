/**
 * Server-only — admin payment intent list/detail (Stripe SDK).
 */
import type { AdminPaymentIntentDetail, AdminPaymentIntentRow } from '@/domains/admin/finance/types';

import { getStripeFromEnv } from './client';

/**
 * Fields read from PaymentIntent list/retrieve (expanded customer, invoice, latest_charge).
 * Stripe SDK `PaymentIntent` often resolves to `unknown` with `moduleResolution: "bundler"` (TS 18046); see `src/types/stripe.ts`.
 */
interface StripePaymentIntentForAdmin {
  id: string;
  amount: number;
  amount_received?: number | null;
  currency: string;
  status: string | null;
  created: number;
  description: string | null;
  receipt_email?: string | null;
  customer: unknown;
  invoice?: unknown;
  metadata?: Record<string, string> | null;
  last_payment_error?: unknown;
  latest_charge?: unknown;
}

interface StripeCustomerExpanded {
  id: string;
  email?: string | null;
  name?: string | null;
  deleted?: boolean;
}

interface StripeInvoiceExpanded {
  id: string;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  number?: string | null;
}

interface StripeChargeExpanded {
  id: string;
  amount: number;
  currency: string;
  status?: string | null;
  paid?: boolean;
  receipt_url?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
  billing_details?: unknown;
}

/**
 * Narrow to the calls we make so `.paymentIntents` type-checks (SDK instance typing can be lossy under `moduleResolution: "bundler"`).
 */
type StripeWithPaymentIntents = {
  paymentIntents: {
    list(params: {
      limit: number;
      customer?: string;
      expand?: string[];
    }): Promise<{ data: StripePaymentIntentForAdmin[] }>;
    retrieve(
      id: string,
      params?: { expand?: string[] }
    ): Promise<StripePaymentIntentForAdmin>;
  };
};

export async function listAdminPaymentIntentRows(params: {
  limit?: number;
  customer?: string;
  status?: string;
}): Promise<{ orders: AdminPaymentIntentRow[] }> {
  const stripeClient = getStripeFromEnv() as unknown as StripeWithPaymentIntents;
  const lim = Math.min(Math.max(params.limit ?? 50, 1), 100);
  /** Stripe v17+ `PaymentIntentListParams` has no `status` — filter results after list. */
  const list = await stripeClient.paymentIntents.list({
    limit: lim,
    customer: params.customer,
    expand: ['data.customer', 'data.invoice'],
  });

  const listData = list.data as StripePaymentIntentForAdmin[];
  const data = params.status
    ? listData.filter((pi) => pi.status === params.status)
    : listData;

  const orders: AdminPaymentIntentRow[] = data.map((pi) => {
    const cust = pi.customer;
    const customer =
      typeof cust === 'string'
        ? cust
        : cust && typeof cust === 'object' && 'id' in cust
          ? (cust as StripeCustomerExpanded).id
          : null;
    let email: string | null = null;
    if (typeof cust === 'object' && cust !== null && !('deleted' in cust && (cust as StripeCustomerExpanded).deleted)) {
      email = (cust as StripeCustomerExpanded).email ?? null;
    }
    const inv = pi.invoice;
    const invoiceObj: StripeInvoiceExpanded | null =
      typeof inv === 'object' && inv !== null && 'id' in inv ? (inv as StripeInvoiceExpanded) : null;
    return {
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      status: pi.status ?? '',
      customer,
      email,
      date: pi.created,
      description: pi.description,
      invoice: invoiceObj
        ? {
            id: invoiceObj.id,
            hosted_invoice_url: invoiceObj.hosted_invoice_url ?? null,
            invoice_pdf: invoiceObj.invoice_pdf ?? null,
            number: invoiceObj.number ?? null,
          }
        : null,
    };
  });

  return { orders };
}

export async function getAdminPaymentIntentDetail(paymentIntentId: string): Promise<AdminPaymentIntentDetail> {
  const stripeClient = getStripeFromEnv() as unknown as StripeWithPaymentIntents;
  const pi = (await stripeClient.paymentIntents.retrieve(paymentIntentId, {
    expand: ['customer', 'latest_charge', 'invoice'],
  })) as StripePaymentIntentForAdmin;

  const cust = pi.customer;
  let customer: AdminPaymentIntentDetail['paymentIntent']['customer'] = null;
  if (typeof cust === 'object' && cust !== null && !('deleted' in cust && (cust as StripeCustomerExpanded).deleted)) {
    const c = cust as StripeCustomerExpanded;
    customer = { id: c.id, email: c.email ?? null, name: c.name ?? null };
  }

  let charge: AdminPaymentIntentDetail['charge'] = null;
  const lc = pi.latest_charge;
  if (typeof lc === 'object' && lc !== null && 'id' in lc) {
    const ch = lc as StripeChargeExpanded;
    charge = {
      id: ch.id,
      amount: ch.amount,
      currency: ch.currency,
      status: ch.status ?? '',
      paid: ch.paid ?? false,
      receipt_url: ch.receipt_url ?? null,
      failure_code: ch.failure_code ?? null,
      failure_message: ch.failure_message ?? null,
      billing_details: ch.billing_details,
    };
  }

  return {
    success: true,
    paymentIntent: {
      id: pi.id,
      amount: pi.amount,
      amount_received: pi.amount_received ?? 0,
      currency: pi.currency,
      status: pi.status ?? '',
      created: pi.created,
      description: pi.description,
      receipt_email: pi.receipt_email ?? null,
      customer,
      metadata: pi.metadata ? { ...pi.metadata } : {},
      last_payment_error: pi.last_payment_error,
    },
    charge,
  };
}
