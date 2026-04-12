import { useAdminStats } from '@/hooks/useAdminStats';
import { Card, Col, Row, Spinner } from 'react-bootstrap';

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Admin finance dashboard — KPIs from `GET /api/stripe/admin/stats` (server-side Stripe SDK).
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
        {error instanceof Error
          ? error.message
          : 'Could not load admin stats. Ensure `/api/stripe/admin/stats` is implemented and `STRIPE_SECRET_KEY` is set on the API host.'}
      </p>
    );
  }

  const failed7d = data.recentFailedPaymentIntents7d;
  const rev30 = data.revenueFromLast30PaidInvoicesCents;

  return (
    <div>
      <p className="text-muted small mb-4">
        Live Stripe data via <code className="small">GET /api/stripe/admin/stats</code>. MRR is normalized to monthly;
        failed-PI and 30-day invoice revenue are computed on the API host.
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
              <p className="text-muted text-uppercase small mb-1">Failed / incomplete PI (7d)</p>
              <h3 className="mb-0 fw-semibold">{failed7d ?? '—'}</h3>
              <p className="text-muted small mb-0 mt-1">From Stripe payment_intents sample</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} xl={3}>
          <Card className="border shadow-none h-100">
            <Card.Body>
              <p className="text-muted text-uppercase small mb-1">Total subscriptions</p>
              <h3 className="mb-0 fw-semibold">{data.totalSubscriptions ?? '—'}</h3>
              <p className="text-muted small mb-0 mt-1">Sum of counts by status</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      {typeof rev30 === 'number' ? (
        <p className="text-muted small mt-3 mb-0">
          Revenue (last 30 paid invoices, sample):{' '}
          <strong>{formatMoney(rev30, data.currency)}</strong>
        </p>
      ) : null}
    </div>
  );
};

export default AdminStripeDashboardPage;
