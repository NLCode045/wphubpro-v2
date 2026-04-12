/**
 * Server-only — Stripe secret must never ship to the browser. Do not import from React components.
 */
import StripeNode from 'stripe';

/** Constructor options for `new Stripe(...)` (same shape as `Stripe.StripeConfig`). */
export type StripeServerConfig = NonNullable<ConstructorParameters<typeof StripeNode>[1]> & {
  typescript: true;
};

/** Full stripe-node client; use `StripeNode` import name to avoid clashing with other `Stripe` types. */
export type StripeClient = InstanceType<typeof StripeNode>;

export function getStripeFromEnv(config?: Partial<StripeServerConfig>): StripeClient {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret?.trim()) {
    throw new Error('STRIPE_SECRET_KEY is required for server-side Stripe');
  }
  return new StripeNode(secret, {
    typescript: true,
    maxNetworkRetries: 2,
    ...config,
  });
}
