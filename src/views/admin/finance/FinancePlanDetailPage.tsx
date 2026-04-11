import { ROUTE_PATHS } from '@/config/routePaths'
import { useNotificationContext } from '@/context/useNotificationContext'
import {
  useAdminCreatePrice,
  useAdminPlanDetail,
  useAdminSetPlanActive,
  useAdminSetPriceActive,
  useAdminUpdatePlan,
} from '@/domains/admin/finance/hooks'
import { useEffect, useState } from 'react'
import { Button, Col, Form, Row, Spinner, Table } from 'react-bootstrap'
import { Link, useParams } from 'react-router'

function metaMap(metadata: { key: string; value: string }[]) {
  const o: Record<string, string> = {}
  for (const m of metadata) o[m.key] = m.value
  return o
}

const FinancePlanDetailPage = () => {
  const { productId } = useParams<{ productId: string }>()
  const { showNotification } = useNotificationContext()
  const { data, isLoading, error, refetch } = useAdminPlanDetail(productId)
  const updateMut = useAdminUpdatePlan()
  const setActiveMut = useAdminSetPlanActive()
  const setPriceActiveMut = useAdminSetPriceActive()
  const createPriceMut = useAdminCreatePrice()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sitesLimit, setSitesLimit] = useState('')
  const [libraryLimit, setLibraryLimit] = useState('')
  const [storageLimit, setStorageLimit] = useState('')
  const [hidden, setHidden] = useState(false)
  const [nonSellable, setNonSellable] = useState(false)

  const [newAmount, setNewAmount] = useState('')
  const [newInterval, setNewInterval] = useState<'month' | 'year'>('month')

  useEffect(() => {
    if (!data?.plan) return
    const p = data.plan
    setName(p.name)
    setDescription(p.description || '')
    const mm = metaMap(p.metadata)
    setSitesLimit(mm.sites_limit ?? '')
    setLibraryLimit(mm.library_limit ?? '')
    setStorageLimit(mm.storage_limit ?? '')
    setHidden(mm.hidden === 'true')
    setNonSellable(mm.non_sellable === 'true')
  }, [data?.plan])

  const notifyOk = (t: string, m: string) =>
    showNotification({ title: t, message: m, variant: 'success', delay: 3000 })
  const notifyErr = (t: string, m: string) =>
    showNotification({ title: t, message: m, variant: 'danger', delay: 5000 })

  if (!productId) return <p className="text-danger">Missing product id.</p>
  if (isLoading) return <Spinner animation="border" />
  if (error || !data?.plan) {
    return (
      <div>
        <p className="text-danger">{error?.message ?? 'Not found'}</p>
        <Link to={ROUTE_PATHS.ADMIN_FINANCE_PLANS}>Back to plans</Link>
      </div>
    )
  }

  const plan = data.plan
  const stats = data.stats
  const subscribers = data.subscribers ?? []

  const save = async () => {
    try {
      await updateMut.mutateAsync({
        productId,
        name,
        description,
        sites_limit: sitesLimit ? parseInt(sitesLimit, 10) : undefined,
        library_limit: libraryLimit ? parseInt(libraryLimit, 10) : undefined,
        storage_limit: storageLimit ? parseInt(storageLimit, 10) : undefined,
        hidden,
        non_sellable: nonSellable,
      })
      notifyOk('Saved', 'Plan updated.')
      void refetch()
    } catch (e) {
      notifyErr('Save', e instanceof Error ? e.message : 'Failed')
    }
  }

  const archiveProduct = async () => {
    if (!window.confirm('Archive (deactivate) this product in Stripe?')) return
    try {
      await setActiveMut.mutateAsync({ productId, active: false })
      notifyOk('Archived', 'Product set inactive.')
      void refetch()
    } catch (e) {
      notifyErr('Archive', e instanceof Error ? e.message : 'Failed')
    }
  }

  const restoreProduct = async () => {
    try {
      await setActiveMut.mutateAsync({ productId, active: true })
      notifyOk('Restored', 'Product active again.')
      void refetch()
    } catch (e) {
      notifyErr('Restore', e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div>
      <Link to={ROUTE_PATHS.ADMIN_FINANCE_PLANS}>&larr; Plans</Link>
      <h5 className="mt-2 mb-3">{plan.name}</h5>
      <p className="small">
        <a href={plan.stripeLink} target="_blank" rel="noreferrer">
          Open in Stripe
        </a>
      </p>

      <Row className="g-2 mb-4">
        <Col md={3}>
          <div className="border rounded p-2 small">
            <div className="text-muted">Active subs (est.)</div>
            <div className="fs-5 fw-semibold">{stats.totalSubscriptions}</div>
          </div>
        </Col>
        <Col md={3}>
          <div className="border rounded p-2 small">
            <div className="text-muted">Monthly / yearly</div>
            <div className="fw-semibold">
              {stats.subscriptionsMonthly} / {stats.subscriptionsYearly}
            </div>
          </div>
        </Col>
        <Col md={3}>
          <div className="border rounded p-2 small">
            <div className="text-muted">Est. earnings (heuristic)</div>
            <div className="fw-semibold">{stats.totalEarnings}</div>
          </div>
        </Col>
      </Row>

      <h6>Edit product</h6>
      <Row className="g-2 mb-3">
        <Col md={6}>
          <Form.Label className="small">Name</Form.Label>
          <Form.Control size="sm" value={name} onChange={(e) => setName(e.target.value)} />
        </Col>
        <Col md={6}>
          <Form.Label className="small">Description</Form.Label>
          <Form.Control
            size="sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Label className="small">Sites limit</Form.Label>
          <Form.Control size="sm" value={sitesLimit} onChange={(e) => setSitesLimit(e.target.value)} />
        </Col>
        <Col md={4}>
          <Form.Label className="small">Library limit</Form.Label>
          <Form.Control
            size="sm"
            value={libraryLimit}
            onChange={(e) => setLibraryLimit(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Label className="small">Storage limit</Form.Label>
          <Form.Control
            size="sm"
            value={storageLimit}
            onChange={(e) => setStorageLimit(e.target.value)}
          />
        </Col>
        <Col xs={12} className="d-flex gap-3">
          <Form.Check
            type="switch"
            id="plan-hidden"
            label="Hidden"
            checked={hidden}
            onChange={(e) => setHidden(e.target.checked)}
          />
          <Form.Check
            type="switch"
            id="plan-nonsell"
            label="Non-sellable"
            checked={nonSellable}
            onChange={(e) => setNonSellable(e.target.checked)}
          />
        </Col>
        <Col xs={12} className="d-flex flex-wrap gap-2 mt-2">
          <Button size="sm" onClick={() => void save()} disabled={updateMut.isPending}>
            Save changes
          </Button>
          {plan.status === 'active' ? (
            <Button size="sm" variant="outline-warning" onClick={() => void archiveProduct()}>
              Archive product
            </Button>
          ) : (
            <Button size="sm" variant="outline-success" onClick={() => void restoreProduct()}>
              Activate product
            </Button>
          )}
        </Col>
      </Row>

      <h6 className="mt-4">Prices</h6>
      <p className="small text-muted">
        Amounts are fixed on a price; add a new price to change pricing. You can deactivate old prices.
      </p>
      <Row className="g-2 mb-3 align-items-end">
        <Col xs={4} md={2}>
          <Form.Label className="small">Amount</Form.Label>
          <Form.Control
            size="sm"
            type="number"
            step="0.01"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
          />
        </Col>
        <Col xs={4} md={2}>
          <Form.Label className="small">Interval</Form.Label>
          <Form.Select
            size="sm"
            value={newInterval}
            onChange={(e) => setNewInterval(e.target.value as 'month' | 'year')}
          >
            <option value="month">Month</option>
            <option value="year">Year</option>
          </Form.Select>
        </Col>
        <Col xs="auto">
          <Button
            size="sm"
            disabled={!newAmount || createPriceMut.isPending}
            onClick={async () => {
              try {
                await createPriceMut.mutateAsync({
                  productId,
                  amount: parseFloat(newAmount),
                  interval: newInterval,
                  currency: plan.currency,
                })
                notifyOk('Price', 'New price created.')
                setNewAmount('')
                void refetch()
              } catch (e) {
                notifyErr('Price', e instanceof Error ? e.message : 'Failed')
              }
            }}
          >
            Add price
          </Button>
        </Col>
      </Row>

      <div className="table-responsive mb-4">
        <Table size="sm">
          <thead>
            <tr>
              <th>Price ID</th>
              <th>Amount</th>
              <th>Interval</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {/* plan from get doesn't include allPrices list — use monthly/yearly ids from detail */}
            {(() => {
              const priceRows: Array<{ id: string; label: string; amount: number }> = []
              if (plan.monthlyPriceId) {
                priceRows.push({
                  id: plan.monthlyPriceId,
                  label: 'Monthly',
                  amount: plan.monthlyPrice,
                })
              }
              if (plan.yearlyPriceId) {
                priceRows.push({
                  id: plan.yearlyPriceId,
                  label: 'Yearly',
                  amount: plan.yearlyPrice,
                })
              }
              return priceRows.map((row) => (
                <tr key={row.id}>
                  <td className="font-monospace small">{row.id}</td>
                  <td>{row.amount}</td>
                  <td>{row.label}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      disabled={setPriceActiveMut.isPending}
                      onClick={async () => {
                        if (!window.confirm('Deactivate this price in Stripe?')) return
                        try {
                          await setPriceActiveMut.mutateAsync({ priceId: row.id, active: false })
                          notifyOk('Price', 'Price deactivated.')
                          void refetch()
                        } catch (e) {
                          notifyErr('Price', e instanceof Error ? e.message : 'Failed')
                        }
                      }}
                    >
                      Deactivate
                    </Button>
                  </td>
                </tr>
              ))
            })()}
          </tbody>
        </Table>
      </div>

      <h6>Subscribers on this plan</h6>
      <div className="table-responsive">
        <Table size="sm" striped>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Subscription</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => (
              <tr key={s.subscriptionId}>
                <td className="small">{s.name || s.userId || '—'}</td>
                <td className="small">{s.email}</td>
                <td className="small">
                  <Link to={ROUTE_PATHS.adminFinanceSubscriptionPath(s.subscriptionId)}>
                    {s.subscriptionId}
                  </Link>
                </td>
                <td className="small text-capitalize">{s.status}</td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted text-center py-3">
                  No subscribers in this summary.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  )
}

export default FinancePlanDetailPage
