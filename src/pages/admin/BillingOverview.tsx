import { ROUTE_PATHS } from '@/config/routePaths';
import { useAdminPaymentsList, useAdminRecentInvoicesList } from '@/domains/admin/finance/hooks';
import { Badge, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router';

function formatMoney(cents: unknown, currency: unknown) {
  if (typeof cents !== 'number') return '—';
  const cur = typeof currency === 'string' ? currency : 'usd';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: cur.toUpperCase(),
  }).format(cents / 100);
}

const BillingOverviewPage = () => {
  const recentQ = useAdminRecentInvoicesList({ limit: 25 });
  const failedQ = useAdminPaymentsList({
    limit: 30,
    status: 'requires_payment_method',
  });

  const isLoading = recentQ.isLoading || failedQ.isLoading;
  const error = recentQ.error ?? failedQ.error;

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error) {
    return <p className="text-danger mb-0">{error.message}</p>;
  }

  const recent = recentQ.data?.invoices ?? [];
  const failed = failedQ.data?.orders ?? [];

  return (
    <Row className="g-3">
      <Col lg={7}>
        <Card className="border shadow-none h-100">
          <Card.Body>
            <h5 className="mb-3">Recent invoices</h5>
            {!recent.length ? (
              <p className="text-muted small mb-0">No invoices.</p>
            ) : (
              <Table responsive size="sm" className="mb-0 align-middle">
                <thead className="small text-muted">
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recent.map((raw) => {
                    const inv = raw as Record<string, unknown>;
                    const id = String(inv.id ?? '');
                    const created = typeof inv.created === 'number' ? inv.created : 0;
                    const cust = inv.customer as Record<string, unknown> | string | undefined;
                    const email =
                      typeof cust === 'object' && cust && typeof cust.email === 'string' ? cust.email : '—';
                    return (
                      <tr key={id}>
                        <td className="small">{new Date(created * 1000).toLocaleString()}</td>
                        <td className="small">{email}</td>
                        <td>
                          <Badge bg="secondary">{String(inv.status ?? '')}</Badge>
                        </td>
                        <td className="small">{formatMoney(inv.amount_due, inv.currency)}</td>
                        <td className="text-end">
                          <Link to={ROUTE_PATHS.adminFinanceInvoicePath(id)} className="small">
                            Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Col>
      <Col lg={5}>
        <Card className="border shadow-none h-100">
          <Card.Body>
            <h5 className="mb-3">Failed / incomplete payments</h5>
            <p className="text-muted small mb-2">
              PaymentIntents needing a new payment method (e.g. card declined).
            </p>
            {!failed.length ? (
              <p className="text-muted small mb-0">None in the recent window.</p>
            ) : (
              <Table responsive size="sm" className="mb-0">
                <thead className="small text-muted">
                  <tr>
                    <th>Id</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {failed.map((pi) => (
                    <tr key={pi.id}>
                      <td>
                        <code className="small">{pi.id}</code>
                      </td>
                      <td>{pi.status}</td>
                      <td>{formatMoney(pi.amount, pi.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default BillingOverviewPage;
