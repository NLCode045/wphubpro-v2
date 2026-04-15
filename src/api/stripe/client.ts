/**
 * Server-only — Stripe secret must never ship to the browser. Do not import from React components.
 *
 * Browser code calls `/api/stripe/*`; the API host loads `STRIPE_SECRET_KEY` (from env or vault at deploy).
 * Appwrite `stripe-gateway` may expose **only** vault `get-credentials` for bootstrap; Stripe REST calls run on the API host via this SDK, not in the browser.
 */
import Stripe from 'stripe';
import type * as StripeModule from 'stripe';

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

/** Full SDK instance — `ReturnType<typeof getStripeFromEnv>` can infer a stub (e.g. only `*.list`) under `moduleResolution: "bundler"`. */
export type StripeClient = InstanceType<typeof Stripe>;

/**
 * SDK entity + list shapes — defined in this module (alongside `import Stripe from 'stripe'`) so other files can import them with `getStripeFromEnv`.
 * Importing `import type * as StripeModule from 'stripe'` in the same file as `./client` can collapse `StripeModule.Stripe.*` to `unknown` (TS 18046).
 */
export type StripeProduct = StripeModule.Stripe.Product;
export type StripePrice = StripeModule.Stripe.Price;
export type StripeProductList = StripeModule.Stripe.ApiList<StripeModule.Stripe.Product>;
export type StripePriceList = StripeModule.Stripe.ApiList<StripeModule.Stripe.Price>;
export type StripeSubscriptionList = StripeModule.Stripe.ApiList<StripeModule.Stripe.Subscription>;
