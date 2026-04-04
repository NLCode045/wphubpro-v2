import { ROUTE_PATHS } from '@/config/routePaths'
import { useAdminPaymentDetail } from '@/domains/admin/finance/hooks'
import { Spinner } from 'react-bootstrap'
import { Link, useParams } from 'react-router'

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

const FinancePaymentDetailPage = () => {
  const { paymentIntentId } = useParams<{ paymentIntentId: string }>()
  const { data, isLoading, error } = useAdminPaymentDetail(paymentIntentId)

  if (!paymentIntentId) return <p className="text-danger">Missing payment id.</p>
  if (isLoading) return <Spinner animation="border" />
  if (error || !data?.paymentIntent) {
    return (
      <div>
        <p className="text-danger">{error?.message ?? 'Not found'}</p>
        <Link to={ROUTE_PATHS.ADMIN_FINANCE_PAYMENTS}>Back to payments</Link>
      </div>
    )
  }

  const pi = data.paymentIntent
  const ch = data.charge

  return (
    <div>
      <Link to={ROUTE_PATHS.ADMIN_FINANCE_PAYMENTS}>&larr; Payments</Link>
      <h5 className="mt-2 mb-3">Payment {pi.id}</h5>

      <dl className="row small">
        <dt className="col-sm-3">Status</dt>
        <dd className="col-sm-9">{pi.status}</dd>
        <dt className="col-sm-3">Amount</dt>
        <dd className="col-sm-9">{formatMoney(pi.amount, pi.currency)}</dd>
        <dt className="col-sm-3">Received</dt>
        <dd className="col-sm-9">{formatMoney(pi.amount_received, pi.currency)}</dd>
        <dt className="col-sm-3">Created</dt>
        <dd className="col-sm-9">{new Date(pi.created * 1000).toLocaleString()}</dd>
        <dt className="col-sm-3">Description</dt>
        <dd className="col-sm-9">{pi.description ?? '—'}</dd>
        <dt className="col-sm-3">Receipt email</dt>
        <dd className="col-sm-9">{pi.receipt_email ?? '—'}</dd>
        <dt className="col-sm-3">Customer</dt>
        <dd className="col-sm-9">
          {pi.customer ? (
            <>
              {pi.customer.name ?? '—'} ({pi.customer.email ?? 'no email'})
              <div className="font-monospace">{pi.customer.id}</div>
            </>
          ) : (
            '—'
          )}
        </dd>
      </dl>

      {pi.last_payment_error && (
        <div className="alert alert-warning small">
          <strong>Last payment error</strong>
          <pre className="mb-0 mt-2 small overflow-auto">
            {JSON.stringify(pi.last_payment_error, null, 2)}
          </pre>
        </div>
      )}

      {ch && (
        <>
          <h6 className="mt-4">Charge</h6>
          <dl className="row small">
            <dt className="col-sm-3">Charge id</dt>
            <dd className="col-sm-9 font-monospace">{ch.id}</dd>
            <dt className="col-sm-3">Paid</dt>
            <dd className="col-sm-9">{ch.paid ? 'Yes' : 'No'}</dd>
            <dt className="col-sm-3">Failure</dt>
            <dd className="col-sm-9">{ch.failure_message ?? ch.failure_code ?? '—'}</dd>
            <dt className="col-sm-3">Receipt</dt>
            <dd className="col-sm-9">
              {ch.receipt_url ? (
                <a href={ch.receipt_url} target="_blank" rel="noreferrer">
                  Open receipt
                </a>
              ) : (
                '—'
              )}
            </dd>
          </dl>
        </>
      )}
    </div>
  )
}

export default FinancePaymentDetailPage
