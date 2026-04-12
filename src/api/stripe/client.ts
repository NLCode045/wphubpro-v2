/**
 * Server-only — Stripe secret must never ship to the browser. Do not import from React components.
 */
import Stripe from 'stripe';

/** Constructor options for `new Stripe(...)` (same shape as `Stripe.StripeConfig`). */
export type StripeServerConfig = NonNullable<ConstructorParameters<typeof Stripe>[1]> & {
  typescript: true;
};

export function getStripeFromEnv(config?: Partial<StripeServerConfig>): InstanceType<typeof Stripe> {
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
