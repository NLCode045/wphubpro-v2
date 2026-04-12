/**
 * Server-only — Stripe secret must never ship to the browser. Do not import from React components.
 *
 * Browser code calls `/api/stripe/*`; the API host loads `STRIPE_SECRET_KEY` (from env or vault at deploy).
 * Appwrite `stripe-gateway` may expose **only** vault `get-credentials` for bootstrap; Stripe REST calls run on the API host via this SDK, not in the browser.
 */
import StripeNode from 'stripe';

/** Constructor options for `new Stripe(...)` (same shape as `Stripe.StripeConfig`). */
export type StripeServerConfig = NonNullable<ConstructorParameters<typeof StripeNode>[1]> & {
  typescript: true;
};

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
