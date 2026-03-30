import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Modal,
  Spinner,
  Table,
} from 'react-bootstrap';
import { useSearchParams } from 'react-router';
import type { BillingAccountContext } from '@/domains/billing';
import {
  useCancelSubscription,
  useCreateCheckoutSession,
  useInvoices,
  useDetachPaymentMethod,
  usePaymentMethods,
  useSetDefaultPaymentMethod,
  useStripePlans,
  useSubscription,
  useSubscriptionDetails,
} from '@/domains/billing';
import { useMyAccountDoc } from '@/domains/profile/useMyAccountDoc';
import { useAuth } from '@/domains/auth';
import { useNotificationContext } from '@/context/useNotificationContext';
import { StripeElementsModal } from '@/integrations/stripe/StripeElementsModal';
import { redirectToBillingPortal } from '@/services/stripe';
import type { StripePlan } from '@/types';

const formatMoney = (amountCents: number, currency = 'eur') =>
  (amountCents / 100).toLocaleString('nl-NL', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const UserProfileSubscriptionTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showNotification } = useNotificationContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: accountDoc, isLoading: accountLoading, isError, error } = useMyAccountDoc(user?.$id);

  const accountSettled = !accountLoading;
  const stripeCustomerId =
    !isError && accountDoc?.stripe_customer_id ? accountDoc.stripe_customer_id.trim() : '';

  const billingCtx: BillingAccountContext = useMemo(
    () => ({
      accountReady: accountSettled,
      stripeCustomerId,
    }),
    [accountSettled, stripeCustomerId]
  );

  const { data: subscription, isLoading: subscriptionLoading } = useSubscription(billingCtx);
  const subscriptionId =
    subscription?.stripeSubscriptionId ?? subscription?.stripe_subscription_id ?? null;
  const { data: subscriptionDetails, isLoading: detailsLoading } = useSubscriptionDetails(
    subscriptionId,
    billingCtx
  );
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(billingCtx);
  const { data: paymentMethods, isLoading: pmLoading } = usePaymentMethods(billingCtx);
  const { data: stripePlans, isLoading: plansLoading } = useStripePlans(billingCtx);

  const cancelSubscription = useCancelSubscription();
  const setDefaultPm = useSetDefaultPaymentMethod();
  const detachPm = useDetachPaymentMethod();
  const createCheckout = useCreateCheckoutSession();

  const [addCardOpen, setAddCardOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    if (success === 'true') {
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
      void queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      void queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      showNotification({
        title: 'Success',
        message: 'Your subscription has been updated.',
        variant: 'success',
        delay: 4000,
      });
      setSearchParams({}, { replace: true });
    } else if (canceled === 'true') {
      showNotification({
        title: 'Canceled',
        message: 'Checkout was canceled.',
        variant: 'light',
        delay: 4000,
      });
      setSearchParams({}, { replace: true });
    }
  }, [queryClient, searchParams, setSearchParams, showNotification]);

  const defaultPaymentMethodId = subscriptionDetails?.payment_method?.id ?? null;
  const planId = accountDoc?.current_plan_id?.trim() || '';
  const hasStripeCustomer = Boolean(stripeCustomerId);

  const isFree =
    !subscription?.priceAmount ||
    subscription.priceAmount === 0 ||
    (subscription.planId ?? '').toUpperCase() === 'FREE';

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      await redirectToBillingPortal(window.location.href);
    } catch (e) {
      showNotification({
        title: 'Portal',
        message: e instanceof Error ? e.message : 'Could not open Stripe billing portal.',
        variant: 'danger',
        delay: 5000,
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelClick = () => {
    if (!window.confirm('Cancel subscription at the end of the current billing period?')) return;
    cancelSubscription.mutate();
  };

  const handleSelectPlanPrice = (priceId: string | null) => {
    if (!priceId) return;
    const returnUrl = `${window.location.origin}${window.location.pathname}?tab=subscription`;
    createCheckout.mutate(
      { priceId, returnUrl, updateType: undefined },
      {
        onSuccess: (data) => {
          if (data?.url) window.location.href = data.url;
        },
      }
    );
  };

  if (accountLoading) {
    return (
      <div className="d-flex justify-content-center py-4">
        <Spinner animation="border" size="sm" role="status" variant="primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="warning" className="mb-0">
        {error instanceof Error
          ? error.message
          : 'Could not load subscription data. You may not have access to the accounts collection.'}
      </Alert>
    );
  }

  return (
    <div>
      <p className="text-muted fs-xs text-uppercase fw-semibold mb-2">Billing overview</p>
      <p className="text-muted fs-sm mb-4">
        Plan, payment methods, and invoices are loaded from Stripe for your linked customer account.
      </p>

      {!hasStripeCustomer ? (
        <Alert variant="light" className="border mb-4">
          No Stripe customer is linked to this account yet. Subscribe from the marketing site or contact
          support to enable billing.
        </Alert>
      ) : null}

      {hasStripeCustomer && subscriptionLoading ? (
        <div className="d-flex align-items-center gap-2 mb-3">
          <Spinner animation="border" size="sm" />
          <span className="text-muted fs-sm">Loading subscription…</span>
        </div>
      ) : null}

      {hasStripeCustomer ? (
        <Card className="mb-4 border shadow-none">
          <Card.Body>
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h6 className="mb-1 fw-semibold">Subscription</h6>
                {subscriptionLoading ? (
                  <p className="text-muted fs-sm mb-0">Loading…</p>
                ) : subscription ? (
                  <>
                    <p className="mb-0 fs-lg fw-medium">{(subscription.planId ?? planId) || '—'}</p>
                    <p className="text-muted fs-sm mb-0">
                      Status: {subscription.status ?? '—'}
                      {subscription.currentPeriodEnd
                        ? ` · Period ends ${new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString('nl-NL')}`
                        : null}
                    </p>
                  </>
                ) : (
                  <p className="text-muted fs-sm mb-0">No active subscription. Choose a plan to subscribe.</p>
                )}
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setChangePlanOpen(true)}
                  disabled={plansLoading || createCheckout.isPending || subscriptionLoading}
                >
                  Change plan
                </Button>
                {subscription && !isFree && !subscription.cancelAtPeriodEnd ? (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={handleCancelClick}
                    disabled={cancelSubscription.isPending}
                  >
                    {cancelSubscription.isPending ? 'Cancelling…' : 'Cancel subscription'}
                  </Button>
                ) : null}
              </div>
            </div>

            {subscription?.cancelAtPeriodEnd ? (
              <Alert variant="warning" className="py-2 mb-3 fs-sm">
                This subscription will end at the end of the current billing period.
              </Alert>
            ) : null}

            {!subscriptionLoading && !subscription ? (
              <Alert variant="info" className="mb-3 py-2 fs-sm">
                Payment methods and invoices below still apply to your Stripe customer. Start a subscription via
                Change plan.
              </Alert>
            ) : null}

            {subscription && detailsLoading ? (
              <div className="d-flex align-items-center gap-2 mb-3">
                <Spinner animation="border" size="sm" />
                <span className="text-muted fs-sm">Loading billing details…</span>
              </div>
            ) : null}

            {subscription && subscriptionDetails ? (
              <div className="p-3 rounded bg-light">
                <p className="text-muted fs-xs text-uppercase fw-semibold mb-2">Stripe details</p>
                {subscriptionDetails.plan?.product_name ? (
                  <p className="fs-sm mb-1">
                    <span className="text-muted">Product:</span> {subscriptionDetails.plan.product_name}
                  </p>
                ) : null}
                {subscriptionDetails.plan?.unit_amount != null && subscriptionDetails.plan.currency ? (
                  <p className="fs-sm mb-1">
                    <span className="text-muted">Price:</span>{' '}
                    {formatMoney(subscriptionDetails.plan.unit_amount, subscriptionDetails.plan.currency ?? 'eur')}
                    {subscriptionDetails.plan.interval
                      ? ` / ${subscriptionDetails.plan.interval}`
                      : null}
                  </p>
                ) : null}
                {subscriptionDetails.subscription?.current_period_end ? (
                  <p className="fs-sm mb-1">
                    <span className="text-muted">Current period ends:</span>{' '}
                    {new Date(subscriptionDetails.subscription.current_period_end * 1000).toLocaleDateString(
                      'nl-NL'
                    )}
                  </p>
                ) : null}
                {subscriptionDetails.upcoming_invoice ? (
                  <p className="fs-sm mb-1">
                    <span className="text-muted">Next charge:</span>{' '}
                    {formatMoney(
                      subscriptionDetails.upcoming_invoice.amount_due,
                      subscriptionDetails.upcoming_invoice.currency
                    )}
                    {subscriptionDetails.upcoming_invoice.next_payment_attempt
                      ? ` on ${new Date(
                          subscriptionDetails.upcoming_invoice.next_payment_attempt * 1000
                        ).toLocaleDateString('nl-NL')}`
                      : null}
                  </p>
                ) : null}
                {subscriptionDetails.pending_update ? (
                  <p className="fs-sm mb-0 text-primary">
                    Scheduled change: {subscriptionDetails.pending_update.plan_name} on{' '}
                    {new Date(subscriptionDetails.pending_update.date * 1000).toLocaleDateString('nl-NL')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </Card.Body>
        </Card>
      ) : null}

      {hasStripeCustomer ? (
        <Card className="mb-4 border shadow-none">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h6 className="mb-0 fw-semibold">Payment methods</h6>
              <Button variant="primary" size="sm" onClick={() => setAddCardOpen(true)}>
                Add card
              </Button>
            </div>
            {pmLoading ? (
              <Spinner animation="border" size="sm" />
            ) : !paymentMethods?.length ? (
              <p className="text-muted fs-sm mb-0">No saved payment methods.</p>
            ) : (
              <Table responsive size="sm" className="mb-0 align-middle">
                <thead className="fs-xs text-muted">
                  <tr>
                    <th>Card</th>
                    <th>Expires</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody className="fs-sm">
                  {paymentMethods.map((pm) => {
                    const card = pm.card;
                    const isDefault = defaultPaymentMethodId === pm.id;
                    return (
                      <tr key={pm.id}>
                        <td>
                          {card ? (
                            <>
                              <span className="text-capitalize">{card.brand}</span> ·••• {card.last4}
                              {isDefault ? (
                                <Badge bg="primary" className="ms-2 fs-xxs">
                                  Default
                                </Badge>
                              ) : null}
                            </>
                          ) : (
                            pm.type
                          )}
                        </td>
                        <td>
                          {card ? `${String(card.exp_month).padStart(2, '0')}/${card.exp_year}` : '—'}
                        </td>
                        <td className="text-end">
                          {!isDefault ? (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 me-2"
                              onClick={() => setDefaultPm.mutate(pm.id)}
                              disabled={setDefaultPm.isPending}
                            >
                              Set default
                            </Button>
                          ) : null}
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 text-danger"
                            onClick={() => {
                              if (window.confirm('Remove this payment method?')) detachPm.mutate(pm.id);
                            }}
                            disabled={detachPm.isPending}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      ) : null}

      {hasStripeCustomer ? (
        <Card className="mb-4 border shadow-none">
          <Card.Body>
            <h6 className="fw-semibold mb-3">Invoices</h6>
            {invoicesLoading ? (
              <Spinner animation="border" size="sm" />
            ) : !invoices?.length ? (
              <p className="text-muted fs-sm mb-0">No invoices yet.</p>
            ) : (
              <Table responsive size="sm" className="mb-0 align-middle">
                <thead className="fs-xs text-muted">
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th className="text-end">PDF</th>
                    <th className="text-end">Online</th>
                  </tr>
                </thead>
                <tbody className="fs-sm">
                  {invoices.map((invoice) => {
                    const isOpen = invoice.status === 'open' || invoice.status === 'draft';
                    const amount =
                      isOpen && (invoice.amount_due ?? invoice.amount_remaining ?? 0) > 0
                        ? (invoice.amount_due ?? invoice.amount_remaining ?? 0)
                        : invoice.amount_paid;
                    return (
                      <tr key={invoice.id}>
                        <td>{new Date(invoice.created * 1000).toLocaleDateString('nl-NL')}</td>
                        <td>{invoice.status}</td>
                        <td>{formatMoney(amount, invoice.currency)}</td>
                        <td className="text-end">
                          {invoice.invoice_pdf ? (
                            <Button
                              as="a"
                              variant="outline-secondary"
                              size="sm"
                              href={invoice.invoice_pdf}
                              target="_blank"
                              rel="noreferrer"
                            >
                              PDF
                            </Button>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="text-end">
                          {invoice.hosted_invoice_url ? (
                            <Button
                              as="a"
                              variant="link"
                              size="sm"
                              className="p-0"
                              href={invoice.hosted_invoice_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {isOpen ? 'Pay now' : 'View'}
                            </Button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      ) : null}

      <Table responsive className="mb-4 align-middle">
        <tbody className="fs-sm">
          <tr>
            <th className="text-muted fw-semibold bg-light" style={{ width: '40%' }}>
              Plan (account)
            </th>
            <td>{planId || (hasStripeCustomer ? '—' : 'Free')}</td>
          </tr>
          <tr>
            <th className="text-muted fw-semibold bg-light">Stripe customer</th>
            <td>
              {stripeCustomerId ? <code className="fs-xs">{stripeCustomerId}</code> : <span className="text-muted">—</span>}
            </td>
          </tr>
          <tr>
            <th className="text-muted fw-semibold bg-light">Account document</th>
            <td>
              {accountDoc?.$id ? (
                <code className="fs-xs">{accountDoc.$id}</code>
              ) : (
                <span className="text-muted">No account row found</span>
              )}
            </td>
          </tr>
        </tbody>
      </Table>

      {hasStripeCustomer ? (
        <p className="text-muted fs-xs mb-0">
          <button
            type="button"
            className="btn btn-link p-0 align-baseline fs-xs text-muted"
            onClick={handleOpenPortal}
            disabled={portalLoading}
          >
            {portalLoading ? 'Opening…' : 'Advanced billing on Stripe (portal)'}
          </button>
        </p>
      ) : null}

      <StripeElementsModal
        show={addCardOpen}
        onHide={() => setAddCardOpen(false)}
        onSuccess={() => setAddCardOpen(false)}
      />

      <Modal show={changePlanOpen} onHide={() => setChangePlanOpen(false)} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Change plan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {plansLoading ? (
            <div className="d-flex align-items-center gap-2">
              <Spinner animation="border" size="sm" />
              <span className="text-muted fs-sm">Loading plans…</span>
            </div>
          ) : !stripePlans?.length ? (
            <p className="text-muted fs-sm mb-0">No plans available.</p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {stripePlans.map((plan: StripePlan) => (
                <Card key={plan.id} className="border shadow-none">
                  <Card.Body className="py-3">
                    <div className="d-flex flex-wrap justify-content-between gap-2">
                      <div>
                        <h6 className="mb-1">{plan.name}</h6>
                        <p className="text-muted fs-sm mb-0">{plan.description}</p>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {plan.monthlyPriceId ? (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            disabled={createCheckout.isPending}
                            onClick={() => handleSelectPlanPrice(plan.monthlyPriceId)}
                          >
                            Monthly
                          </Button>
                        ) : null}
                        {plan.yearlyPriceId ? (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            disabled={createCheckout.isPending}
                            onClick={() => handleSelectPlanPrice(plan.yearlyPriceId)}
                          >
                            Yearly
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default UserProfileSubscriptionTab;
