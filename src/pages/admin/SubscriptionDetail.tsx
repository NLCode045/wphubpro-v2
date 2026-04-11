import { ROUTE_PATHS } from '@/config/routePaths';
import { useNotificationContext } from '@/context/useNotificationContext';
import {
  defaultPaymentMethodLabel,
  formatMoneyFromStripe,
  formatUnixSeconds,
  latestInvoiceSummary,
  metadataEntries,
  stripeSubscriptionDashboardUrl,
  subscriptionLineRows,
} from '@/lib/adminSubscriptionView';
import { formatStripeAddress } from '@/lib/adminStripeFormat';
import { useAdminSubscriptionAction, useAdminSubscriptionDetail } from '@/hooks/useAdminSubscriptions';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { Link, useParams } from 'react-router';

/**
 * Admin subscription detail — `GET /api/stripe/admin/subscriptions/:id` (server: `subscriptions.ts#getSubscription`).
 * Actions — `POST .../actions` → `runStripeSubscriptionAdminAction` in `admin.ts`.
 */
const SubscriptionDetailPage = () => {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const { showNotification } = useNotificationContext();
  const { data, isLoading, error, refetch } = useAdminSubscriptionDetail(subscriptionId);
  const actionMut = useAdminSubscriptionAction();

  const notifyOk = (title: string, message: string) =>
    showNotification({ title, message, variant: 'success', delay: 3500 });
  const notifyErr = (title: string, message: string) =>
    showNotification({ title, message, variant: 'danger', delay: 6000 });

  const runAction = (
    label: string,
    fn: () => ReturnType<typeof actionMut.mutateAsync>,
  ) => {
    void fn()
      .then(() => {
        notifyOk(label, 'Updated.');
        void refetch();
      })
      .catch((e: unknown) => {
        notifyErr(label, e instanceof Error ? e.message : 'Request failed');
      });
  };

  if (!subscriptionId) return <p className="text-danger">Missing subscription id.</p>;
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div>
        <p className="text-danger">{error?.message ?? 'Not found'}</p>
        <Link to={ROUTE_PATHS.ADMIN_FINANCE_SUBSCRIPTIONS}>Back to subscriptions</Link>
      </div>
    );
  }

  const sub = data.subscription as Record<string, unknown>;
  const customer = data.customer as Record<string, unknown> | null;
  const sid = String(sub.id ?? subscriptionId);
  const status = String(sub.status ?? '—');
  const paused = Boolean(sub.pause_collection);
  const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
  const lines = subscriptionLineRows(sub);
  const inv = latestInvoiceSummary(sub);
  const dpmRaw = sub.default_payment_method;
  const pmLabel = defaultPaymentMethodLabel(dpmRaw);
  const metaRows = metadataEntries(sub);
  const custEmail = customer && typeof customer.email === 'string' ? customer.email : null;
  const custName = customer && typeof customer.name === 'string' ? customer.name : null;
  const custPhone = customer && typeof customer.phone === 'string' ? customer.phone : null;
  const custId = customer && typeof customer.id === 'string' ? customer.id : null;
  const custBalance =
    customer && typeof customer.balance === 'number' ? customer.balance : null;
  const custCurrency = customer && typeof customer.currency === 'string' ? customer.currency : 'usd';

  return (
    <div>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
        <div>
          <Link to={ROUTE_PATHS.ADMIN_FINANCE_SUBSCRIPTIONS} className="small text-decoration-none">
            ← Subscriptions
          </Link>
          <h4 className="mt-2 mb-0">Subscription</h4>
          <code className="small text-muted">{sid}</code>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            href={stripeSubscriptionDashboardUrl(sid)}
            target="_blank"
            rel="noreferrer"
          >
            Open in Stripe
          </Button>
        </div>
      </div>

      <Row className="g-3 mb-3">
        <Col lg={7}>
          <Card className="border shadow-none h-100">
            <Card.Body>
              <h6 className="text-muted text-uppercase small">Status & billing</h6>
              <p className="mb-2">
                <Badge bg={status === 'active' || status === 'trialing' ? 'success' : 'secondary'}>
                  {status}
                </Badge>
                {paused ? (
                  <Badge bg="warning" text="dark" className="ms-2">
                    Paused
                  </Badge>
                ) : null}
                {cancelAtPeriodEnd ? (
                  <Badge bg="info" text="dark" className="ms-2">
                    Cancels at period end
                  </Badge>
                ) : null}
              </p>
              <dl className="row small mb-0">
                <dt className="col-sm-4 text-muted">Collection</dt>
                <dd className="col-sm-8">{String(sub.collection_method ?? '—')}</dd>
                <dt className="col-sm-4 text-muted">Current period</dt>
                <dd className="col-sm-8">
                  {formatUnixSeconds(sub.current_period_start)} → {formatUnixSeconds(sub.current_period_end)}
                </dd>
                <dt className="col-sm-4 text-muted">Created</dt>
                <dd className="col-sm-8">{formatUnixSeconds(sub.created)}</dd>
                <dt className="col-sm-4 text-muted">Start date</dt>
                <dd className="col-sm-8">{formatUnixSeconds(sub.start_date)}</dd>
                {typeof sub.trial_start === 'number' || typeof sub.trial_end === 'number' ? (
                  <>
                    <dt className="col-sm-4 text-muted">Trial</dt>
                    <dd className="col-sm-8">
                      {formatUnixSeconds(sub.trial_start)} → {formatUnixSeconds(sub.trial_end)}
                    </dd>
                  </>
                ) : null}
                {typeof sub.cancel_at === 'number' ? (
                  <>
                    <dt className="col-sm-4 text-muted">Cancel at</dt>
                    <dd className="col-sm-8">{formatUnixSeconds(sub.cancel_at)}</dd>
                  </>
                ) : null}
                {typeof sub.canceled_at === 'number' ? (
                  <>
                    <dt className="col-sm-4 text-muted">Canceled at</dt>
                    <dd className="col-sm-8">{formatUnixSeconds(sub.canceled_at)}</dd>
                  </>
                ) : null}
              </dl>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="border shadow-none h-100">
            <Card.Body>
              <h6 className="text-muted text-uppercase small">Customer</h6>
              {custName ? <p className="mb-1 fw-medium">{custName}</p> : null}
              <p className="mb-1 small">{custEmail ?? '—'}</p>
              {custPhone ? <p className="mb-1 small text-muted">{custPhone}</p> : null}
              {custId ? (
                <p className="mb-2 small font-monospace text-break">{custId}</p>
              ) : (
                <p className="mb-2 small text-muted">—</p>
              )}
              {custBalance != null ? (
                <p className="small mb-0 text-muted">
                  Balance: {formatMoneyFromStripe(Math.abs(custBalance), custCurrency)}
                  {custBalance < 0 ? ' (credit)' : ''}
                </p>
              ) : null}
              {customer && typeof customer.address === 'object' && customer.address !== null ? (
                <p className="small text-muted mt-2 mb-0">{formatStripeAddress(customer.address)}</p>
              ) : null}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border shadow-none mb-3">
        <Card.Body>
          <h6 className="text-muted text-uppercase small mb-3">Line items</h6>
          {!lines.length ? (
            <p className="text-muted small mb-0">No line items.</p>
          ) : (
            <div className="table-responsive">
              <Table size="sm" className="mb-0 align-middle">
                <thead className="small text-muted">
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Interval</th>
                    <th className="font-monospace">Price id</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((row) => (
                    <tr key={row.lineId}>
                      <td>{row.productName}</td>
                      <td>{row.quantity}</td>
                      <td>{row.unitAmountLabel}</td>
                      <td className="small">{row.intervalLabel}</td>
                      <td className="small font-monospace">{row.priceId}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Row className="g-3 mb-3">
        <Col md={6}>
          <Card className="border shadow-none h-100">
            <Card.Body>
              <h6 className="text-muted text-uppercase small">Default payment method</h6>
              <p className="mb-0">{pmLabel ?? '—'}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border shadow-none h-100">
            <Card.Body>
              <h6 className="text-muted text-uppercase small">Latest invoice</h6>
              {inv.id ? (
                <>
                  <p className="mb-1 small">
                    <Badge bg="secondary">{inv.status ?? '—'}</Badge>{' '}
                    <span className="fw-medium">{inv.totalLabel}</span>
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <Link
                      to={ROUTE_PATHS.adminFinanceInvoicePath(inv.id)}
                      className="small"
                    >
                      Admin detail
                    </Link>
                    {inv.hostedInvoiceUrl ? (
                      <a
                        href={inv.hostedInvoiceUrl}
                        className="small"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Stripe hosted
                      </a>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-muted small mb-0">No invoice on subscription snapshot.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {metaRows.length > 0 ? (
        <Card className="border shadow-none mb-3">
          <Card.Body>
            <h6 className="text-muted text-uppercase small mb-2">Metadata</h6>
            <Table size="sm" className="mb-0 small">
              <tbody>
                {metaRows.map((m) => (
                  <tr key={m.key}>
                    <td className="text-muted font-monospace" style={{ width: '40%' }}>
                      {m.key}
                    </td>
                    <td className="text-break">{m.value}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      ) : null}

      <Card className="border shadow-none">
        <Card.Body>
          <h6 className="text-muted text-uppercase small mb-3">Actions</h6>
          <Alert variant="light" className="small border mb-3 py-2">
            Changes apply in Stripe immediately (subject to your server mapping{' '}
            <code className="small">POST /api/stripe/admin/subscriptions/:id/actions</code>).
          </Alert>
          <div className="d-flex flex-wrap gap-2">
            <Button
              variant="outline-danger"
              size="sm"
              disabled={actionMut.isPending || status === 'canceled'}
              onClick={() => {
                if (!window.confirm('Schedule cancellation at the end of the current billing period?')) return;
                runAction('Cancel at period end', () =>
                  actionMut.mutateAsync({
                    subscriptionId: sid,
                    action: 'cancel',
                    atPeriodEnd: true,
                  }),
                );
              }}
            >
              Cancel at period end
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={actionMut.isPending || status === 'canceled'}
              onClick={() => {
                if (!window.confirm('Cancel this subscription immediately? This cannot be undone.')) return;
                runAction('Cancel now', () =>
                  actionMut.mutateAsync({
                    subscriptionId: sid,
                    action: 'cancel',
                  }),
                );
              }}
            >
              Cancel now
            </Button>
            <Button
              variant="outline-warning"
              size="sm"
              disabled={actionMut.isPending || paused || status === 'canceled'}
              onClick={() => {
                if (!window.confirm('Pause collection? Invoices may be marked uncollectible.')) return;
                runAction('Pause', () =>
                  actionMut.mutateAsync({ subscriptionId: sid, action: 'pause' }),
                );
              }}
            >
              Pause collection
            </Button>
            <Button
              variant="outline-success"
              size="sm"
              disabled={actionMut.isPending || !paused || status === 'canceled'}
              onClick={() => {
                if (!window.confirm('Resume billing for this subscription?')) return;
                runAction('Resume', () =>
                  actionMut.mutateAsync({ subscriptionId: sid, action: 'resume' }),
                );
              }}
            >
              Resume
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default SubscriptionDetailPage;
