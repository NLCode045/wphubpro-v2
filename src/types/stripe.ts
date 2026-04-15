/**
 * Stripe billing types — aligned with stripe-node SDK shapes (Stripe-as-a-Source).
 * Prefer `import type` from here in UI code; never import server API modules in React.
 *
 * Use `import type * as StripeModule` + `StripeModule.Stripe.*` — the named `Stripe` class
 * merges with the SDK namespace. Do not use `import('stripe').Stripe.*` (often resolves to
 * `unknown` with `moduleResolution: "bundler"`, TS 18046).
 */
import type * as StripeModule from 'stripe';

export type StripeCustomer = StripeModule.Stripe.Customer;

export type StripeSubscription = StripeModule.Stripe.Subscription;

export type StripeInvoice = StripeModule.Stripe.Invoice;

export type StripePaymentIntent = StripeModule.Stripe.PaymentIntent;

export type StripePrice = StripeModule.Stripe.Price;

export type StripeProduct = StripeModule.Stripe.Product;

/**
 * Catalog row: one active product with a chosen recurring (or default) price.
 */
export interface StripePlan {
  product: StripeProduct;
  price: StripePrice;
}

export type StripePaymentMethod = StripeModule.Stripe.PaymentMethod;

export type StripeSubscriptionCreatePaymentBehavior =
  StripeModule.Stripe.SubscriptionCreateParams['payment_behavior'];

export type StripeWebhookEvent = StripeModule.Stripe.Event;

export interface BillingAdminStats {
  /** Normalized monthly recurring revenue in smallest currency unit (e.g. cents). */
  mrrCents: number;
  /** Count of subscriptions with status `active` (live from Stripe). */
  activeSubscriptionCount: number;
  /** ISO currency code from the first observed price, or `usd` fallback. */
  currency: string;
}
