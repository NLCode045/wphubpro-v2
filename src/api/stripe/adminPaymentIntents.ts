/**
 * Server-only — admin payment intent list/detail (Stripe SDK).
 */
import type { AdminPaymentIntentDetail, AdminPaymentIntentRow } from '@/domains/admin/finance/types';
import type { StripePaymentIntent } from '@/types/stripe';

import { getStripeFromEnv } from './client';

export async function listAdminPaymentIntentRows(params: {
  limit?: number;
  customer?: string;
  status?: string;
}): Promise<{ orders: AdminPaymentIntentRow[] }> {
  const stripeClient = getStripeFromEnv();
  const lim = Math.min(Math.max(params.limit ?? 50, 1), 100);
  /** Stripe v17+ `PaymentIntentListParams` has no `status` — filter results after list. */
  const list = await stripeClient.paymentIntents.list({
    limit: lim,
    customer: params.customer,
    expand: ['data.customer', 'data.invoice'],
  });

  const listData = list.data as StripePaymentIntent[];
  const data = params.status
    ? listData.filter((pi: StripePaymentIntent) => pi.status === params.status)
    : listData;

  const orders: AdminPaymentIntentRow[] = data.map((pi: StripePaymentIntent) => {
    const cust = pi.customer;
    const customer = typeof cust === 'string' ? cust : cust && 'id' in cust ? cust.id : null;
    let email: string | null = null;
    if (typeof cust === 'object' && cust && !('deleted' in cust && cust.deleted)) {
      email = cust.email ?? null;
    }
    const inv = pi.invoice;
    const invoiceObj =
      typeof inv === 'object' && inv && 'id' in inv
        ? inv
        : null;
    return {
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      status: pi.status,
      customer,
      email,
      date: pi.created,
      description: pi.description,
      invoice: invoiceObj
        ? {
            id: invoiceObj.id,
            hosted_invoice_url: invoiceObj.hosted_invoice_url ?? null,
            invoice_pdf: invoiceObj.invoice_pdf ?? null,
            number: invoiceObj.number,
          }
        : null,
    };
  });

  return { orders };
}

export async function getAdminPaymentIntentDetail(paymentIntentId: string): Promise<AdminPaymentIntentDetail> {
  const stripeClient = getStripeFromEnv();
  const pi = await stripeClient.paymentIntents.retrieve(paymentIntentId, {
    expand: ['customer', 'latest_charge', 'invoice'],
  });

  const cust = pi.customer;
  let customer: AdminPaymentIntentDetail['paymentIntent']['customer'] = null;
  if (typeof cust === 'object' && cust && !('deleted' in cust && cust.deleted)) {
    customer = { id: cust.id, email: cust.email ?? null, name: cust.name ?? null };
  }

  let charge: AdminPaymentIntentDetail['charge'] = null;
  const lc = pi.latest_charge;
  if (typeof lc === 'object' && lc && 'id' in lc) {
    charge = {
      id: lc.id,
      amount: lc.amount,
      currency: lc.currency,
      status: lc.status ?? '',
      paid: lc.paid ?? false,
      receipt_url: lc.receipt_url ?? null,
      failure_code: lc.failure_code ?? null,
      failure_message: lc.failure_message ?? null,
      billing_details: lc.billing_details,
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
      receipt_email: pi.receipt_email,
      customer,
      metadata: pi.metadata ? { ...pi.metadata } : {},
      last_payment_error: pi.last_payment_error,
    },
    charge,
  };
}
