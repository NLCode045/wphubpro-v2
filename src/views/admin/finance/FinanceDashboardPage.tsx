import { useFinanceSummary } from '@/domains/admin/finance/hooks'
import { Col, Row, Spinner } from 'react-bootstrap'

function formatMoney(cents: number, currency = 'eur') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(
    cents / 100,
  )
}

const FinanceDashboardPage = () => {
  const { data, isLoading, error } = useFinanceSummary()

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    )
  }

  if (error || !data) {
    return <p className="text-danger mb-0">{error?.message ?? 'Could not load finance summary.'}</p>
  }

  const counts = data.subscriptionCountsByStatus

  return (
    <div>
      {data.note && <p className="text-muted small">{data.note}</p>}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="border rounded p-3 h-100 bg-light-subtle">
            <div className="text-muted text-uppercase small">Approx. MRR</div>
            <div className="fs-3 fw-semibold">{formatMoney(data.approximateMrrCents)}</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="border rounded p-3 h-100 bg-light-subtle">
            <div className="text-muted text-uppercase small">Failed / uncertain PIs (7d)</div>
            <div className="fs-3 fw-semibold">{data.recentFailedPaymentIntents7d}</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="border rounded p-3 h-100 bg-light-subtle">
            <div className="text-muted text-uppercase small">Sample paid invoice total</div>
            <div className="fs-3 fw-semibold">
              {formatMoney(data.revenueFromLast30PaidInvoicesCents)}
            </div>
            <div className="small text-muted">Last 30 paid invoices (sample)</div>
          </div>
        </Col>
      </Row>

      <h5 className="mb-3">Subscriptions by status</h5>
      <Row className="g-2">
        {Object.entries(counts).map(([status, n]) => (
          <Col key={status} xs={6} md={4} lg={3}>
            <div className="border rounded p-2 d-flex justify-content-between align-items-center">
              <span className="text-capitalize small">{status.replace(/_/g, ' ')}</span>
              <span className="fw-semibold">{n}</span>
            </div>
          </Col>
        ))}
      </Row>

      {data.lastPaidInvoicesSample?.length > 0 && (
        <>
          <h5 className="mt-4 mb-3">Recent paid invoices (sample)</h5>
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Customer</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.lastPaidInvoicesSample.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-monospace small">{inv.id}</td>
                    <td>{formatMoney(inv.amount_paid, inv.currency)}</td>
                    <td className="small text-truncate" style={{ maxWidth: 160 }}>
                      {inv.customer ?? '—'}
                    </td>
                    <td className="small">{new Date(inv.created * 1000).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default FinanceDashboardPage
