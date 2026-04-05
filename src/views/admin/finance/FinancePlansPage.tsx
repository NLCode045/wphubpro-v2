import DataTable from '@/components/table/DataTable'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useAdminStripePlansList } from '@/domains/admin/finance/hooks'
import type { StripePlan } from '@/types'
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { Alert, Badge, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router'

const columnHelper = createColumnHelper<StripePlan>()

const FinancePlansPage = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useAdminStripePlansList()

  const plans = data?.plans ?? []
  const subscriptionCountsTruncated = data?.subscriptionCountsTruncated ?? false

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        id: 'name',
        header: 'Name',
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge bg={getValue() === 'active' ? 'success' : 'secondary'}>{getValue()}</Badge>
        ),
      }),
      columnHelper.accessor('monthlyPrice', {
        id: 'monthlyPrice',
        header: 'Monthly',
        cell: ({ getValue }) => getValue() ?? '—',
      }),
      columnHelper.accessor('yearlyPrice', {
        id: 'yearlyPrice',
        header: 'Yearly',
        cell: ({ getValue }) => getValue() ?? '—',
      }),
      columnHelper.accessor('currency', {
        id: 'currency',
        header: 'Currency',
        cell: ({ getValue }) => <span className="text-uppercase">{getValue()}</span>,
      }),
      columnHelper.accessor('activeSubscriptionsCount', {
        id: 'activeSubscriptionsCount',
        header: 'Active subs',
        enableSorting: true,
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue(columnId) as number | undefined
          const b = rowB.getValue(columnId) as number | undefined
          return (a ?? -1) - (b ?? -1)
        },
        cell: ({ getValue }) => {
          const n = getValue()
          return n == null ? '—' : n
        },
      }),
    ],
    [],
  )

  const table = useReactTable({
    data: plans,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: 'name', desc: false }],
    },
  })

  const openRow = (p: StripePlan) => {
    navigate(ROUTE_PATHS.adminFinancePlanPath(p.id))
  }

  if (isLoading) return <Spinner animation="border" />
  if (error) return <p className="text-danger">{error.message}</p>

  return (
    <>
      {subscriptionCountsTruncated ? (
        <Alert variant="secondary" className="mb-3 py-2 small">
          Some subscription counts may be incomplete: results are capped for performance (Stripe
          pagination or product limit).
        </Alert>
      ) : null}
      <DataTable
        table={table}
        onRowClick={openRow}
        emptyMessage="No plans returned from Stripe."
      />
    </>
  )
}

export default FinancePlansPage
