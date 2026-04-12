/**
 * Stripe billing types — aligned with stripe-node SDK shapes (Stripe-as-a-Source).
 * Prefer `import type` from here in UI code; never import server API modules in React.
 */
import Stripe from 'stripe';

export type StripeCustomer = Stripe.Customer;

export type StripeSubscription = Stripe.Subscription;

export type StripeInvoice = Stripe.Invoice;

export type StripePaymentIntent = Stripe.PaymentIntent;

export type StripePrice = Stripe.Price;

export type StripeProduct = Stripe.Product;

/**
 * Catalog row: one active product with a chosen recurring (or default) price.
 */
export interface StripePlan {
  product: StripeProduct;
  price: StripePrice;
}

export type StripePaymentMethod = Stripe.PaymentMethod;

export interface BillingAdminStats {
  /** Normalized monthly recurring revenue in smallest currency unit (e.g. cents). */
  mrrCents: number;
  /** Count of subscriptions with status `active` (live from Stripe). */
  activeSubscriptionCount: number;
  /** ISO currency code from the first observed price, or `usd` fallback. */
  currency: string;
}
