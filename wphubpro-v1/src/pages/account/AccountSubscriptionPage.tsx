import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Footer from 'examples/Footer';
import { contentPageShellSx } from '../../theme/contentPaper';
import {
  useCancelSubscription,
  useInvoices,
  useManageSubscription,
  usePaymentMethods,
  useSubscription,
  useSubscriptionDetails,
  useUsage,
} from '../../domains/billing';
import AccountSectionNav from '../../components/account/AccountSectionNav'; // pragma: allowlist secret
import { PaymentMethodsList, AddPaymentMethodForm } from '../../components/billing';
import { useToast } from '../../contexts/ToastContext';
import { ROUTE_PATHS } from '../../config/routePaths';

const formatMoney = (amountCents: number, currency = 'eur') => {
  return (amountCents / 100).toLocaleString('nl-NL', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const AccountSubscriptionPage: React.FC = () => { // pragma: allowlist secret
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { data: subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const { data: usage } = useUsage();
  const { data: invoices, isLoading: isInvoicesLoading } = useInvoices();
  const { data: paymentMethods, refetch: refetchPaymentMethods } = usePaymentMethods();
  const subscriptionId = subscription?.stripeSubscriptionId ?? subscription?.stripe_subscription_id ?? null;
  const { data: subscriptionDetails } = useSubscriptionDetails(subscriptionId);
  const manageSubscription = useManageSubscription();
  const cancelSubscription = useCancelSubscription();
  const [addCardOpen, setAddCardOpen] = useState(false);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    if (success === 'true') {
      toast({ title: 'Success', description: 'Your subscription has been updated.', variant: 'default' });
      setSearchParams({}, { replace: true });
    } else if (canceled === 'true') {
      toast({ title: 'Canceled', description: 'Checkout was canceled.', variant: 'default' });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  const isFree = !subscription?.priceAmount || subscription.priceAmount === 0 || (subscription.planId ?? '').toUpperCase() === 'FREE';
  const defaultPaymentMethodId = subscriptionDetails?.payment_method?.id ?? null;

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <SoftTypography variant="h4" fontWeight="bold" mb={0.5}>
          Subscription Details
        </SoftTypography>
        <SoftTypography variant="button" color="text" mb={2} display="block">
          View your plan, usage and invoices.
        </SoftTypography>

        <AccountSectionNav /> {/* pragma: allowlist secret */}

        <SoftBox display="flex" gap={1} flexWrap="wrap" mb={2}>
          <SoftButton component={Link} to={ROUTE_PATHS.SUBSCRIPTION_PLANS} variant="outlined" color="info" size="small">
            View plans
          </SoftButton>
        </SoftBox>

        <Card sx={{ mt: 2 }}>
          <SoftBox p={3}>
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
              <SoftBox>
                <SoftTypography variant="h6" fontWeight="bold">
                  Current plan
                </SoftTypography>
                <SoftTypography variant="button" color="text" display="block">
                  {isSubscriptionLoading ? 'Loading...' : (subscription?.planId ?? 'FREE')}
                </SoftTypography>
                <SoftTypography variant="caption" color="secondary">
                  Status: {isSubscriptionLoading ? '-' : (subscription?.status ?? 'active')}
                </SoftTypography>
              </SoftBox>
              <SoftBox display="flex" gap={1} flexWrap="wrap">
                <SoftButton
                  variant="gradient"
                  color="info"
                  onClick={() => manageSubscription.mutate()}
                  disabled={manageSubscription.isPending || isFree}
                >
                  {manageSubscription.isPending ? 'Openen...' : 'Manage billing'}
                </SoftButton>
                {!isFree && !subscription?.cancelAtPeriodEnd && (
                  <SoftButton
                    variant="outlined"
                    color="error"
                    onClick={() => cancelSubscription.mutate()}
                    disabled={cancelSubscription.isPending}
                  >
                    {cancelSubscription.isPending ? 'Cancelling…' : 'Cancel subscription'}
                  </SoftButton>
                )}
              </SoftBox>
            </SoftBox>
            {subscription?.cancelAtPeriodEnd && (
              <SoftTypography variant="caption" color="warning" display="block" mb={1}>
                Your subscription will be cancelled at the end of the billing period.
              </SoftTypography>
            )}

            <SoftBox display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, 1fr)' }} gap={2}>
              <Card>
                <SoftBox p={2}>
                  <SoftTypography variant="caption" color="secondary">Sites</SoftTypography>
                  <SoftTypography variant="h6" fontWeight="bold">
                    {usage?.sitesUsed ?? 0} / {subscription?.sitesLimit ?? 1}
                  </SoftTypography>
                </SoftBox>
              </Card>
              <Card>
                <SoftBox p={2}>
                  <SoftTypography variant="caption" color="secondary">Library</SoftTypography>
                  <SoftTypography variant="h6" fontWeight="bold">
                    {usage?.libraryUsed ?? 0} / {subscription?.libraryLimit ?? 5}
                  </SoftTypography>
                </SoftBox>
              </Card>
              <Card>
                <SoftBox p={2}>
                  <SoftTypography variant="caption" color="secondary">Storage uploads</SoftTypography>
                  <SoftTypography variant="h6" fontWeight="bold">
                    {usage?.storageUsed ?? 0} / {subscription?.storageLimit ?? 10}
                  </SoftTypography>
                </SoftBox>
              </Card>
            </SoftBox>

            {subscriptionDetails && (
              <SoftBox mt={2} p={2} sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
                <SoftTypography variant="caption" fontWeight="bold" color="secondary" display="block" mb={1}>
                  Billing details
                </SoftTypography>
                {subscriptionDetails.subscription?.current_period_end && (
                  <SoftTypography variant="button" color="text">
                    Current period ends:{' '}
                    {new Date(subscriptionDetails.subscription.current_period_end * 1000).toLocaleDateString('nl-NL')}
                  </SoftTypography>
                )}
                {subscriptionDetails.upcoming_invoice && (
                  <SoftTypography variant="button" color="text" display="block">
                    Next payment:{' '}
                    {formatMoney(subscriptionDetails.upcoming_invoice.amount_due, subscriptionDetails.upcoming_invoice.currency)}{' '}
                    on{' '}
                    {subscriptionDetails.upcoming_invoice.next_payment_attempt
                      ? new Date(subscriptionDetails.upcoming_invoice.next_payment_attempt * 1000).toLocaleDateString('nl-NL')
                      : '—'}
                  </SoftTypography>
                )}
                {subscriptionDetails.pending_update && (
                  <SoftTypography variant="button" color="info" display="block">
                    Plan change scheduled: {subscriptionDetails.pending_update.plan_name} on{' '}
                    {new Date(subscriptionDetails.pending_update.date * 1000).toLocaleDateString('nl-NL')}
                  </SoftTypography>
                )}
              </SoftBox>
            )}
          </SoftBox>
        </Card>

        <SoftBox sx={{ mt: 2 }}>
          <PaymentMethodsList
            paymentMethods={paymentMethods ?? []}
            onAddCard={() => setAddCardOpen(true)}
            defaultPaymentMethodId={defaultPaymentMethodId}
          />
        </SoftBox>
        <AddPaymentMethodForm
          open={addCardOpen}
          onClose={() => setAddCardOpen(false)}
          onSuccess={() => refetchPaymentMethods()}
        />

        <Card sx={{ mt: 2 }}>
          <SoftBox p={3}>
            <SoftTypography variant="h6" fontWeight="bold" mb={1.5}>
              Recent invoices
            </SoftTypography>
            {isInvoicesLoading ? (
              <SoftTypography variant="button" color="text">Loading invoices...</SoftTypography>
            ) : (invoices ?? []).length === 0 ? (
              <SoftTypography variant="button" color="text">No invoices available.</SoftTypography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Bedrag</TableCell>
                      <TableCell align="right">PDF</TableCell>
                      <TableCell align="right">View online</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(invoices ?? []).map((invoice) => {
                      const isOpen = invoice.status === 'open' || invoice.status === 'draft';
                      const amount = isOpen && (invoice.amount_due ?? invoice.amount_remaining ?? 0) > 0
                        ? (invoice.amount_due ?? invoice.amount_remaining ?? 0)
                        : invoice.amount_paid;
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell>{new Date(invoice.created * 1000).toLocaleDateString('nl-NL')}</TableCell>
                          <TableCell>{invoice.status}</TableCell>
                          <TableCell>{formatMoney(amount, invoice.currency)}</TableCell>
                          <TableCell align="right">
                            {invoice.invoice_pdf ? (
                              <SoftButton
                                component="a"
                                href={invoice.invoice_pdf}
                                target="_blank"
                                rel="noreferrer"
                                variant="outlined"
                                color="info"
                                size="small"
                              >
                                PDF
                              </SoftButton>
                            ) : null}
                          </TableCell>
                          <TableCell align="right">
                            {invoice.hosted_invoice_url ? (
                              <SoftButton
                                component="a"
                                href={invoice.hosted_invoice_url}
                                target="_blank"
                                rel="noreferrer"
                                variant="text"
                                color="info"
                                size="small"
                              >
                                {isOpen ? 'Pay now' : 'View'}
                              </SoftButton>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SoftBox>
        </Card>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AccountSubscriptionPage;
