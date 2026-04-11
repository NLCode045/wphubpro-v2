import { ROUTE_PATHS } from '@/config/routePaths';
import {
  billingIntervalFromSubscriptionJson,
  formatStripeAddress,
  planLabelFromSubscriptionJson,
} from '@/lib/adminStripeFormat';
import { useAdminSubscriptionAction, useAdminSubscriptionDetail } from '@/hooks/useAdminSubscriptions';
import { Badge, Button, ButtonGroup, Card, Col, Row, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router';

/**
 * Admin subscription detail via `GET /api/stripe/admin/subscriptions/:id` (`fetchAdminSubscription`).
 * Requires your API to proxy that path to Stripe admin JSON, or `VITE_STRIPE_ADMIN_DEV_MOCK=1` in dev.
 */
const SubscriptionDetailPage = () => {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const { data, isLoading, error, refetch } = useAdminSubscriptionDetail(subscriptionId);
  const actionMut = useAdminSubscriptionAction();

  if (!subscriptionId) return <p className="text-danger">Missing subscription id.</p>;
  if (isLoading) return <Spinner animation="border" />;
  if (error || !data) {
    return (
      <div>
        <p className="text-danger">{error?.message ?? 'Not found'}</p>
        <Link to={ROUTE_PATHS.ADMIN_FINANCE_SUBSCRIPTIONS}>Back to list</Link>
      </div>
    );
  }

  const sub = data.subscription as Record<string, unknown>;
  const customer = data.customer as Record<string, unknown> | null;
  const paused = Boolean(sub.pause_collection);
  const plan = planLabelFromSubscriptionJson(sub);
  const interval = billingIntervalFromSubscriptionJson(sub) ?? '—';

  const run = (action: 'cancel' | 'pause' | 'resume') => {
    const msg =
      action === 'cancel'
        ? 'Cancel this subscription immediately?'
        : action === 'pause'
          ? 'Pause billing?'
          : 'Resume subscription?';
    if (!window.confirm(msg)) return;
    actionMut.mutate(
      { subscriptionId, action },
      { onSuccess: () => void refetch() },
    );
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
        <Link to={ROUTE_PATHS.ADMIN_FINANCE_SUBSCRIPTIONS} className="small">
          ← Subscriptions
        </Link>
      </div>

      <h5 className="mb-3">Subscription {String(sub.id ?? '')}</h5>

      <Row className="g-3">
        <Col md={6}>
          <Card className="border shadow-none">
            <Card.Body>
              <h6 className="text-muted text-uppercase small">Status</h6>
              <p className="mb-1">
                <Badge bg="secondary">{String(sub.status)}</Badge>
              </p>
              <p className="small text-muted mb-0">
                Current period:{' '}
                {typeof sub.current_period_start === 'number' && typeof sub.current_period_end === 'number'
                  ? `${new Date(sub.current_period_start * 1000).toLocaleString()} – ${new Date(
                      sub.current_period_end * 1000,
                    ).toLocaleString()}`
                  : '—'}
              </p>
              {paused ? (
                <p className="small text-warning mb-0 mt-2">Collection paused</p>
              ) : null}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border shadow-none">
            <Card.Body>
              <h6 className="text-muted text-uppercase small">Customer</h6>
              <p className="mb-1">{customer && typeof customer.email === 'string' ? customer.email : '—'}</p>
              <p className="small font-monospace mb-0">
                {customer && typeof customer.id === 'string' ? customer.id : '—'}
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border shadow-none mt-3">
        <Card.Body>
          <h6 className="text-muted text-uppercase small">Plan</h6>
          <p className="mb-0">{plan}</p>
          <p className="small text-muted mb-0">{interval}</p>
        </Card.Body>
      </Card>

      <div className="d-flex flex-wrap gap-2 mt-3">
        <ButtonGroup size="sm">
          <Button variant="outline-danger" onClick={() => run('cancel')} disabled={actionMut.isPending}>
            Cancel
          </Button>
          <Button
            variant="outline-warning"
            onClick={() => run('pause')}
            disabled={actionMut.isPending || paused}
          >
            Pause
          </Button>
          <Button
            variant="outline-success"
            onClick={() => run('resume')}
            disabled={actionMut.isPending || !paused}
          >
            Resume
          </Button>
        </ButtonGroup>
      </div>

      {customer && typeof customer.address === 'object' && customer.address !== null ? (
        <p className="small text-muted mt-3 mb-0">Address: {formatStripeAddress(customer.address)}</p>
      ) : null}
    </div>
  );
};

export default SubscriptionDetailPage;
