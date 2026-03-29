
import { Button, CardFooter, Col, Container, Row } from 'react-bootstrap'
import { deals, dealWidgets } from '@/views/apps/crm/data'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { TbEdit, TbEye, TbPlus, TbTrash } from 'react-icons/tb'
import { LuDollarSign, LuSearch, LuShuffle } from 'react-icons/lu'
import {
type  ColumnFiltersState,
  createColumnHelper,
 type FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import type { DealType } from '@/views/apps/crm/types'

import {Link} from "react-router";
import { useState } from 'react'
import {type  Row as TableRow, type Table as TableType } from '@tanstack/table-core'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import { currency } from '@/helpers'
import { useToggle } from 'usehooks-ts'
import CreateDealModal from '@/views/apps/crm/deals/components/CreateDealModal'
import DealWidget from '@/views/apps/crm/deals/components/DealWidget'

const columnHelper = createColumnHelper<DealType>()

const priceRangeFilterFn: FilterFn<any> = (row, columnId, value) => {
  const amount = row.getValue<number>(columnId)
  if (!value) return true
  if (value === '50000+') return amount > 50000
  const [min, max] = value.split('-').map(Number)
  return amount >= min && amount <= max
}

const Deals = () => {
  const columns = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<DealType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<DealType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    columnHelper.accessor('name', {
      header: 'Deal Name',
    }),
    columnHelper.accessor('company', {
      header: 'Company',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="d-flex align-items-center">
          <div className="avatar-sm border flex-shrink-0 border-dashed rounded-circle me-2 justify-content-center d-flex align-items-center">
            <img src={row.original.logo} alt="Product" height="20" />
          </div>
          <Link to="" className="link-reset">
            {row.original.company}
          </Link>
        </div>
      ),
    }),
    columnHelper.accessor('amount', {
      header: 'amount (usd)',
      enableColumnFilter: true,
      filterFn: priceRangeFilterFn,
      cell: ({ row }) => (
        <>
          {currency}
          {row.original.amount}
        </>
      ),
    }),

    columnHelper.accessor('stage', { header: 'Stage', enableColumnFilter: true }),

    columnHelper.accessor('probability', {
      header: 'Probability',
      cell: ({ row }) => (
        <div className="d-flex align-items-center gap-1">
          {[...Array(5)].map((_, i) => {
            const activeBars = Math.round(row.original.probability / 20)
            const opacity = i < activeBars ? 'opacity-100' : i === activeBars ? 'opacity-50' : 'opacity-25'
            const color = row.original.probability === 0 ? 'bg-danger' : 'bg-success'
            return <div key={i} className={`prob-bar ${color} ${opacity}`}></div>
          })}
          <strong className="text-dark">{row.original.probability}%</strong>
        </div>
      ),
    }),
    columnHelper.accessor('date', {
      header: 'Closing Date',
    }),
    {
      header: 'Actions',
      cell: ({ row }: { row: TableRow<DealType> }) => (
        <div className="d-flex  gap-1">
          <Button variant="default" size="sm" className="btn-icon">
            <TbEye className="fs-lg" />
          </Button>
          <Button variant="default" size="sm" className="btn-icon">
            <TbEdit className="fs-lg" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="btn-icon"
            onClick={() => {
              toggleDeleteModal()
              setSelectedRowIds({ [row.id]: true })
            }}>
            <TbTrash className="fs-lg" />
          </Button>
        </div>
      ),
    },
  ]

  const [data, setData] = useState<DealType[]>(() => [...deals])
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination, rowSelection: selectedRowIds },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setSelectedRowIds,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
    enableRowSelection: true,
    filterFns: {
      priceRange: priceRangeFilterFn,
    },
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [showDealModal, toggleDealModal] = useToggle(false)

  const toggleDeleteModal = () => {
    setShowDeleteModal(!showDeleteModal)
  }

  const handleDelete = () => {
    const selectedIds = new Set(Object.keys(selectedRowIds))
    setData((old) => old.filter((_, idx) => !selectedIds.has(idx.toString())))
    setSelectedRowIds({})
    setPagination({ ...pagination, pageIndex: 0 })
    setShowDeleteModal(false)
  }
  return (
    <Container fluid>
      <PageBreadcrumb title={'Deals'} subtitle={'CRM'} />
      <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 g-2">
        {dealWidgets.map((item, idx) => (
          <Col key={idx}>
            <DealWidget item={item} />
          </Col>
        ))}
      </Row>
      <Row>
        <Col xs={12}>
          <div className="card">
            <div className="card-header border-light justify-content-between">
              <div className="d-flex gap-2">
                <div className="app-search">
                  <input
                    type="search"
                    className="form-control"
                    placeholder="Search deals..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />
                  <LuSearch className="app-search-icon text-muted" />
                </div>
                <Button variant="primary" onClick={toggleDealModal}>
                  <TbPlus className="me-1" /> Create Deal
                </Button>
                {Object.keys(selectedRowIds).length > 0 && (
                  <Button variant="danger" size="sm" onClick={toggleDeleteModal}>
                    Delete
                  </Button>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="me-2 fw-semibold">Filter By:</span>

                <div className="app-search">
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={(table.getColumn('stage')?.getFilterValue() as string) ?? 'All'}
                    onChange={(e) => table.getColumn('stage')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                    <option value="All">Stage</option>
                    <option value="Qualification">Qualification</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                  <LuShuffle className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    value={(table.getColumn('amount')?.getFilterValue() as string) ?? 'All'}
                    onChange={(e) => table.getColumn('amount')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}
                    className="form-select form-control my-1 my-md-0">
                    <option value="All">Amount Range</option>
                    <option value="0-1000">$0 - $10000</option>
                    <option value="10001-25000">$10001 - $25000</option>
                    <option value="25001-50000">$25001 - $50000</option>
                    <option value="50000+">$50000+</option>
                  </select>
                  <LuDollarSign className="app-search-icon text-muted" />
                </div>

                <div>
                  <select
                    className="form-select form-control my-1 my-md-0"
                    value={table.getState().pagination.pageSize}
                    onChange={(e) => table.setPageSize(Number(e.target.value))}>
                    {[5, 8, 10, 15, 20].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card-body p-0">
              <DataTable<DealType> table={table} emptyMessage="No records found" />
            </div>

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalItems}
                  start={start}
                  end={end}
                  itemsName="deals"
                  showInfo
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

            <DeleteConfirmationModal
              show={showDeleteModal}
              onHide={toggleDeleteModal}
              onConfirm={handleDelete}
              selectedCount={Object.keys(selectedRowIds).length}
              itemName="deal"
            />

            <CreateDealModal show={showDealModal} toggleModal={toggleDealModal} />
          </div>
        </Col>
      </Row>
    </Container>
  )
}

export default Deals
