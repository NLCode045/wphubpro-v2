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

  const plans = data ?? []

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
    <DataTable
      table={table}
      onRowClick={openRow}
      emptyMessage="No plans returned from Stripe."
    />
  )
}

export default FinancePlansPage
