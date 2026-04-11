/** Fallback typings when `node_modules/stripe` is not visible to the TS server. */
declare const Stripe: any;
export default Stripe;

export namespace Stripe {
  export type Subscription = any;
  export type Customer = any;
  export type Product = any;
  export type Price = any;
  export type Invoice = any;
  export type PaymentIntent = any;
  export type PaymentMethod = any;
  export type Event = any;

  export type SubscriptionRetrieveParams = any;
  export type SubscriptionCreateParams = any;
  export type ApiList<T = unknown> = any;
  export type Response<T = unknown> = any;
}
