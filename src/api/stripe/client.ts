/**
 * Server-only — Stripe secret must never ship to the browser. Do not import from React components.
 */
import Stripe from 'stripe';

/** Typed server config; extends Stripe SDK options for a single source of truth. */
export interface StripeServerConfig extends Stripe.StripeConfig {
  typescript: true;
}

export function getStripeFromEnv(config?: Partial<StripeServerConfig>): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret?.trim()) {
    throw new Error('STRIPE_SECRET_KEY is required for server-side Stripe');
  }
  return new Stripe(secret, {
    typescript: true,
    maxNetworkRetries: 2,
    ...config,
  });
}
