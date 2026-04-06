/**
 * Stripe Settings tab - default signup plan selection
 */
import React, { useState, useEffect, useMemo } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import SoftBox from 'components/SoftBox';
import SoftButton from 'components/SoftButton';
import SoftTypography from 'components/SoftTypography';
import { useQuery } from '@tanstack/react-query';
import { usePlatformSettings, useUpdatePlatformSettings } from '../../../hooks/usePlatformSettings';
import { useToast } from '../../../contexts/ToastContext';
import { executeFunction } from '../../../integrations/appwrite/executeFunction';

interface PriceOption {
  priceId: string;
  label: string;
  planName: string;
}

interface PlanWithPrices {
  id: string;
  name: string;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  allPrices?: Array<{ id: string; amount: number; currency: string; interval: string }>;
}

function useStripePlansForSettings() {
  return useQuery({
    queryKey: ['admin', 'stripePlansForSettings'],
    queryFn: async () => {
      const res = await executeFunction<{ plans: PlanWithPrices[] }>('stripe-products', {
        action: 'list',
        active_only: false,
      });
      return res?.plans ?? [];
    },
  });
}

const formatPrice = (amount: number, currency: string, interval: string) => {
  const formatted = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
  if (interval === 'month') return `${formatted}/month`;
  if (interval === 'year') return `${formatted}/year`;
  return formatted;
};

const StripeSettingsTab: React.FC = () => {
  const { toast } = useToast();
  const { data: stripeSettings, isLoading: loadingSettings } = usePlatformSettings('stripe_signup_plan');
  const { data: plans, isLoading: loadingPlans } = useStripePlansForSettings();
  const updateMutation = useUpdatePlatformSettings();

  const [defaultPriceId, setDefaultPriceId] = useState<string>('');

  useEffect(() => {
    if (stripeSettings && typeof stripeSettings === 'object' && stripeSettings.defaultSignupPlanPriceId) {
      setDefaultPriceId(stripeSettings.defaultSignupPlanPriceId);
    } else {
      setDefaultPriceId('');
    }
  }, [stripeSettings]);

  const priceOptions: PriceOption[] = useMemo(() => {
    const seenIds = new Set<string>();
    const out: PriceOption[] = [];
    if (!plans) return out;
    for (const plan of plans) {
      if (plan.allPrices && plan.allPrices.length > 0) {
        for (const p of plan.allPrices) {
          if ((p.interval === 'month' || p.interval === 'year') && !seenIds.has(p.id)) {
            seenIds.add(p.id);
            out.push({
              priceId: p.id,
              label: `${plan.name} - ${formatPrice(p.amount, p.currency, p.interval)}`,
              planName: plan.name,
            });
          }
        }
      }
      if (plan.monthlyPriceId && !seenIds.has(plan.monthlyPriceId)) {
        seenIds.add(plan.monthlyPriceId);
        out.push({
          priceId: plan.monthlyPriceId,
          label: `${plan.name} - ${formatPrice(plan.monthlyPrice, plan.currency, 'month')}`,
          planName: plan.name,
        });
      }
      if (plan.yearlyPriceId && !seenIds.has(plan.yearlyPriceId)) {
        seenIds.add(plan.yearlyPriceId);
        out.push({
          priceId: plan.yearlyPriceId,
          label: `${plan.name} - ${formatPrice(plan.yearlyPrice, plan.currency, 'year')}`,
          planName: plan.name,
        });
      }
    }
    return out;
  }, [plans]);

  useEffect(() => {
    if (!defaultPriceId) return;
    if (priceOptions.some((o) => o.priceId === defaultPriceId)) return;
    setDefaultPriceId('');
  }, [defaultPriceId, priceOptions]);

  const selectDefaultPlanValue =
    defaultPriceId && priceOptions.some((o) => o.priceId === defaultPriceId)
      ? defaultPriceId
      : '__none__';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        category: 'stripe_signup_plan',
        settings: {
          defaultSignupPlanPriceId: defaultPriceId || undefined,
        },
      });
      toast({ title: 'Stripe settings saved', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not save',
        variant: 'destructive',
      });
    }
  };

  const isLoading = loadingSettings || loadingPlans;

  if (isLoading) {
    return (
      <SoftBox display="flex" justifyContent="center" alignItems="center" py={6}>
        <CircularProgress size={32} />
      </SoftBox>
    );
  }

  return (
    <SoftBox display="flex" flexDirection="column" gap={4}>
      <SoftBox sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <SoftBox component="form" onSubmit={handleSave} display="flex" flexDirection="column" gap={3}>
          <SoftBox>
            <SoftTypography variant="h6" fontWeight="bold" mb={0.5}>
              Default signup plan
            </SoftTypography>
            <SoftTypography variant="body2" color="secondary">
              Select the plan that will be automatically assigned to new users when they sign up.
              This subscription will be created in their Stripe account.
            </SoftTypography>
          </SoftBox>

          <SoftTypography variant="caption" color="secondary" id="stripe-default-plan-label" display="block" sx={{ mb: 0.5 }}>
            Default plan
          </SoftTypography>
          <Select
            fullWidth
            size="small"
            sx={{ maxWidth: 400 }}
            value={selectDefaultPlanValue}
            onChange={(e) => setDefaultPriceId((e.target.value as string) === '__none__' ? '' : e.target.value)}
            inputProps={{ 'aria-labelledby': 'stripe-default-plan-label' }}
            renderValue={(v) => {
              if (v === '__none__' || !v) return <em>None (no automatic subscription)</em>;
              return priceOptions.find((o) => o.priceId === v)?.label ?? v;
            }}
          >
            <MenuItem value="__none__">
              <em>None (no automatic subscription)</em>
            </MenuItem>
            {priceOptions.map((opt) => (
              <MenuItem key={opt.priceId} value={opt.priceId}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>

          {priceOptions.length === 0 && (
            <SoftTypography variant="caption" color="secondary">
              No plans found. Create plans in Plan Management first.
            </SoftTypography>
          )}

          <SoftBox pt={1}>
            <SoftButton type="submit" variant="contained" color="primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Stripe settings'}
            </SoftButton>
          </SoftBox>
        </SoftBox>
      </SoftBox>
    </SoftBox>
  );
};

export default StripeSettingsTab;
