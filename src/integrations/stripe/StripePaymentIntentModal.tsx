import { type FormEvent, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';

const publishableKey = import.meta.env.STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type PayFormProps = {
  onClose: () => void;
  onSuccess?: () => void;
};

function PayWithElementForm({ onClose, onSuccess }: PayFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });
      if (error) {
        setLocalError(error.message ?? 'Payment failed');
        return;
      }
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {localError ? (
        <Alert variant="danger" className="mb-3 py-2">
          {localError}
        </Alert>
      ) : null}
      <div className="mb-3" style={{ minHeight: 120 }}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      <div className="d-flex justify-content-end gap-2">
        <Button type="button" variant="light" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!stripe || loading}>
          {loading ? 'Processing…' : 'Pay now'}
        </Button>
      </div>
    </form>
  );
}

export type StripePaymentIntentModalProps = {
  show: boolean;
  clientSecret: string | null;
  title?: string;
  onHide: () => void;
  onSuccess?: () => void;
};

/**
 * Modal: Payment Element + confirmPayment for a Subscription/Invoice PaymentIntent client secret.
 */
export function StripePaymentIntentModal({
  show,
  clientSecret,
  title = 'Complete payment',
  onHide,
  onSuccess,
}: StripePaymentIntentModalProps) {
  const missingKey = !publishableKey;

  const handleHide = () => {
    onHide();
  };

  return (
    <Modal show={show} onHide={handleHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {missingKey ? (
          <Alert variant="warning" className="mb-0">
            Missing <code>STRIPE_PUBLISHABLE_KEY</code>. Payments in the app are disabled until it is set.
          </Alert>
        ) : null}
        {!missingKey && !clientSecret ? (
          <div className="d-flex align-items-center gap-2 py-3">
            <Spinner animation="border" size="sm" />
            <span className="text-muted fs-sm">Preparing payment…</span>
          </div>
        ) : null}
        {!missingKey && clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <PayWithElementForm
              onClose={handleHide}
              onSuccess={() => {
                onSuccess?.();
              }}
            />
          </Elements>
        ) : null}
      </Modal.Body>
    </Modal>
  );
}
