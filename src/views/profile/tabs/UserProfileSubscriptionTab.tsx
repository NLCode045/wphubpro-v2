import { ContactSupportButton } from '@/components/support/ContactSupportButton';
import { useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { useSearchParams } from 'react-router';
import type { BillingAccountContext } from '@/domains/billing';
import {
  checkoutUpdateTypeForPlanChange,
  findPlanSelectionByPriceId,
  selectedPlanAmountCents,
  useCancelScheduledPlanChange,
  useCancelSubscription,
  useCreateCheckoutSession,
  useEnsureStripeCustomer,
  useInvoices,
  useDetachPaymentMethod,
  usePaymentMethods,
  usePreparePayInvoice,
  usePreviewProration,
  useSetDefaultPaymentMethod,
  useStripeCustomerProfile,
  useStripePlans,
  useSubscription,
  useSubscriptionDetails,
  useUpdateBillingDetails,
} from '@/domains/billing';
import { useMyAccountDoc } from '@/domains/profile/useMyAccountDoc';
import { useAuth } from '@/domains/auth';
import { useNotificationContext } from '@/context/useNotificationContext';
import { StripeElementsModal } from '@/integrations/stripe/StripeElementsModal';
import { StripePaymentIntentModal } from '@/integrations/stripe/StripePaymentIntentModal';
import type {
  StripePaymentMethod,
  StripePlan,
  StripeProrationPreviewResponse,
  SubscriptionDetailsResponse,
} from '@/types';

const formatMoney = (amountCents: number, currency = 'eur') =>
  (amountCents / 100).toLocaleString('nl-NL', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatMoneyMajorUnits = (amount: number, currency = 'eur') =>
  amount.toLocaleString('nl-NL', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatBillingDate = (unixSeconds: number) =>
  new Date(unixSeconds * 1000).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

function formatPaymentMethodLabel(pm: StripePaymentMethod): string {
  const card = pm.card;
  if (card) {
    return `${card.brand} ·••• ${card.last4} (${String(card.exp_month).padStart(2, '0')}/${card.exp_year})`;
  }
  return pm.type;
}

const EMPTY_PAYMENT_METHODS: StripePaymentMethod[] = [];

function nextInvoiceFromDetails(details: SubscriptionDetailsResponse) {
  const ui = details.upcoming_invoice;
  const sub = details.subscription;
  const paymentAttempt = ui?.next_payment_attempt ?? null;
  const fallbackTs = ui?.period_end ?? sub?.current_period_end ?? null;
  const dateTs = paymentAttempt ?? fallbackTs;
  return {
    dateTs,
    isPaymentAttempt: Boolean(paymentAttempt),
    upcoming: ui,
  };
}

type PayIntentState = { clientSecret: string; title: string } | null;

type UpgradeConfirmState = {
  preview: StripeProrationPreviewResponse;
  priceId: string;
} | null;

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
  const { data: customerProfile } = useStripeCustomerProfile(billingCtx, {
    enabled: Boolean(stripeCustomerId.trim()) && !subscriptionId,
  });
  const { data: subscriptionDetails, isLoading: detailsLoading } = useSubscriptionDetails(
    subscriptionId,
    billingCtx
  );
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(billingCtx);
  const { data: paymentMethodsData, isLoading: pmLoading } = usePaymentMethods(billingCtx);
  const paymentMethods = paymentMethodsData?.paymentMethods ?? EMPTY_PAYMENT_METHODS;
  const customerDefaultPaymentMethodId = paymentMethodsData?.defaultPaymentMethodId ?? null;
  const { data: stripePlans, isLoading: plansLoading } = useStripePlans(billingCtx);

  const cancelSubscription = useCancelSubscription();
  const cancelSchedule = useCancelScheduledPlanChange();
  const setDefaultPm = useSetDefaultPaymentMethod();
  const detachPm = useDetachPaymentMethod();
  const createCheckout = useCreateCheckoutSession();
  const previewProration = usePreviewProration();
  const preparePayInvoice = usePreparePayInvoice();
  const updateBilling = useUpdateBillingDetails();
  const ensureCustomer = useEnsureStripeCustomer();

  const [addCardOpen, setAddCardOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [changePlanYearly, setChangePlanYearly] = useState(false);
  const [payIntent, setPayIntent] = useState<PayIntentState>(null);
  const [upgradeConfirm, setUpgradeConfirm] = useState<UpgradeConfirmState>(null);
  /** When the customer has saved cards but no default, checkout uses this payment method id */
  const [checkoutPaymentMethodId, setCheckoutPaymentMethodId] = useState<string | null>(null);

  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [billingLine1, setBillingLine1] = useState('');
  const [billingLine2, setBillingLine2] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingPostal, setBillingPostal] = useState('');
  const [billingCountry, setBillingCountry] = useState('');

  useEffect(() => {
    if (!changePlanOpen) return;
    if (subscription?.interval === 'year') setChangePlanYearly(true);
    else if (subscription?.interval === 'month') setChangePlanYearly(false);
  }, [changePlanOpen, subscription?.interval]);

  useEffect(() => {
    const c = subscriptionDetails?.customer ?? customerProfile;
    if (!c) return;
    setBillingName(c.name ?? '');
    setBillingEmail(c.email ?? '');
    setBillingPhone(c.phone ?? '');
    const a = c.address;
    setBillingLine1(a?.line1 ?? '');
    setBillingLine2(a?.line2 ?? '');
    setBillingCity(a?.city ?? '');
    setBillingState(a?.state ?? '');
    setBillingPostal(a?.postal_code ?? '');
    setBillingCountry(a?.country ?? '');
  }, [subscriptionDetails?.customer, customerProfile]);

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

  useEffect(() => {
    if (customerDefaultPaymentMethodId) {
      setCheckoutPaymentMethodId(null);
      return;
    }
    if (paymentMethods.length === 0) {
      setCheckoutPaymentMethodId(null);
      return;
    }
    setCheckoutPaymentMethodId((prev) => {
      if (prev && paymentMethods.some((p) => p.id === prev)) return prev;
      return paymentMethods[0].id;
    });
  }, [customerDefaultPaymentMethodId, paymentMethods]);

  const defaultPaymentMethodId =
    customerDefaultPaymentMethodId ?? subscriptionDetails?.payment_method?.id ?? null;
  const needsCheckoutPaymentMethodChoice = Boolean(
    paymentMethods.length > 0 && !customerDefaultPaymentMethodId
  );
  const checkoutPaymentMethodBlocking =
    needsCheckoutPaymentMethodChoice && (!checkoutPaymentMethodId || pmLoading);
  const planId = accountDoc?.current_plan_id?.trim() || '';
  const hasStripeCustomer = Boolean(stripeCustomerId);

  const nextInvoice =
    subscriptionDetails != null ? nextInvoiceFromDetails(subscriptionDetails) : null;

  const isFree =
    !subscription?.priceAmount ||
    subscription.priceAmount === 0 ||
    (subscription.planId ?? '').toUpperCase() === 'FREE';

  const outstandingCents = useMemo(() => {
    if (!invoices?.length) return { total: 0, currency: 'eur', count: 0 };
    let total = 0;
    let count = 0;
    let currency = 'eur';
    for (const inv of invoices) {
      const open = inv.status === 'open' || inv.status === 'draft' || inv.status === 'uncollectible';
      if (!open) continue;
      const due = inv.amount_remaining ?? inv.amount_due ?? 0;
      if (due > 0) {
        total += due;
        count += 1;
        currency = inv.currency || currency;
      }
    }
    return { total, currency, count };
  }, [invoices]);

  const invalidateBilling = () => {
    void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    void queryClient.invalidateQueries({ queryKey: ['subscriptionDetails'] });
    void queryClient.invalidateQueries({ queryKey: ['invoices'] });
    void queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
  };

  const openPaymentModal = (clientSecret: string, title: string) => {
    setPayIntent({ clientSecret, title });
    setChangePlanOpen(false);
    setUpgradeConfirm(null);
  };

  const runPlanCheckout = (priceId: string, updateType?: 'upgrade' | 'downgrade') => {
    const returnUrl = `${window.location.origin}${window.location.pathname}?tab=subscription`;
    const paymentMethodId =
      needsCheckoutPaymentMethodChoice && checkoutPaymentMethodId
        ? checkoutPaymentMethodId
        : undefined;
    createCheckout.mutate(
      { priceId, returnUrl, updateType, paymentMethodId },
      {
        onSuccess: (data) => {
          if (data?.payment?.clientSecret) {
            openPaymentModal(
              data.payment.clientSecret,
              updateType === 'upgrade' ? 'Complete upgrade payment' : 'Complete subscription payment'
            );
            return;
          }
          if (data?.url) {
            window.location.href = data.url;
          }
        },
      }
    );
  };

  const handleSelectPlanPrice = (priceId: string | null, yearly: boolean) => {
    if (!priceId || !stripePlans?.length) return;
    const selection = findPlanSelectionByPriceId(priceId, stripePlans);
    if (!selection) {
      showNotification({
        title: 'Plan',
        message: 'Could not resolve the selected price.',
        variant: 'danger',
        delay: 4000,
      });
      return;
    }
    const newCents = selectedPlanAmountCents(selection.plan, yearly);
    const hasActivePaid = Boolean(subscription && !isFree);
    const currentCents = subscription?.priceAmount ?? 0;
    const updateType = checkoutUpdateTypeForPlanChange({
      hasActivePaidSubscription: hasActivePaid,
      currentPriceAmountCents: currentCents,
      newPriceAmountCents: newCents,
    });

    if (hasActivePaid && newCents > currentCents && subscriptionId) {
      previewProration.mutate(
        { subscriptionId, newPriceId: priceId },
        {
          onSuccess: (preview) => {
            setUpgradeConfirm({ preview, priceId });
          },
        }
      );
      return;
    }

    runPlanCheckout(priceId, updateType);
  };

  const handleConfirmUpgrade = () => {
    if (!upgradeConfirm) return;
    runPlanCheckout(upgradeConfirm.priceId, 'upgrade');
    setUpgradeConfirm(null);
  };

  const handlePayInvoiceClick = (invoiceId: string) => {
    preparePayInvoice.mutate(
      { invoiceId },
      {
        onSuccess: (data) => {
          if (data.clientSecret) {
            openPaymentModal(data.clientSecret, 'Pay invoice');
          }
        },
      }
    );
  };

  const handleSaveBilling = (e: FormEvent) => {
    e.preventDefault();
    updateBilling.mutate({
      name: billingName,
      email: billingEmail,
      phone: billingPhone,
      address: {
        line1: billingLine1 || undefined,
        line2: billingLine2 || undefined,
        city: billingCity || undefined,
        state: billingState || undefined,
        postal_code: billingPostal || undefined,
        country: billingCountry || undefined,
      },
    });
  };

  const cancelEffectiveDate =
    subscriptionDetails?.subscription?.cancel_at ??
    subscriptionDetails?.subscription?.current_period_end ??
    subscription?.currentPeriodEnd ??
    null;

  const subscriptionStartDate =
    subscriptionDetails?.subscription?.start_date ?? subscriptionDetails?.subscription?.created ?? null;

  const handleCancelClick = () => {
    const when =
      cancelEffectiveDate != null
        ? formatBillingDate(cancelEffectiveDate)
        : 'the end of the current billing period';
    if (!window.confirm(`Cancel subscription? You keep access until ${when}.`)) return;
    cancelSubscription.mutate();
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
        Manage your plan, payment methods, invoices, and billing details here. Payments use secure Stripe
        Elements on this site (no billing portal redirect).
      </p>

      {!hasStripeCustomer && accountDoc ? (
        <Alert variant="light" className="border mb-4">
          <p className="mb-2 fs-sm">
            Link a Stripe customer to your account to subscribe and manage cards and invoices.
          </p>
          <Button
            variant="primary"
            size="sm"
            disabled={ensureCustomer.isPending}
            onClick={() => ensureCustomer.mutate()}
          >
            {ensureCustomer.isPending ? 'Setting up…' : 'Set up billing'}
          </Button>
        </Alert>
      ) : null}

      {!accountDoc ? (
        <Alert variant="warning" className="mb-4">
          No account record found for your user. You may need to complete onboarding first.
        </Alert>
      ) : null}

      {hasStripeCustomer && outstandingCents.count > 0 ? (
        <Alert variant="warning" className="py-2 mb-4 fs-sm">
          <strong>Outstanding:</strong> {outstandingCents.count} open invoice
          {outstandingCents.count === 1 ? '' : 's'} totaling{' '}
          {formatMoney(outstandingCents.total, outstandingCents.currency)}. Pay below or add a default card.
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
                        ? ` · Current period ends ${formatBillingDate(subscription.currentPeriodEnd)}`
                        : null}
                    </p>
                  </>
                ) : (
                  <p className="text-muted fs-sm mb-0">No active subscription. Choose a plan to subscribe.</p>
                )}
              </div>
              <div className="d-flex flex-wrap gap-2">
                <ContactSupportButton
                  category="billing"
                  context={{
                    sourceLabel: 'Billing & subscription',
                    subscriptionId: subscriptionId ?? undefined,
                  }}
                />
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

            {subscription?.cancelAtPeriodEnd && cancelEffectiveDate ? (
              <Alert variant="warning" className="py-2 mb-3 fs-sm">
                Subscription ends on <strong>{formatBillingDate(cancelEffectiveDate)}</strong>. You retain access
                until that date.
              </Alert>
            ) : null}

            {subscription?.cancelAtPeriodEnd && !cancelEffectiveDate ? (
              <Alert variant="warning" className="py-2 mb-3 fs-sm">
                This subscription will end at the end of the current billing period.
              </Alert>
            ) : null}

            {subscriptionDetails?.pending_update ? (
              <Alert variant="info" className="py-2 mb-3 fs-sm">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                  <div>
                    <strong>Scheduled plan change:</strong> on{' '}
                    <strong>{formatBillingDate(subscriptionDetails.pending_update.date)}</strong> your plan
                    becomes <strong>{subscriptionDetails.pending_update.plan_name}</strong> (
                    {formatMoney(
                      subscriptionDetails.pending_update.price_amount,
                      subscriptionDetails.pending_update.currency
                    )}
                    {subscriptionDetails.pending_update.interval
                      ? ` / ${subscriptionDetails.pending_update.interval}`
                      : ''}
                    ).
                  </div>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="text-nowrap"
                    disabled={cancelSchedule.isPending}
                    onClick={() =>
                      cancelSchedule.mutate({
                        scheduleId: subscriptionDetails.pending_update?.schedule_id,
                        subscriptionId: subscriptionId ?? undefined,
                      })
                    }
                  >
                    Undo downgrade
                  </Button>
                </div>
              </Alert>
            ) : null}

            {!subscriptionLoading && !subscription ? (
              <Alert variant="info" className="mb-3 py-2 fs-sm">
                Payment methods and invoices below apply to your Stripe customer. Start a subscription via
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
                <p className="text-muted fs-xs text-uppercase fw-semibold mb-2">Plan details</p>
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
                {subscriptionDetails.plan?.limits ? (
                  <p className="fs-sm mb-1">
                    <span className="text-muted">Limits:</span>{' '}
                    {[
                      subscriptionDetails.plan.limits.sites_limit != null
                        ? `${subscriptionDetails.plan.limits.sites_limit} sites`
                        : null,
                      subscriptionDetails.plan.limits.library_limit != null
                        ? `${subscriptionDetails.plan.limits.library_limit} library`
                        : null,
                      subscriptionDetails.plan.limits.storage_limit != null
                        ? `${subscriptionDetails.plan.limits.storage_limit} storage`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </p>
                ) : null}

                <p className="text-muted fs-xs text-uppercase fw-semibold mb-2 mt-3">Subscription dates</p>
                {subscriptionStartDate ? (
                  <p className="fs-sm mb-1">
                    <span className="text-muted">Started:</span> {formatBillingDate(subscriptionStartDate)}
                  </p>
                ) : null}
                {subscriptionDetails.subscription ? (
                  <>
                    {subscriptionDetails.subscription.current_period_start ? (
                      <p className="fs-sm mb-1">
                        <span className="text-muted">Current period started:</span>{' '}
                        {formatBillingDate(subscriptionDetails.subscription.current_period_start)}
                      </p>
                    ) : null}
                    {subscriptionDetails.subscription.current_period_end ? (
                      <p className="fs-sm mb-1">
                        <span className="text-muted">Current period ends:</span>{' '}
                        {formatBillingDate(subscriptionDetails.subscription.current_period_end)}
                      </p>
                    ) : null}
                  </>
                ) : null}

                {nextInvoice &&
                (subscriptionDetails.upcoming_invoice ||
                  subscriptionDetails.subscription?.current_period_end) ? (
                  <>
                    <p className="text-muted fs-xs text-uppercase fw-semibold mb-2 mt-3">Next payment</p>
                    {nextInvoice.dateTs ? (
                      <p className="fs-sm mb-1">
                        <span className="text-muted">
                          {nextInvoice.isPaymentAttempt ? 'Payment date:' : 'Expected date:'}
                        </span>{' '}
                        {formatBillingDate(nextInvoice.dateTs)}
                        {!nextInvoice.isPaymentAttempt ? (
                          <span className="text-muted"> (end of current period)</span>
                        ) : null}
                      </p>
                    ) : (
                      <p className="fs-sm mb-1 text-muted">No upcoming invoice scheduled yet.</p>
                    )}
                    {nextInvoice.upcoming ? (
                      <p className="fs-sm mb-1">
                        <span className="text-muted">Amount:</span>{' '}
                        {formatMoney(nextInvoice.upcoming.amount_due, nextInvoice.upcoming.currency)}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </Card.Body>
        </Card>
      ) : null}

      {hasStripeCustomer ? (
        <Card className="mb-4 border shadow-none">
          <Card.Body>
            <h6 className="fw-semibold mb-3">Billing details</h6>
            <Form onSubmit={handleSaveBilling}>
              <Row className="g-2 mb-2">
                <Col md={6}>
                  <Form.Label className="fs-xs text-muted">Name</Form.Label>
                  <Form.Control
                    size="sm"
                    value={billingName}
                    onChange={(e) => setBillingName(e.target.value)}
                    autoComplete="name"
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="fs-xs text-muted">Email</Form.Label>
                  <Form.Control
                    size="sm"
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    autoComplete="email"
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="fs-xs text-muted">Phone</Form.Label>
                  <Form.Control
                    size="sm"
                    value={billingPhone}
                    onChange={(e) => setBillingPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </Col>
                <Col md={12}>
                  <Form.Label className="fs-xs text-muted">Address line 1</Form.Label>
                  <Form.Control
                    size="sm"
                    value={billingLine1}
                    onChange={(e) => setBillingLine1(e.target.value)}
                    autoComplete="address-line1"
                  />
                </Col>
                <Col md={12}>
                  <Form.Label className="fs-xs text-muted">Address line 2</Form.Label>
                  <Form.Control
                    size="sm"
                    value={billingLine2}
                    onChange={(e) => setBillingLine2(e.target.value)}
                    autoComplete="address-line2"
                  />
                </Col>
                <Col md={4}>
                  <Form.Label className="fs-xs text-muted">City</Form.Label>
                  <Form.Control
                    size="sm"
                    value={billingCity}
                    onChange={(e) => setBillingCity(e.target.value)}
                    autoComplete="address-level2"
                  />
                </Col>
                <Col md={4}>
                  <Form.Label className="fs-xs text-muted">State / Region</Form.Label>
                  <Form.Control
                    size="sm"
                    value={billingState}
                    onChange={(e) => setBillingState(e.target.value)}
                    autoComplete="address-level1"
                  />
                </Col>
                <Col md={4}>
                  <Form.Label className="fs-xs text-muted">Postal code</Form.Label>
                  <Form.Control
                    size="sm"
                    value={billingPostal}
                    onChange={(e) => setBillingPostal(e.target.value)}
                    autoComplete="postal-code"
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="fs-xs text-muted">Country (ISO, e.g. NL)</Form.Label>
                  <Form.Control
                    size="sm"
                    value={billingCountry}
                    onChange={(e) => setBillingCountry(e.target.value)}
                    autoComplete="country"
                  />
                </Col>
              </Row>
              <Button type="submit" variant="primary" size="sm" disabled={updateBilling.isPending}>
                {updateBilling.isPending ? 'Saving…' : 'Save billing details'}
              </Button>
            </Form>
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
                    <th className="text-end">Pay</th>
                  </tr>
                </thead>
                <tbody className="fs-sm">
                  {invoices.map((invoice) => {
                    const isOpen = invoice.status === 'open' || invoice.status === 'draft';
                    const amount =
                      isOpen && (invoice.amount_due ?? invoice.amount_remaining ?? 0) > 0
                        ? (invoice.amount_due ?? invoice.amount_remaining ?? 0)
                        : invoice.amount_paid;
                    const canPayInApp =
                      isOpen && (invoice.amount_due ?? invoice.amount_remaining ?? 0) > 0;
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
                          {canPayInApp ? (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={preparePayInvoice.isPending}
                              onClick={() => handlePayInvoiceClick(invoice.id)}
                            >
                              Pay in app
                            </Button>
                          ) : invoice.hosted_invoice_url ? (
                            <Button
                              as="a"
                              variant="link"
                              size="sm"
                              className="p-0"
                              href={invoice.hosted_invoice_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View
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

      <Table responsive className="mb-0 align-middle">
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

      <StripeElementsModal
        show={addCardOpen}
        onHide={() => setAddCardOpen(false)}
        onSuccess={() => setAddCardOpen(false)}
      />

      <StripePaymentIntentModal
        show={Boolean(payIntent?.clientSecret)}
        clientSecret={payIntent?.clientSecret ?? null}
        title={payIntent?.title ?? 'Complete payment'}
        onHide={() => setPayIntent(null)}
        onSuccess={() => {
          invalidateBilling();
          showNotification({
            title: 'Payment successful',
            message: 'Your payment was processed.',
            variant: 'success',
            delay: 4000,
          });
          setPayIntent(null);
        }}
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
            <>
              <Alert variant="light" className="border mb-3 fs-sm">
                <strong>Upgrades</strong> apply immediately; you may be charged a prorated amount in the payment
                step. <strong>Downgrades</strong> take effect at the start of your next billing period (see
                scheduled plan change above when set).
              </Alert>
              {needsCheckoutPaymentMethodChoice ? (
                <Alert variant="warning" className="fs-sm mb-3 py-3">
                  <Form.Group className="mb-0">
                    <Form.Label className="fw-semibold">Payment method for checkout</Form.Label>
                    <p className="text-muted fs-sm mb-2">
                      You do not have a default card on file. Choose which saved card to use for this change.
                      You can set a default under Payment methods below.
                    </p>
                    <Form.Select
                      aria-label="Payment method for checkout"
                      value={checkoutPaymentMethodId ?? ''}
                      onChange={(e) => setCheckoutPaymentMethodId(e.target.value || null)}
                      disabled={pmLoading || paymentMethods.length === 0}
                    >
                      {paymentMethods.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {formatPaymentMethodLabel(pm)}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Alert>
              ) : null}
              <div className="d-flex align-items-center justify-content-center gap-3 mb-4 pb-3 border-bottom">
                <span className={`fs-sm ${!changePlanYearly ? 'fw-semibold text-body' : 'text-muted'}`}>
                  Monthly
                </span>
                <Form.Check
                  type="switch"
                  role="switch"
                  aria-label="Toggle yearly billing"
                  id="change-plan-interval-switch"
                  checked={changePlanYearly}
                  onChange={(e) => setChangePlanYearly(e.target.checked)}
                />
                <span className={`fs-sm ${changePlanYearly ? 'fw-semibold text-body' : 'text-muted'}`}>
                  Yearly
                </span>
              </div>
              <div className="d-flex flex-column gap-3">
                {stripePlans.map((plan: StripePlan) => {
                  const priceId = changePlanYearly ? plan.yearlyPriceId : plan.monthlyPriceId;
                  const amount = changePlanYearly ? plan.yearlyPrice : plan.monthlyPrice;
                  const hasPrice = priceId != null && amount != null;
                  const currentPriceId = subscription?.priceId?.trim() || null;
                  const isCurrentPlan = Boolean(
                    currentPriceId && priceId && currentPriceId === priceId
                  );
                  const currentCents =
                    subscription && !isFree ? (subscription.priceAmount ?? 0) : 0;
                  const rowCents = hasPrice ? selectedPlanAmountCents(plan, changePlanYearly) : 0;
                  const switchLabel =
                    !subscription || isFree
                      ? 'Choose plan'
                      : !hasPrice
                        ? 'Switch to this plan'
                        : rowCents > currentCents
                          ? 'Upgrade (see proration)'
                          : rowCents < currentCents
                            ? 'Downgrade at period end'
                            : 'Switch to this plan';
                  return (
                    <Card
                      key={plan.id}
                      className={`border shadow-none ${isCurrentPlan ? 'border-primary border-2' : ''}`}
                    >
                      <Card.Body className="py-3">
                        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                          <div className="flex-grow-1 min-w-0">
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                              <h6 className="mb-0">{plan.name}</h6>
                              {isCurrentPlan ? (
                                <Badge bg="primary" className="fs-xxs">
                                  Your current plan
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-muted fs-sm mb-2">{plan.description}</p>
                            {hasPrice ? (
                              <p className="mb-0 fs-5 fw-semibold">
                                {formatMoneyMajorUnits(amount, plan.currency)}
                                <span className="fs-sm fw-normal text-muted ms-1">
                                  / {changePlanYearly ? 'year' : 'month'}
                                </span>
                              </p>
                            ) : (
                              <p className="text-muted fs-sm mb-0">
                                No {changePlanYearly ? 'yearly' : 'monthly'} price for this plan.
                              </p>
                            )}
                          </div>
                          <div className="d-flex align-items-center">
                            {isCurrentPlan ? (
                              <Button variant="light" size="sm" disabled>
                                Current plan
                              </Button>
                            ) : hasPrice ? (
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={
                                  createCheckout.isPending ||
                                  previewProration.isPending ||
                                  checkoutPaymentMethodBlocking
                                }
                                onClick={() => handleSelectPlanPrice(priceId, changePlanYearly)}
                              >
                                {switchLabel}
                              </Button>
                            ) : (
                              <Button variant="outline-secondary" size="sm" disabled>
                                Unavailable
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={Boolean(upgradeConfirm)} onHide={() => setUpgradeConfirm(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm upgrade</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {upgradeConfirm ? (
            <>
              <p className="fs-sm mb-2">Estimated charge for this billing change:</p>
              <p className="fs-4 fw-semibold mb-3">
                {formatMoney(upgradeConfirm.preview.amountDue, upgradeConfirm.preview.currency)}
              </p>
              {upgradeConfirm.preview.lines?.length ? (
                <ul className="fs-sm text-muted mb-0">
                  {upgradeConfirm.preview.lines.map((line, i) => (
                    <li key={i}>
                      {line.description}: {formatMoney(line.amount, upgradeConfirm.preview.currency)}
                    </li>
                  ))}
                </ul>
              ) : null}
              {needsCheckoutPaymentMethodChoice ? (
                <Form.Group className="mt-3 mb-0">
                  <Form.Label className="fw-semibold fs-sm">Payment method</Form.Label>
                  <p className="text-muted fs-sm mb-2">
                    No default card is set. Choose a saved card for this payment.
                  </p>
                  <Form.Select
                    aria-label="Payment method for upgrade"
                    value={checkoutPaymentMethodId ?? ''}
                    onChange={(e) => setCheckoutPaymentMethodId(e.target.value || null)}
                    disabled={pmLoading || paymentMethods.length === 0}
                  >
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {formatPaymentMethodLabel(pm)}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              ) : null}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setUpgradeConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={createCheckout.isPending || checkoutPaymentMethodBlocking}
            onClick={handleConfirmUpgrade}
          >
            {createCheckout.isPending ? 'Processing…' : 'Continue to payment'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserProfileSubscriptionTab;
