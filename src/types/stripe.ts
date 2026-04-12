/**
 * Stripe billing types — aligned with stripe-node SDK shapes (Stripe-as-a-Source).
 * Prefer `import type` from here in UI code; never import server API modules in React.
 */
import type { Stripe as StripeSdk } from 'stripe';

export type StripeCustomer = StripeSdk.Customer;

export type StripeSubscription = StripeSdk.Subscription;

export type StripeInvoice = StripeSdk.Invoice;

export type StripePaymentIntent = StripeSdk.PaymentIntent;

export type StripePrice = StripeSdk.Price;

export type StripeProduct = StripeSdk.Product;

/**
 * Catalog row: one active product with a chosen recurring (or default) price.
 */
export interface StripePlan {
  product: StripeProduct;
  price: StripePrice;
}

export type StripePaymentMethod = StripeSdk.PaymentMethod;

export interface BillingAdminStats {
  /** Normalized monthly recurring revenue in smallest currency unit (e.g. cents). */
  mrrCents: number;
  /** Count of subscriptions with status `active` (live from Stripe). */
  activeSubscriptionCount: number;
  /** ISO currency code from the first observed price, or `usd` fallback. */
  currency: string;
}
