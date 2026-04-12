/**
 * Stripe billing types — aligned with stripe-node SDK shapes (Stripe-as-a-Source).
 * Prefer `import type` from here in UI code; never import server API modules in React.
 *
 * Use `import('stripe').Stripe.*` (not `import * as StripeApi`) so resolution always targets
 * stripe-node’s `declare module 'stripe'` namespace.
 */
export type StripeCustomer = import('stripe').Stripe.Customer;

export type StripeSubscription = import('stripe').Stripe.Subscription;

export type StripeInvoice = import('stripe').Stripe.Invoice;

export type StripePaymentIntent = import('stripe').Stripe.PaymentIntent;

export type StripePrice = import('stripe').Stripe.Price;

export type StripeProduct = import('stripe').Stripe.Product;

/**
 * Catalog row: one active product with a chosen recurring (or default) price.
 */
export interface StripePlan {
  product: StripeProduct;
  price: StripePrice;
}

export type StripePaymentMethod = import('stripe').Stripe.PaymentMethod;

export type StripeSubscriptionCreatePaymentBehavior =
  import('stripe').Stripe.SubscriptionCreateParams['payment_behavior'];

export type StripeWebhookEvent = import('stripe').Stripe.Event;

export interface BillingAdminStats {
  /** Normalized monthly recurring revenue in smallest currency unit (e.g. cents). */
  mrrCents: number;
  /** Count of subscriptions with status `active` (live from Stripe). */
  activeSubscriptionCount: number;
  /** ISO currency code from the first observed price, or `usd` fallback. */
  currency: string;
}
