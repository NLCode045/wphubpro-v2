import DataTable from '@/components/table/DataTable'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useAdminPaymentsList } from '@/domains/admin/finance/hooks'
import type { AdminPaymentIntentRow } from '@/domains/admin/finance/types'
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Form, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router'

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

const columnHelper = createColumnHelper<AdminPaymentIntentRow>()

const FinancePaymentsPage = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')

  const { data, isLoading, error } = useAdminPaymentsList({
    limit: 100,
    status: status || undefined,
  })

  const orders = data?.orders ?? []

  const columns = useMemo(
    () => [
      columnHelper.accessor('date', {
        id: 'date',
        header: 'Date',
        cell: ({ getValue }) => (
          <span className="small">{new Date(getValue() * 1000).toLocaleString()}</span>
        ),
      }),
      columnHelper.accessor('amount', {
        id: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="small">{formatMoney(row.original.amount, row.original.currency)}</span>
        ),
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        cell: ({ getValue }) => <span className="small">{getValue()}</span>,
      }),
      columnHelper.accessor('customer', {
        id: 'customer',
        header: 'Customer',
        cell: ({ getValue }) => (
          <span className="small font-monospace text-truncate d-inline-block" style={{ maxWidth: 140 }}>
            {getValue() ?? '—'}
          </span>
        ),
        sortingFn: (a, b) =>
          String(a.original.customer ?? '').localeCompare(String(b.original.customer ?? '')),
      }),
      columnHelper.accessor('email', {
        id: 'email',
        header: 'Email',
        enableSorting: false,
        cell: ({ getValue }) => <span className="small">{getValue() ?? '—'}</span>,
      }),
    ],
    [],
  )

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: 'date', desc: true }],
    },
  })

  const open = (r: AdminPaymentIntentRow) => {
    navigate(ROUTE_PATHS.adminFinancePaymentPath(r.id))
  }

  if (isLoading) return <Spinner animation="border" />
  if (error) return <p className="text-danger">{error.message}</p>

  return (
    <div>
      <div className="mb-3" style={{ maxWidth: 280 }}>
        <Form.Label className="small text-muted">Status</Form.Label>
        <Form.Select size="sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any</option>
          <option value="succeeded">Succeeded</option>
          <option value="processing">Processing</option>
          <option value="requires_payment_method">Requires payment method</option>
          <option value="requires_action">Requires action</option>
          <option value="canceled">Canceled</option>
        </Form.Select>
      </div>

      <DataTable
        table={table}
        onRowClick={open}
        emptyMessage="No payment intents found."
      />
    </div>
  )
}

export default FinancePaymentsPage
