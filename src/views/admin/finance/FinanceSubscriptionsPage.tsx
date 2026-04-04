import { ROUTE_PATHS } from '@/config/routePaths'
import { useAdminSubscriptionList, useAdminStripePlansList } from '@/domains/admin/finance/hooks'
import type { AdminSubscriptionRow } from '@/domains/admin/finance/types'
import { useDebounceValue } from 'usehooks-ts'
import { useMemo, useState } from 'react'
import { Button, Col, Form, Row, Spinner, Table } from 'react-bootstrap'
import { useNavigate } from 'react-router'

type SortField =
  | 'startDate'
  | 'endDate'
  | 'nextBillingDate'
  | 'billingCycle'
  | 'plan'
  | 'status'
  | 'username'

function SortTh({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string
  field: SortField
  current: SortField
  dir: 'asc' | 'desc'
  onSort: (f: SortField) => void
}) {
  const active = current === field
  return (
    <th role="button" className="user-select-none" onClick={() => onSort(field)}>
      {label}
      {active ? (dir === 'asc' ? ' \u2191' : ' \u2193') : ''}
    </th>
  )
}

const FinanceSubscriptionsPage = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebounceValue(search, 350)
  const [sortField, setSortField] = useState<SortField>('startDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const { data: plansData } = useAdminStripePlansList()
  const planOptions = useMemo(() => {
    const list = plansData ?? []
    const opts: { id: string; label: string }[] = []
    for (const p of list) {
      opts.push({ id: p.id, label: p.name })
      for (const ap of p.allPrices ?? []) {
        opts.push({ id: ap.id, label: `${p.name} (${ap.interval})` })
      }
    }
    return opts
  }, [plansData])

  const listParams = useMemo(() => {
    const isPrice = planFilter.startsWith('price_')
    return {
      status: status === 'all' ? undefined : status,
      productId: planFilter && !isPrice ? planFilter : undefined,
      priceId: isPrice ? planFilter : undefined,
      search: debouncedSearch.trim() || undefined,
      sortField,
      sortDir,
      maxPages: 5,
    }
  }, [status, planFilter, debouncedSearch, sortField, sortDir])

  const { data, isLoading, error, refetch, isFetching } = useAdminSubscriptionList(listParams)

  const onSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(field === 'startDate' || field === 'nextBillingDate' ? 'desc' : 'asc')
    }
  }

  const rows: AdminSubscriptionRow[] = data?.subscriptions ?? []

  const openRow = (r: AdminSubscriptionRow) => {
    navigate(ROUTE_PATHS.adminFinanceSubscriptionPath(r.subscriptionId))
  }

  return (
    <div>
      <Row className="g-2 mb-3 align-items-end">
        <Col xs={12} md={3}>
          <Form.Label className="small text-muted mb-1">Status</Form.Label>
          <Form.Select value={status} onChange={(e) => setStatus(e.target.value)} size="sm">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past due</option>
            <option value="canceled">Canceled</option>
            <option value="unpaid">Unpaid</option>
            <option value="paused">Paused</option>
            <option value="incomplete">Incomplete</option>
          </Form.Select>
        </Col>
        <Col xs={12} md={4}>
          <Form.Label className="small text-muted mb-1">Plan / price</Form.Label>
          <Form.Select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} size="sm">
            <option value="">Any</option>
            {planOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col xs={12} md={3}>
          <Form.Label className="small text-muted mb-1">Search</Form.Label>
          <Form.Control
            size="sm"
            placeholder="Subscription ID, username, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col xs="auto">
          <Button variant="outline-secondary" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            Refresh
          </Button>
        </Col>
      </Row>

      {error && <p className="text-danger small">{error.message}</p>}
      <p className="text-muted small">
        Loaded up to {data?.fetchedPages ?? 0} page(s) from Stripe (100 per page). Refine filters if needed.
      </p>

      {isLoading ? (
        <Spinner animation="border" />
      ) : (
        <div className="table-responsive">
          <Table hover size="sm" className="align-middle">
            <thead>
              <tr>
                <SortTh label="Start" field="startDate" current={sortField} dir={sortDir} onSort={onSort} />
                <SortTh label="End" field="endDate" current={sortField} dir={sortDir} onSort={onSort} />
                <SortTh
                  label="Next billing"
                  field="nextBillingDate"
                  current={sortField}
                  dir={sortDir}
                  onSort={onSort}
                />
                <SortTh label="Cycle" field="billingCycle" current={sortField} dir={sortDir} onSort={onSort} />
                <SortTh label="Plan" field="plan" current={sortField} dir={sortDir} onSort={onSort} />
                <SortTh label="Status" field="status" current={sortField} dir={sortDir} onSort={onSort} />
                <SortTh label="Username" field="username" current={sortField} dir={sortDir} onSort={onSort} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.subscriptionId}
                  role="button"
                  onClick={() => openRow(r)}
                  className={r.hubArchived ? 'table-secondary' : undefined}
                >
                  <td className="small">{r.startDate ? new Date(r.startDate * 1000).toLocaleDateString() : '—'}</td>
                  <td className="small">
                    {r.endDate ? new Date(r.endDate * 1000).toLocaleDateString() : '—'}
                  </td>
                  <td className="small">
                    {r.nextBillingDate ? new Date(r.nextBillingDate * 1000).toLocaleDateString() : '—'}
                  </td>
                  <td className="small text-capitalize">{r.billingCycle ?? '—'}</td>
                  <td className="small">{r.planName ?? r.priceId ?? '—'}</td>
                  <td className="small text-capitalize">{r.status}</td>
                  <td className="small">{r.username ?? r.userId ?? '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No subscriptions match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default FinanceSubscriptionsPage
