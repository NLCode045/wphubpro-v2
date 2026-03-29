import {Link} from "react-router";
import {
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    CardTitle,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
} from 'react-bootstrap'
import {TbCircleFilled, TbDotsVertical, TbFileExport, TbPlus} from 'react-icons/tb'

import TablePagination from '@/components/table/TablePagination.tsx'
import {orders, type OrderType} from '../data.ts'
import {
    type ColumnFiltersState,
    createColumnHelper,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import {useState} from 'react'
import DataTable from '@/components/table/DataTable.tsx'

const columnHelper = createColumnHelper<OrderType>()

const RecentOrders = () => {
  const columns = [
    columnHelper.accessor('userImage', {
      cell: ({ row }) => (
        <div className="d-flex align-items-center">
          <img src={row.original.userImage} className="avatar-sm rounded-circle me-2" alt={row.original.userName} />
          <div>
            <span className="text-muted fs-xs">{row.original.userName}</span>
            <h5 className="fs-base mb-0">
              <Link to="/orders/1" className="text-body">
                #{row.original.id}
              </Link>
            </h5>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('product', {
      cell: ({ row }) => (
        <>
          <span className="text-muted fs-xs">Product</span>
          <h5 className="fs-base mb-0 fw-normal">{row.original.product}</h5>
        </>
      ),
    }),
    columnHelper.accessor('date', {
      cell: ({ row }) => (
        <>
          <span className="text-muted fs-xs">Date</span>
          <h5 className="fs-base mb-0 fw-normal">{row.original.date}</h5>
        </>
      ),
    }),
    columnHelper.accessor('amount', {
      cell: ({ row }) => (
        <>
          <span className="text-muted fs-xs">Amount</span>
          <h5 className="fs-base mb-0 fw-normal">{row.original.amount}</h5>
        </>
      ),
    }),
    columnHelper.accessor('status', {
      cell: ({ row }) => (
        <>
          <span className="text-muted fs-xs">Status</span>
          <h5 className="fs-base mb-0 fw-normal">
            <TbCircleFilled className={`fs-xs text-${row.original.statusVariant}`} /> {row.original.status}
          </h5>
        </>
      ),
    }),
    columnHelper.accessor('id', {
      cell: () => (
        <Dropdown>
          <DropdownToggle as="button" className="bg-transparent border-transparent border-0 text-muted drop-arrow-none card-drop p-0">
            <TbDotsVertical className="fs-lg" />
          </DropdownToggle>
          <DropdownMenu align={'start'} className="dropdown-menu-end">
            <DropdownItem href="#">View Details</DropdownItem>
            <DropdownItem href="#">Cancel Order</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      ),
    }),
  ]

  const [data, _setData] = useState<OrderType[]>(() => [...orders])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 7 })

  const table = useReactTable({
    data,
    columns,
    state: { columnFilters, pagination },
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)
  return (
    <Card>
      <CardHeader className="justify-content-between align-items-center border-dashed">
        <CardTitle as="h4" className="mb-0">
          Recent Orders
        </CardTitle>
        <div className="d-flex gap-2">
          <Button variant="soft-secondary" size="sm">
            <TbPlus className="me-1" /> Add Order
          </Button>
          <Button variant="primary" size="sm">
            <TbFileExport className="me-1" /> Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <DataTable<OrderType> table={table} emptyMessage="No records found" showHeaders={false} />
      </CardBody>
      {table.getRowModel().rows.length > 0 && (
        <CardFooter className="border-0">
          <TablePagination
            totalItems={totalItems}
            start={start}
            end={end}
            className={'pagination-sm'}
            showInfo
            itemsName="orders"
            previousPage={table.previousPage}
            canPreviousPage={table.getCanPreviousPage()}
            pageCount={table.getPageCount()}
            pageIndex={table.getState().pagination.pageIndex}
            setPageIndex={table.setPageIndex}
            nextPage={table.nextPage}
            canNextPage={table.getCanNextPage()}
          />
        </CardFooter>
      )}
    </Card>
  )
}

export default RecentOrders
