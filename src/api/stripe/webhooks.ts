/**
 * Server-only — raw body + signing secret. Do not import from React components.
 */
import Stripe from 'stripe';

import { getStripeFromEnv } from './client';

type StripeInstance = InstanceType<typeof Stripe>;

export interface VerifyWebhookParams {
  rawBody: string | Buffer;
  signature: string | null | undefined;
}

/**
 * Verifies `Stripe-Signature` using `STRIPE_WEBHOOK_SECRET` (set in Appwrite / your API route env).
 */
export function verifyStripeWebhookEvent(
  params: VerifyWebhookParams,
): ReturnType<StripeInstance['webhooks']['constructEvent']> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.trim()) {
    throw new Error('STRIPE_WEBHOOK_SECRET is required for webhook verification');
  }
  if (!params.signature?.trim()) {
    throw new Error('Missing Stripe-Signature header');
  }
  const stripe = getStripeFromEnv();
  return stripe.webhooks.constructEvent(params.rawBody, params.signature, secret);
}

/**
 * Baseline handlers — extend with email/receipt logic; billing state stays live in Stripe.
 */
export async function handleStripeWebhookEvent(
  event: Stripe.Event,
): Promise<{ ok: boolean; detail: string }> {
  switch (event.type) {
    case 'invoice.paid':
      return { ok: true, detail: 'invoice payment recorded in Stripe' };
    case 'invoice.payment_failed':
      return { ok: true, detail: 'invoice payment failed (notify customer)' };
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return { ok: true, detail: 'subscription lifecycle event' };
    case 'checkout.session.completed':
      return { ok: true, detail: 'checkout completed' };
    default:
      return { ok: true, detail: `ignored: ${event.type}` };
  }
}
