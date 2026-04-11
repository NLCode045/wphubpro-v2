/**
 * Server-only — lists active catalog from Stripe (live). Do not import from React components.
 */
import type { StripePlan } from '@/types/stripe';

import { getStripeFromEnv } from './client';

/**
 * Lists active products with their recurring prices (live fetch, no DB cache).
 */
export async function getActivePlans(): Promise<StripePlan[]> {
  const stripe = getStripeFromEnv();
  const products = await stripe.products.list({
    active: true,
    limit: 100,
    expand: ['data.default_price'],
  });

  const plans: StripePlan[] = [];

  for (const product of products.data) {
    const prices = await stripe.prices.list({
      active: true,
      product: product.id,
      limit: 100,
      expand: ['data.product'],
    });

    for (const price of prices.data) {
      if (price.recurring) {
        plans.push({ product, price });
      }
    }
  }

  return plans;
}
