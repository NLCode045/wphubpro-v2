import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const publishableKey: string =
  (import.meta as unknown as { env?: { STRIPE_PUBLISHABLE_KEY?: string } }).env?.STRIPE_PUBLISHABLE_KEY ??
  '';

const stripePromise: Promise<Stripe | null> = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);

interface StripeContextType {
  stripePromise: Promise<Stripe | null>;
  publishableKey: string;
}

const StripeContext = createContext<StripeContextType>({ stripePromise, publishableKey });

export const StripeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value = useMemo(() => ({ stripePromise, publishableKey }), []);
  return <StripeContext.Provider value={value}>{children}</StripeContext.Provider>;
};

export const useStripeContext = () => useContext(StripeContext);

/** Wraps children with Stripe Elements when clientSecret is set (e.g. for Payment Element add-card flow). */
export const StripeElementsWrapper: React.FC<{
  clientSecret: string | null;
  children: ReactNode;
}> = ({ clientSecret, children }) => {
  if (!clientSecret) return <>{children}</>;
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      {children}
    </Elements>
  );
};
