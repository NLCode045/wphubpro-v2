/**
 * Server-only — live subscription reads/writes in Stripe. Do not import from React components.
 */
import type { StripeSubscription, StripeSubscriptionCreatePaymentBehavior } from '@/types/stripe';

import { getStripeFromEnv, type StripeClient } from './client';

/** Stripe `expand` expects `string[]`, not a readonly tuple (TS4104). */
const SUBSCRIPTION_EXPAND: string[] = [
  'latest_invoice',
  'latest_invoice.payment_intent',
  'items.data.price.product',
  'default_payment_method',
  'customer',
];

/**
 * Live subscriptions for a Stripe customer id (from Appwrite `prefs.stripe_customer_id`).
 */
export async function listSubscriptionsForCustomer(
  customerId: string,
): Promise<Awaited<ReturnType<StripeClient['subscriptions']['list']>>> {
  const stripe = getStripeFromEnv();
  return stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
    expand: ['data.default_payment_method', 'data.items.data.price.product', 'data.latest_invoice'],
  });
}

/** Used by admin subscription detail via `admin.ts` → `getStripeSubscriptionForAdmin`. */
export async function getSubscription(subscriptionId: string): Promise<StripeSubscription> {
  const stripe = getStripeFromEnv();
  return (await stripe.subscriptions.retrieve(subscriptionId, {
    expand: SUBSCRIPTION_EXPAND,
  })) as StripeSubscription;
}

export interface CreateSubscriptionBody {
  customerId: string;
  priceId: string;
  paymentBehavior?: StripeSubscriptionCreatePaymentBehavior;
}

export interface UpdateSubscriptionBody {
  subscriptionId: string;
  priceId: string;
}

/**
 * POST: create a new subscription for the customer + price.
 */
export async function createSubscription(
  body: CreateSubscriptionBody,
): Promise<Awaited<ReturnType<StripeClient['subscriptions']['create']>>> {
  const stripe = getStripeFromEnv();
  return stripe.subscriptions.create({
    customer: body.customerId,
    items: [{ price: body.priceId }],
    payment_behavior: body.paymentBehavior ?? 'default_incomplete',
    expand: SUBSCRIPTION_EXPAND,
  });
}

/**
 * POST: move an existing subscription to a new price (first item).
 */
export async function updateSubscriptionPrice(
  body: UpdateSubscriptionBody,
): Promise<Awaited<ReturnType<StripeClient['subscriptions']['update']>>> {
  const stripe = getStripeFromEnv();
  const current = (await stripe.subscriptions.retrieve(body.subscriptionId, {
    expand: ['items.data.price'],
  })) as StripeSubscription;
  const itemId = current.items.data[0]?.id;
  if (!itemId) {
    throw new Error('Subscription has no line items to update');
  }

  return stripe.subscriptions.update(body.subscriptionId, {
    items: [{ id: itemId, price: body.priceId }],
    proration_behavior: 'create_prorations',
    expand: SUBSCRIPTION_EXPAND,
  });
}

/** Admin plan change — optional proration behavior (defaults to create_prorations). */
export async function updateSubscriptionPriceAdmin(
  body: UpdateSubscriptionBody & { proration_behavior?: 'always_invoice' | 'none' },
): Promise<Awaited<ReturnType<StripeClient['subscriptions']['update']>>> {
  const stripe = getStripeFromEnv();
  const current = (await stripe.subscriptions.retrieve(body.subscriptionId, {
    expand: ['items.data.price'],
  })) as StripeSubscription;
  const itemId = current.items.data[0]?.id;
  if (!itemId) {
    throw new Error('Subscription has no line items to update');
  }
  let proration: 'create_prorations' | 'none' | 'always_invoice' = 'create_prorations';
  if (body.proration_behavior === 'none') proration = 'none';
  else if (body.proration_behavior === 'always_invoice') proration = 'always_invoice';

  return stripe.subscriptions.update(body.subscriptionId, {
    items: [{ id: itemId, price: body.priceId }],
    proration_behavior: proration,
    expand: SUBSCRIPTION_EXPAND,
  });
}
