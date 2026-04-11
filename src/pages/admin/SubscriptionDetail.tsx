import { ROUTE_PATHS } from '@/config/routePaths';
import {
  billingIntervalFromSubscriptionJson,
  formatStripeAddress,
  planLabelFromSubscriptionJson,
} from '@/lib/adminStripeFormat';
import { useAdminSubscriptionAction, useAdminSubscriptionDetail } from '@/hooks/useAdminSubscriptions';
import { Badge, Button, ButtonGroup, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router';

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
        <ButtonGroup size="sm">
          {paused ? (
            <Button variant="success" disabled={actionMut.isPending} onClick={() => run('resume')}>
              Resume
            </Button>
          ) : (
            <Button variant="warning" disabled={actionMut.isPending} onClick={() => run('pause')}>
              Pause collection
            </Button>
          )}
          <Button variant="danger" disabled={actionMut.isPending} onClick={() => run('cancel')}>
            Cancel subscription
          </Button>
        </ButtonGroup>
      </div>

      <Row className="g-3">
        <Col lg={7}>
          <Card className="border shadow-none">
            <Card.Body>
              <h5 className="mb-3">Subscription</h5>
              <Table size="sm" borderless className="mb-0">
                <tbody className="small">
                  <tr>
                    <th className="text-muted" style={{ width: '40%' }}>
                      ID
                    </th>
                    <td>
                      <code>{String(sub.id)}</code>
                    </td>
                  </tr>
                  <tr>
                    <th className="text-muted">Status</th>
                    <td>
                      <Badge bg="secondary">{String(sub.status)}</Badge>
                      {paused ? (
                        <Badge bg="warning" className="ms-1">
                          Paused
                        </Badge>
                      ) : null}
                    </td>
                  </tr>
                  <tr>
                    <th className="text-muted">Plan</th>
                    <td>{plan}</td>
                  </tr>
                  <tr>
                    <th className="text-muted">Billing cycle</th>
                    <td>{interval}</td>
                  </tr>
                  <tr>
                    <th className="text-muted">Current period</th>
                    <td>
                      {typeof sub.current_period_start === 'number'
                        ? new Date(sub.current_period_start * 1000).toLocaleString()
                        : '—'}{' '}
                      →{' '}
                      {typeof sub.current_period_end === 'number'
                        ? new Date(sub.current_period_end * 1000).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                  <tr>
                    <th className="text-muted">Cancel at period end</th>
                    <td>{sub.cancel_at_period_end ? 'Yes' : 'No'}</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="border shadow-none">
            <Card.Body>
              <h5 className="mb-3">Customer</h5>
              {customer ? (
                <Table size="sm" borderless className="mb-0">
                  <tbody className="small">
                    <tr>
                      <th className="text-muted">Email</th>
                      <td>{typeof customer.email === 'string' ? customer.email : '—'}</td>
                    </tr>
                    <tr>
                      <th className="text-muted">Name</th>
                      <td>{typeof customer.name === 'string' ? customer.name : '—'}</td>
                    </tr>
                    <tr>
                      <th className="text-muted">Address</th>
                      <td>{formatStripeAddress(customer.address)}</td>
                    </tr>
                    <tr>
                      <th className="text-muted">Customer id</th>
                      <td>
                        <code>{String(customer.id)}</code>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted small mb-0">No customer object on subscription.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SubscriptionDetailPage;
