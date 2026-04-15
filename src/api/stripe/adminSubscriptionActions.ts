/**
 * Server-only — privileged subscription changes (Stripe SDK).
 */
import { getStripeFromEnv } from './client';
import { updateSubscriptionPriceAdmin } from './subscriptions';

export async function adminCancelSubscription(params: {
  subscriptionId: string;
  immediate?: boolean;
}): Promise<{ success: boolean }> {
  const stripe = getStripeFromEnv();
  if (params.immediate) {
    await stripe.subscriptions.cancel(params.subscriptionId);
  } else {
    await stripe.subscriptions.update(params.subscriptionId, { cancel_at_period_end: true });
  }
  return { success: true };
}

export async function adminPauseSubscription(params: {
  subscriptionId: string;
  behavior?: 'void' | 'mark_uncollectible';
}): Promise<{ success: boolean }> {
  const stripe = getStripeFromEnv();
  const behavior = params.behavior === 'void' ? 'void' : 'mark_uncollectible';
  await stripe.subscriptions.update(params.subscriptionId, {
    pause_collection: { behavior },
  });
  return { success: true };
}

export async function adminResumeSubscription(subscriptionId: string): Promise<{ success: boolean }> {
  const stripe = getStripeFromEnv();
  await stripe.subscriptions.update(subscriptionId, {
    pause_collection: null,
  });
  return { success: true };
}

export async function adminArchiveSubscription(params: {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
  immediate?: boolean;
}): Promise<{ success: boolean }> {
  return adminCancelSubscription({
    subscriptionId: params.subscriptionId,
    immediate: params.immediate === true,
  });
}

export async function adminUpdateSubscriptionPrice(params: {
  subscriptionId: string;
  newPriceId: string;
  proration_behavior?: 'always_invoice' | 'none';
  sameProductOnly?: boolean;
}): Promise<{ success: boolean }> {
  await updateSubscriptionPriceAdmin({
    subscriptionId: params.subscriptionId,
    priceId: params.newPriceId,
    proration_behavior: params.proration_behavior,
  });
  return { success: true };
}
