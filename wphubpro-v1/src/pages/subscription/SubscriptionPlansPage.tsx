import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Footer from 'examples/Footer';
import { contentPageShellSx } from '../../theme/contentPaper';
import { ROUTE_PATHS } from '../../config/routePaths';
import { useStripePlans, useSubscription, useCreateCheckoutSession } from '../../domains/billing';
import type { StripePlan } from '../../types';
import { useToast } from '../../contexts/ToastContext';

const formatPrice = (amount: number, currency = 'eur') =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: currency.toUpperCase() }).format(amount);

const SubscriptionPlansPage: React.FC = () => {
  const { toast } = useToast();
  const { data: plans, isLoading: plansLoading } = useStripePlans();
  const { data: subscription } = useSubscription();
  const createCheckout = useCreateCheckoutSession();
  const [changingPriceId, setChangingPriceId] = useState<string | null>(null);

  const currentPlanId = subscription?.planId;
  const subscriptionId = subscription?.stripeSubscriptionId ?? subscription?.stripe_subscription_id ?? null;
  const hasActiveSubscription = !!subscriptionId && subscription?.source === 'stripe' && subscription?.status !== 'canceled';

  const handleSubscribe = async (priceId: string) => {
    setChangingPriceId(priceId);
    try {
      const result = await createCheckout.mutateAsync({
        priceId,
        returnUrl: window.location.origin,
      });
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      // If the backend detected an existing subscription, it may update in-place and return no URL.
      if (result?.subscriptionId) {
        toast({
          title: 'Plan updated',
          description: result?.message || 'Your plan has been updated.',
          variant: 'default',
        });
        setChangingPriceId(null);
        return;
      }
      toast({
        title: 'Checkout not started',
        description: result?.message || 'No redirect URL returned from Stripe checkout.',
        variant: 'destructive',
      });
      setChangingPriceId(null);
    } catch {
      setChangingPriceId(null);
    }
  };

  const handleChangePlan = async (priceId: string) => {
    if (!subscriptionId) {
      await handleSubscribe(priceId);
      return;
    }
    setChangingPriceId(priceId);
    try {
      const result = await createCheckout.mutateAsync({
        priceId,
        returnUrl: window.location.origin,
        updateType: undefined, // backend determines upgrade vs downgrade
      });
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      // In-place plan change returns subscriptionId without a URL
      if (result?.subscriptionId) {
        toast({
          title: 'Plan updated',
          description: result?.message || 'Your plan has been updated.',
          variant: 'default',
        });
        setChangingPriceId(null);
        return;
      }
      toast({
        title: 'Could not change plan',
        description: result?.message || 'No redirect URL returned from Stripe checkout.',
        variant: 'destructive',
      });
      setChangingPriceId(null);
    } catch {
      setChangingPriceId(null);
    }
  };

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <SoftTypography variant="h4" fontWeight="bold" mb={0.5}>
          Subscription plans
        </SoftTypography>
        <SoftTypography variant="button" color="text" mb={2} display="block">
          Choose a plan or change your current one.
        </SoftTypography>
        <SoftBox mb={2}>
          <SoftButton component={Link} to={ROUTE_PATHS.ACCOUNT_SUBSCRIPTION} variant="outlined" color="info" size="small">
            View my subscription
          </SoftButton>
        </SoftBox>

        {plansLoading ? (
          <SoftTypography variant="button" color="text">
            Loading plans…
          </SoftTypography>
        ) : !plans?.length ? (
          <SoftTypography variant="button" color="text">
            No plans available.
          </SoftTypography>
        ) : (
          <SoftBox display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={3}>
            {plans.map((plan: StripePlan) => {
              const isCurrent = currentPlanId && (plan.name === currentPlanId || plan.id === currentPlanId);
              const monthlyPriceId = plan.monthlyPriceId;
              const yearlyPriceId = plan.yearlyPriceId;
              const hasMonthly = !!monthlyPriceId && plan.monthlyPrice > 0;
              const hasYearly = !!yearlyPriceId && plan.yearlyPrice > 0;

              return (
                <Card key={plan.id} sx={{ p: 3, position: 'relative' }}>
                  {isCurrent && (
                    <Chip
                      label="Current plan"
                      color="info"
                      size="small"
                      sx={{ position: 'absolute', top: 12, right: 12 }}
                    />
                  )}
                  <SoftTypography variant="h6" fontWeight="bold" mb={1}>
                    {plan.name}
                  </SoftTypography>
                  <SoftTypography variant="button" color="text" mb={2} display="block">
                    {plan.description || '—'}
                  </SoftTypography>
                  <SoftBox mb={2}>
                    {hasMonthly && (
                      <SoftTypography variant="button" fontWeight="medium">
                        {formatPrice(plan.monthlyPrice, plan.currency)}/month
                      </SoftTypography>
                    )}
                    {hasMonthly && hasYearly && ' · '}
                    {hasYearly && (
                      <SoftTypography variant="button" fontWeight="medium">
                        {formatPrice(plan.yearlyPrice, plan.currency)}/year
                      </SoftTypography>
                    )}
                  </SoftBox>
                  <SoftBox display="flex" flexDirection="column" gap={1}>
                    {hasMonthly && (
                      <SoftButton
                        variant={isCurrent ? 'outlined' : 'gradient'}
                        color="info"
                        size="small"
                        disabled={isCurrent || createCheckout.isPending}
                        onClick={() => handleChangePlan(monthlyPriceId!)}
                      >
                        {changingPriceId === monthlyPriceId ? 'Processing…' : isCurrent ? 'Current' : hasActiveSubscription ? 'Switch to monthly' : 'Subscribe monthly'}
                      </SoftButton>
                    )}
                    {hasYearly && (
                      <SoftButton
                        variant={isCurrent ? 'outlined' : 'gradient'}
                        color="dark"
                        size="small"
                        disabled={isCurrent || createCheckout.isPending}
                        onClick={() => handleChangePlan(yearlyPriceId!)}
                      >
                        {changingPriceId === yearlyPriceId ? 'Processing…' : isCurrent ? 'Current' : hasActiveSubscription ? 'Switch to yearly' : 'Subscribe yearly'}
                      </SoftButton>
                    )}
                  </SoftBox>
                </Card>
              );
            })}
          </SoftBox>
        )}

      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default SubscriptionPlansPage;
