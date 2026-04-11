import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import { getStripe } from '@/lib/stripe-loader';
import type { Stripe } from '@stripe/stripe-js';

export interface CheckoutFormProps {
  /** PaymentIntent or Subscription `client_secret` from your API. */
  clientSecret: string | null;
  onSuccess?: () => void;
  onError: (message: string) => void;
  className?: string;
}

function CheckoutFormInner({
  onSuccess,
  onError,
}: {
  onSuccess?: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState<'idle' | 'processing'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setStatus('processing');
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });
    if (error) {
      onError(error.message ?? 'Payment could not be completed.');
      setStatus('idle');
      return;
    }
    onSuccess?.();
    setStatus('idle');
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="submit"
        disabled={!stripe || status === 'processing'}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === 'processing' ? 'Processing…' : 'Confirm payment'}
      </button>
    </form>
  );
}

/**
 * Stripe Payment Element — confirm server-created PaymentIntent / subscription payment.
 */
export function CheckoutForm({ clientSecret, onSuccess, onError, className }: CheckoutFormProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);

  useEffect(() => {
    void getStripe().then(setStripe);
  }, []);

  if (!clientSecret) {
    return (
      <div
        className={
          className ??
          'rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600'
        }
      >
        No checkout session yet. Complete a plan change to receive a client secret from the API.
      </div>
    );
  }

  if (!stripe) {
    return <p className="text-sm text-slate-500">Loading Stripe…</p>;
  }

  return (
    <div className={className}>
      <Elements
        stripe={stripe}
        options={{
          clientSecret,
          appearance: { theme: 'stripe' },
        }}
      >
        <CheckoutFormInner onSuccess={onSuccess} onError={onError} />
      </Elements>
    </div>
  );
}
