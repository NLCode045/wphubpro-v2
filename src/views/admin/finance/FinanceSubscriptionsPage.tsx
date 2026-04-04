import DataTable from '@/components/table/DataTable'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useAdminSubscriptionList, useAdminStripePlansList } from '@/domains/admin/finance/hooks'
import type { AdminSubscriptionRow } from '@/domains/admin/finance/types'
import {
  createColumnHelper,
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { useDebounceValue } from 'usehooks-ts'
import { useMemo, useState } from 'react'
import { Button, Col, Form, Row, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router'

type SortField =
  | 'startDate'
  | 'endDate'
  | 'nextBillingDate'
  | 'billingCycle'
  | 'plan'
  | 'status'
  | 'username'

const columnHelper = createColumnHelper<AdminSubscriptionRow>()

const FinanceSubscriptionsPage = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebounceValue(search, 350)
  const [sortField, setSortField] = useState<SortField>('startDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorting: SortingState = useMemo(
    () => [{ id: sortField, desc: sortDir === 'desc' }],
    [sortField, sortDir],
  )

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

  const rows: AdminSubscriptionRow[] = data?.subscriptions ?? []

  const columns = useMemo(
    () => [
      columnHelper.accessor('startDate', {
        id: 'startDate',
        header: 'Start',
        enableSorting: true,
        cell: ({ getValue }) => {
          const v = getValue()
          return <span className="small">{v ? new Date(v * 1000).toLocaleDateString() : '—'}</span>
        },
      }),
      columnHelper.accessor('endDate', {
        id: 'endDate',
        header: 'End',
        enableSorting: true,
        cell: ({ getValue }) => {
          const v = getValue()
          return <span className="small">{v ? new Date(v * 1000).toLocaleDateString() : '—'}</span>
        },
      }),
      columnHelper.accessor('nextBillingDate', {
        id: 'nextBillingDate',
        header: 'Next billing',
        enableSorting: true,
        cell: ({ getValue }) => {
          const v = getValue()
          return <span className="small">{v ? new Date(v * 1000).toLocaleDateString() : '—'}</span>
        },
      }),
      columnHelper.accessor('billingCycle', {
        id: 'billingCycle',
        header: 'Cycle',
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="small text-capitalize">{getValue() ?? '—'}</span>
        ),
      }),
      columnHelper.display({
        id: 'plan',
        header: 'Plan',
        enableSorting: true,
        cell: ({ row }) => (
          <span className="small">{row.original.planName ?? row.original.priceId ?? '—'}</span>
        ),
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        enableSorting: true,
        cell: ({ getValue }) => <span className="small text-capitalize">{getValue()}</span>,
      }),
      columnHelper.display({
        id: 'username',
        header: 'Username',
        enableSorting: true,
        cell: ({ row }) => (
          <span className="small">{row.original.username ?? row.original.userId ?? '—'}</span>
        ),
      }),
    ],
    [],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    manualSorting: true,
    onSortingChange: (updater) => {
      const next = functionalUpdate(updater, sorting)
      const s = next[0]
      if (!s) return
      setSortField(s.id as SortField)
      setSortDir(s.desc ? 'desc' : 'asc')
    },
    getCoreRowModel: getCoreRowModel(),
  })

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
        <DataTable
          table={table}
          onRowClick={openRow}
          rowClassName={(r) => (r.hubArchived ? 'table-secondary' : undefined)}
          emptyMessage="No subscriptions match your filters."
        />
      )}
    </div>
  )
}

export default FinanceSubscriptionsPage
