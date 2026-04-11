import { ROUTE_PATHS } from '@/config/routePaths';
import { formatStripeAddress } from '@/lib/adminStripeFormat';
import { useAdminInvoiceDetail } from '@/hooks/useAdminBilling';
import { Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router';

function formatMoney(cents: unknown, currency: unknown) {
  if (typeof cents !== 'number') return '—';
  const cur = typeof currency === 'string' ? currency : 'usd';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: cur.toUpperCase(),
  }).format(cents / 100);
}

const InvoiceDetailPage = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { data, isLoading, error } = useAdminInvoiceDetail(invoiceId);

  if (!invoiceId) return <p className="text-danger">Missing invoice id.</p>;
  if (isLoading) return <Spinner animation="border" />;
  if (error || !data?.invoice) {
    return (
      <div>
        <p className="text-danger">{error?.message ?? 'Not found'}</p>
        <Link to={ROUTE_PATHS.ADMIN_FINANCE_BILLING}>Back to billing</Link>
      </div>
    );
  }

  const inv = data.invoice as Record<string, unknown>;
  const customer = inv.customer as Record<string, unknown> | string | undefined;
  const c =
    typeof customer === 'object' && customer
      ? (customer as Record<string, unknown>)
      : null;

  const lines = (inv.lines as { data?: Record<string, unknown>[] } | undefined)?.data ?? [];

  return (
    <div>
      <div className="mb-3">
        <Link to={ROUTE_PATHS.ADMIN_FINANCE_BILLING} className="small">
          ← Billing overview
        </Link>
      </div>
      <Row className="g-3">
        <Col lg={7}>
          <Card className="border shadow-none">
            <Card.Body>
              <h5 className="mb-3">Invoice {typeof inv.number === 'string' ? inv.number : String(inv.id)}</h5>
              <Table size="sm" borderless className="mb-0">
                <tbody className="small">
                  <tr>
                    <th className="text-muted">Status</th>
                    <td>{String(inv.status)}</td>
                  </tr>
                  <tr>
                    <th className="text-muted">Amount due</th>
                    <td>{formatMoney(inv.amount_due, inv.currency)}</td>
                  </tr>
                  <tr>
                    <th className="text-muted">Amount paid</th>
                    <td>{formatMoney(inv.amount_paid, inv.currency)}</td>
                  </tr>
                  <tr>
                    <th className="text-muted">Created</th>
                    <td>
                      {typeof inv.created === 'number' ? new Date(inv.created * 1000).toLocaleString() : '—'}
                    </td>
                  </tr>
                  <tr>
                    <th className="text-muted">PDF</th>
                    <td>
                      {typeof inv.invoice_pdf === 'string' ? (
                        <a href={inv.invoice_pdf} target="_blank" rel="noreferrer">
                          Open PDF
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="border shadow-none">
            <Card.Body>
              <h6 className="mb-3">Customer</h6>
              {c ? (
                <Table size="sm" borderless className="mb-0">
                  <tbody className="small">
                    <tr>
                      <th className="text-muted">Email</th>
                      <td>{typeof c.email === 'string' ? c.email : '—'}</td>
                    </tr>
                    <tr>
                      <th className="text-muted">Name</th>
                      <td>{typeof c.name === 'string' ? c.name : '—'}</td>
                    </tr>
                    <tr>
                      <th className="text-muted">Address</th>
                      <td>{formatStripeAddress(c.address)}</td>
                    </tr>
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted small mb-0">—</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border shadow-none mt-3">
        <Card.Body>
          <h6 className="mb-3">Line items</h6>
          <Table responsive size="sm" className="mb-0">
            <thead className="small text-muted">
              <tr>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const l = line as Record<string, unknown>;
                return (
                  <tr key={String(l.id)}>
                    <td>{typeof l.description === 'string' ? l.description : '—'}</td>
                    <td>{formatMoney(l.amount, inv.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default InvoiceDetailPage;
