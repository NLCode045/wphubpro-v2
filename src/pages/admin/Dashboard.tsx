import { useAdminStats } from '@/hooks/useAdminStats';
import { Card, Col, Row, Spinner } from 'react-bootstrap';

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Admin finance dashboard — KPIs from `GET /api/stripe/admin/stats`.
 */
const AdminStripeDashboardPage = () => {
  const { data, isLoading, error } = useAdminStats();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-danger mb-0">
        {error instanceof Error ? error.message : 'Could not load admin stats. Is `/api/stripe/admin/stats` deployed?'}
      </p>
    );
  }

  return (
    <div>
      <p className="text-muted small mb-4">
        Live aggregates from Stripe (MRR is normalized to monthly; subscription totals are capped server-side).
      </p>
      <Row className="g-3">
        <Col md={6} xl={3}>
          <Card className="border shadow-none h-100">
            <Card.Body>
              <p className="text-muted text-uppercase small mb-1">MRR (approx.)</p>
              <h3 className="mb-0 fw-semibold">{formatMoney(data.mrrCents, data.currency)}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} xl={3}>
          <Card className="border shadow-none h-100">
            <Card.Body>
              <p className="text-muted text-uppercase small mb-1">Active subscriptions</p>
              <h3 className="mb-0 fw-semibold">{data.activeSubscriptionCount}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} xl={3}>
          <Card className="border shadow-none h-100">
            <Card.Body>
              <p className="text-muted text-uppercase small mb-1">Live payments (24h)</p>
              <h3 className="mb-0 fw-semibold">{data.livePayments24h}</h3>
              <p className="text-muted small mb-0 mt-1">Succeeded PaymentIntents</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} xl={3}>
          <Card className="border shadow-none h-100">
            <Card.Body>
              <p className="text-muted text-uppercase small mb-1">Total subs (cap)</p>
              <h3 className="mb-0 fw-semibold">{data.totalSubscriptions ?? '—'}</h3>
              <p className="text-muted small mb-0 mt-1">All statuses (max 1000)</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminStripeDashboardPage;
