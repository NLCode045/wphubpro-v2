/**
 * Fallback typings when `node_modules/stripe` is not visible to the TS server.
 * Must mirror stripe-node’s class + namespace merge so `Stripe.StripeConfig`, `Stripe.Customer`, etc. resolve.
 */
declare class Stripe {
  constructor(apiKey: string, config?: Stripe.StripeConfig);

  subscriptions: {
    list(params?: unknown): Promise<unknown>;
    retrieve(id: string, params?: unknown): Promise<unknown>;
    create(params?: unknown): Promise<unknown>;
    update(id: string, params?: unknown): Promise<unknown>;
  };

  invoices: {
    list(params?: unknown): Promise<unknown>;
  };

  products: {
    list(params?: unknown): Promise<unknown>;
    retrieve(id: string, params?: unknown): Promise<unknown>;
    create(params?: unknown): Promise<unknown>;
    update(id: string, params?: unknown): Promise<unknown>;
  };

  prices: {
    list(params?: unknown): Promise<unknown>;
  };

  customers: {
    retrieve(id: string, params?: unknown): Promise<unknown>;
    create(params?: unknown): Promise<unknown>;
  };

  webhooks: {
    constructEvent(
      payload: string | Buffer,
      signature: string,
      secret: string,
    ): Stripe.Event;
  };
}

export namespace Stripe {
  export interface StripeConfig {
    apiVersion?: string;
    typescript?: boolean;
    maxNetworkRetries?: number;
  }

  export type Subscription = unknown;
  export type Customer = unknown;
  export type Product = unknown;
  export type Price = unknown;
  export type Invoice = unknown;
  export type PaymentIntent = unknown;
  export type PaymentMethod = unknown;
  export type Event = unknown;

  export type SubscriptionRetrieveParams = {
    expand?: string[];
  };

  export type SubscriptionCreateParams = {
    payment_behavior?: string;
  };

  export type ApiList<T = unknown> = unknown;
  export type Response<T = unknown> = unknown;
}

export default Stripe;
