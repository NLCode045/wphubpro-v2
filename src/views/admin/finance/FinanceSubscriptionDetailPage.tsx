import { ROUTE_PATHS } from '@/config/routePaths'
import { useNotificationContext } from '@/context/useNotificationContext'
import {
  useAdminCancelSubscription,
  useAdminArchiveSubscription,
  useAdminPauseSubscription,
  useAdminResumeSubscription,
  useAdminStripePlansList,
  useAdminSubscriptionDetails,
  useAdminUpdateSubscriptionPrice,
} from '@/domains/admin/finance/hooks'
import { useMemo, useState } from 'react'
import { Button, Col, Form, Row, Spinner, Table } from 'react-bootstrap'
import { Link, useNavigate, useParams } from 'react-router'

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

const FinanceSubscriptionDetailPage = () => {
  const { subscriptionId } = useParams<{ subscriptionId: string }>()
  const navigate = useNavigate()
  const { showNotification } = useNotificationContext()
  const { data, isLoading, error, refetch, isSuccess: detailsOk } = useAdminSubscriptionDetails(subscriptionId)
  const { data: plansList } = useAdminStripePlansList({ enabled: detailsOk })

  const [newPriceId, setNewPriceId] = useState('')

  const cancelMut = useAdminCancelSubscription()
  const pauseMut = useAdminPauseSubscription()
  const resumeMut = useAdminResumeSubscription()
  const archiveMut = useAdminArchiveSubscription()
  const updatePriceMut = useAdminUpdateSubscriptionPrice()

  const priceOptions = useMemo(() => {
    const pid = data?.plan?.product_id
    const plans = plansList?.plans
    if (!pid || !plans) return []
    const p = plans.find((x) => x.id === pid)
    return p?.allPrices ?? []
  }, [data?.plan?.product_id, plansList?.plans])

  const notifyOk = (title: string, message: string) =>
    showNotification({ title, message, variant: 'success', delay: 3000 })
  const notifyErr = (title: string, message: string) =>
    showNotification({ title, message, variant: 'danger', delay: 5000 })

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn()
      notifyOk(label, 'Done.')
      void refetch()
    } catch (e) {
      notifyErr(label, e instanceof Error ? e.message : 'Failed')
    }
  }

  if (!subscriptionId) {
    return <p className="text-danger">Missing subscription id.</p>
  }

  if (isLoading) {
    return <Spinner animation="border" />
  }

  if (error || !data) {
    return (
      <div>
        <p className="text-danger">{error?.message ?? 'Not found'}</p>
        <Link to={ROUTE_PATHS.ADMIN_FINANCE_SUBSCRIPTIONS}>Back to list</Link>
      </div>
    )
  }

  const sub = data.subscription
  const paused = Boolean(sub.pause_collection)

  return (
    <div>
      <div className="mb-3">
        <Button variant="link" className="ps-0" onClick={() => navigate(-1)}>
          &larr; Back
        </Button>
      </div>

      <h5 className="mb-3">Subscription {sub.id}</h5>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <div className="border rounded p-3">
            <h6 className="text-muted text-uppercase small">Status</h6>
            <p className="mb-1 text-capitalize">{sub.status}</p>
            <p className="small text-muted mb-0">
              Period end: {new Date(sub.current_period_end * 1000).toLocaleString()}
            </p>
            {sub.cancel_at_period_end && (
              <p className="small text-warning mb-0">Cancels at period end</p>
            )}
            {paused && <p className="small text-warning mb-0">Collection paused</p>}
          </div>
        </Col>
        <Col md={6}>
          <div className="border rounded p-3">
            <h6 className="text-muted text-uppercase small">Customer</h6>
            <p className="mb-0">{data.customer.name || '—'}</p>
            <p className="small text-muted mb-0">{data.customer.email}</p>
            <p className="small font-monospace mb-0">{data.customer.id}</p>
          </div>
        </Col>
      </Row>

      <div className="border rounded p-3 mb-4">
        <h6 className="text-muted text-uppercase small">Plan</h6>
        <p className="mb-1">{data.plan.product_name}</p>
        <p className="small mb-0">
          {data.plan.price_id} · {formatMoney(data.plan.unit_amount ?? 0, data.plan.currency || 'eur')} /{' '}
          {data.plan.interval}
        </p>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-4">
        <Button
          variant="outline-danger"
          size="sm"
          disabled={cancelMut.isPending}
          onClick={() => {
            if (!window.confirm('Cancel at end of current billing period?')) return
            void run('Cancel', () =>
              cancelMut.mutateAsync({ subscriptionId: sub.id, immediate: false }),
            )
          }}
        >
          Cancel (period end)
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={cancelMut.isPending}
          onClick={() => {
            if (!window.confirm('Cancel this subscription immediately?')) return
            void run('Cancel now', () =>
              cancelMut.mutateAsync({ subscriptionId: sub.id, immediate: true }),
            )
          }}
        >
          Cancel now
        </Button>
        <Button
          variant="outline-warning"
          size="sm"
          disabled={pauseMut.isPending || paused}
          onClick={() => {
            if (!window.confirm('Pause collection for this subscription?')) return
            void run('Pause', () => pauseMut.mutateAsync({ subscriptionId: sub.id }))
          }}
        >
          Pause
        </Button>
        <Button
          variant="outline-success"
          size="sm"
          disabled={resumeMut.isPending || !paused}
          onClick={() => void run('Resume', () => resumeMut.mutateAsync({ subscriptionId: sub.id }))}
        >
          Resume
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          disabled={archiveMut.isPending}
          onClick={() => {
            if (!window.confirm('Mark subscription as archived (metadata) and cancel at period end?')) return
            void run('Archive', () =>
              archiveMut.mutateAsync({ subscriptionId: sub.id, cancelAtPeriodEnd: true }),
            )
          }}
        >
          Archive (metadata + cancel at period end)
        </Button>
      </div>

      <div className="border rounded p-3 mb-4">
        <h6 className="mb-3">Upgrade / downgrade (same product)</h6>
        <Row className="g-2 align-items-end">
          <Col xs={12} md={8}>
            <Form.Label className="small">New price</Form.Label>
            <Form.Select
              size="sm"
              value={newPriceId}
              onChange={(e) => setNewPriceId(e.target.value)}
            >
              <option value="">Select price…</option>
              {priceOptions.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.interval} — {pr.amount} {data.plan.currency?.toUpperCase()}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col xs="auto">
            <Button
              size="sm"
              disabled={!newPriceId || updatePriceMut.isPending}
              onClick={() => {
                if (!window.confirm('Change subscription to selected price with proration invoice?')) return
                void run('Update plan', () =>
                  updatePriceMut.mutateAsync({
                    subscriptionId: sub.id,
                    newPriceId,
                    proration_behavior: 'always_invoice',
                    sameProductOnly: true,
                  }),
                )
              }}
            >
              Apply price change
            </Button>
          </Col>
        </Row>
      </div>

      <h6 className="mb-2">Invoices</h6>
      <div className="table-responsive">
        <Table size="sm" striped>
          <thead>
            <tr>
              <th>#</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="font-monospace small">{inv.number ?? inv.id}</td>
                <td className="small">{inv.status}</td>
                <td className="small">{formatMoney(inv.amount_due, inv.currency)}</td>
                <td className="small">{new Date(inv.created * 1000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  )
}

export default FinanceSubscriptionDetailPage
