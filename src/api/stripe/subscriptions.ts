/**
 * Server-only — live subscription reads/writes in Stripe. Do not import from React components.
 */
import type { Stripe as StripeNs } from 'stripe';
import StripeNode from 'stripe';

import { getStripeFromEnv } from './client';

type StripeInstance = InstanceType<typeof StripeNode>;

const SUBSCRIPTION_EXPAND: StripeNs.SubscriptionRetrieveParams['expand'] = [
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
): Promise<Awaited<ReturnType<StripeInstance['subscriptions']['list']>>> {
  const stripe = getStripeFromEnv();
  return stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
    expand: ['data.default_payment_method', 'data.items.data.price.product', 'data.latest_invoice'],
  });
}

/** Used by admin subscription detail via `admin.ts` → `getStripeSubscriptionForAdmin`. */
export async function getSubscription(
  subscriptionId: string,
): Promise<Awaited<ReturnType<StripeInstance['subscriptions']['retrieve']>>> {
  const stripe = getStripeFromEnv();
  return stripe.subscriptions.retrieve(subscriptionId, { expand: SUBSCRIPTION_EXPAND });
}

export interface CreateSubscriptionBody {
  customerId: string;
  priceId: string;
  paymentBehavior?: StripeNs.SubscriptionCreateParams['payment_behavior'];
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
): Promise<Awaited<ReturnType<StripeInstance['subscriptions']['create']>>> {
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
): Promise<Awaited<ReturnType<StripeInstance['subscriptions']['update']>>> {
  const stripe = getStripeFromEnv();
  const current: StripeNs.Subscription = await stripe.subscriptions.retrieve(
    body.subscriptionId,
    {
      expand: ['items.data.price'],
    },
  );
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
): Promise<Awaited<ReturnType<StripeInstance['subscriptions']['update']>>> {
  const stripe = getStripeFromEnv();
  const current: Stripe.Subscription = await stripe.subscriptions.retrieve(body.subscriptionId, {
    expand: ['items.data.price'],
  });
  const itemId = current.items.data[0]?.id;
  if (!itemId) {
    throw new Error('Subscription has no line items to update');
  }
  const proration =
    body.proration_behavior === 'none' ? 'none' : ('create_prorations' as const);
  return stripe.subscriptions.update(body.subscriptionId, {
    items: [{ id: itemId, price: body.priceId }],
    proration_behavior: proration,
    expand: SUBSCRIPTION_EXPAND,
  });
}
