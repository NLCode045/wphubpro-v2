import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import { StripeElementsWrapper } from '../../contexts/StripeContext';
import { useCreateSetupIntent, useSetDefaultPaymentMethod } from '../../domains/billing';

interface AddPaymentMethodFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddPaymentMethodFormInner: React.FC<{ onClose: () => void; onSuccess?: () => void }> = ({
  onClose,
  onSuccess,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const setDefault = useSetDefaultPaymentMethod();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });
      if (error) {
        // Show error in UI if needed
        setLoading(false);
        return;
      }
      if (setupIntent?.payment_method) {
        const pmId =
          typeof setupIntent.payment_method === 'string'
            ? setupIntent.payment_method
            : (setupIntent.payment_method as { id?: string })?.id;
        if (pmId) await setDefault.mutateAsync(pmId);
      }
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <SoftBox sx={{ minHeight: 120 }}>
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </SoftBox>
      <DialogActions sx={{ px: 0, pt: 2 }}>
        <SoftButton variant="outlined" color="dark" onClick={onClose} disabled={loading}>
          Cancel
        </SoftButton>
        <SoftButton type="submit" variant="gradient" color="info" disabled={!stripe || loading}>
          {loading ? 'Saving…' : 'Add card'}
        </SoftButton>
      </DialogActions>
    </form>
  );
};

const AddPaymentMethodForm: React.FC<AddPaymentMethodFormProps> = ({ open, onClose, onSuccess }) => {
  const createSetupIntent = useCreateSetupIntent();
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setClientSecret(null);
      return;
    }
    createSetupIntent.mutate(undefined, {
      onSuccess: (data) => {
        if (data?.clientSecret) setClientSecret(data.clientSecret);
      },
    });
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <SoftTypography variant="h6" fontWeight="bold">
          Add payment method
        </SoftTypography>
      </DialogTitle>
      <DialogContent>
        {createSetupIntent.isPending && !clientSecret && (
          <SoftTypography variant="button" color="text">
            Loading…
          </SoftTypography>
        )}
        {createSetupIntent.isError && (
          <SoftTypography variant="button" color="error">
            {createSetupIntent.error?.message}
          </SoftTypography>
        )}
        <StripeElementsWrapper clientSecret={clientSecret}>
          {clientSecret && (
            <AddPaymentMethodFormInner onClose={onClose} onSuccess={onSuccess} />
          )}
        </StripeElementsWrapper>
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentMethodForm;
