import React from 'react';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import type { StripePaymentMethod } from '../../types';
import { useDetachPaymentMethod, useSetDefaultPaymentMethod } from '../../domains/billing';

const brandLabel: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
};

function formatBrand(brand: string): string {
  return brandLabel[brand?.toLowerCase()] || (brand || 'Card');
}

interface PaymentMethodsListProps {
  paymentMethods: StripePaymentMethod[];
  onAddCard: () => void;
  defaultPaymentMethodId?: string | null;
}

const PaymentMethodsList: React.FC<PaymentMethodsListProps> = ({
  paymentMethods,
  onAddCard,
  defaultPaymentMethodId,
}) => {
  const detach = useDetachPaymentMethod();
  const setDefault = useSetDefaultPaymentMethod();

  if (paymentMethods.length === 0) {
    return (
      <Card sx={{ p: 2 }}>
        <SoftBox display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <SoftTypography variant="h6" fontWeight="medium">
            Payment methods
          </SoftTypography>
          <SoftButton variant="gradient" color="dark" size="small" onClick={onAddCard}>
            <Icon sx={{ fontWeight: 'bold', fontSize: 18 }}>add</Icon>
            &nbsp;Add card
          </SoftButton>
        </SoftBox>
        <SoftTypography variant="button" color="text" sx={{ mt: 2 }}>
          No payment methods on file. Add a card to pay for your subscription.
        </SoftTypography>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 2 }}>
      <SoftBox display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
        <SoftTypography variant="h6" fontWeight="medium">
          Payment methods
        </SoftTypography>
        <SoftButton variant="gradient" color="dark" size="small" onClick={onAddCard}>
          <Icon sx={{ fontWeight: 'bold', fontSize: 18 }}>add</Icon>
          &nbsp;Add card
        </SoftButton>
      </SoftBox>
      <SoftBox display="flex" flexDirection="column" gap={1.5}>
        {paymentMethods.map((pm) => {
          const isDefault = pm.id === defaultPaymentMethodId;
          const last4 = pm.card?.last4 ?? '····';
          const brand = pm.card?.brand ? formatBrand(pm.card.brand) : 'Card';
          const exp = pm.card
            ? `${String(pm.card.exp_month).padStart(2, '0')}/${pm.card.exp_year}`
            : '';
          return (
            <SoftBox
              key={pm.id}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <SoftBox>
                <SoftTypography variant="button" fontWeight="medium">
                  {brand} ···· {last4}
                </SoftTypography>
                {exp && (
                  <SoftTypography variant="caption" color="secondary" display="block">
                    Expires {exp}
                  </SoftTypography>
                )}
                {isDefault && (
                  <SoftTypography variant="caption" color="info" fontWeight="medium">
                    Default
                  </SoftTypography>
                )}
              </SoftBox>
              <SoftBox display="flex" alignItems="center" gap={0.5}>
                {!isDefault && (
                  <Tooltip title="Set as default">
                    <IconButton
                      size="small"
                      onClick={() => setDefault.mutate(pm.id)}
                      disabled={setDefault.isPending}
                    >
                      <Icon fontSize="small">star_border</Icon>
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Remove card">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => detach.mutate(pm.id)}
                    disabled={detach.isPending}
                  >
                    <Icon fontSize="small">delete_outline</Icon>
                  </IconButton>
                </Tooltip>
              </SoftBox>
            </SoftBox>
          );
        })}
      </SoftBox>
    </Card>
  );
};

export default PaymentMethodsList;
