import {
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Col,
    Container,
    OverlayTrigger,
    Row,
    Tooltip
} from 'react-bootstrap'
import {leadsData} from '@/views/apps/crm/data'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import {TbEdit, TbEye, TbPlus, TbTrash} from 'react-icons/tb'
import {LuDollarSign, LuSearch, LuShuffle} from 'react-icons/lu'
import {
    type ColumnFiltersState,
    createColumnHelper,
    type FilterFn,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
} from '@tanstack/react-table'
import {type LeadType} from '@/views/apps/crm/types'

import {Link} from "react-router";
import {useState} from 'react'
import {type Row as TableRow, type Table as TableType} from '@tanstack/table-core'
import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import {currency} from '@/helpers'
import {useToggle} from 'usehooks-ts'
import AddNewLeadModal from '@/views/apps/crm/leads/components/AddNewLeadModal'

const columnHelper = createColumnHelper<LeadType>()

const priceRangeFilterFn: FilterFn<any> = (row, columnId, value) => {
  const amount = row.getValue<number>(columnId)
  if (!value) return true
  if (value === '500000+') return amount > 500000
  const [min, max] = value.split('-').map(Number)
  return amount >= min && amount <= max
}

const Leads = () => {
  const columns = [
    {
      id: 'select',
      maxSize: 45,
      size: 45,
      header: ({ table }: { table: TableType<LeadType> }) => (
        <input
          type="checkbox"
          className="form-check-input form-check-input-light fs-14"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: { row: TableRow<LeadType> }) => (
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
    columnHelper.accessor('id', {
      header: 'Lead Id',
    }),
    columnHelper.accessor('customer', {
      header: 'Customer',
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
    columnHelper.accessor('email', { header: 'Email' }),
    columnHelper.accessor('phone', { header: 'Phone' }),
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
    columnHelper.accessor('tag', {
      header: 'Tags',
      cell: ({ row }) => (
        <span className={`badge badge-label bg-${row.original.tag.color}-subtle text-${row.original.tag.color}`}>{row.original.tag.label}</span>
      ),
    }),
    columnHelper.accessor('assigned', {
      header: 'Assigned',
      cell: ({ row }) =>
        <OverlayTrigger overlay={<Tooltip>{row.original.assigned.name}</Tooltip>}>
        <img src={row.original.assigned.avatar} alt="Product" className="avatar-xs rounded-circle" />
      </OverlayTrigger>
      ,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: ({ row }) => (
        <span className={`badge bg-${row.original.statusVariant}-subtle text-${row.original.statusVariant}`}>{row.original.status}</span>
      ),
    }),
    columnHelper.accessor('created', { header: 'Created' }),
    {
      header: 'Actions',
      cell: ({ row }: { row: TableRow<LeadType> }) => (
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

  const [data, setData] = useState<LeadType[]>(() => [...leadsData])
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
      <PageBreadcrumb title={'Leads'} subtitle={'CRM'} />

      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-light justify-content-between">
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
                  <TbPlus className="me-1" /> New Lead
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
                    value={(table.getColumn('status')?.getFilterValue() as string) ?? 'All'}
                    onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                    <option value="All">Status</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Pending">Pending</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <LuShuffle className="app-search-icon text-muted" />
                </div>

                <div className="app-search">
                  <select
                    value={(table.getColumn('amount')?.getFilterValue() as string) ?? 'All'}
                    onChange={(e) => table.getColumn('amount')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}
                    className="form-select form-control my-1 my-md-0">
                    <option value="All">Amount Range</option>
                    <option value="0-100000">$0 - $100000</option>
                    <option value="100001-250000">$100001 - $250000</option>
                    <option value="250001-500000">$250001 - $500000</option>
                    <option value="500000+">$500000+</option>
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
            </CardHeader>

            <CardBody className="p-0">
              <DataTable<LeadType> table={table} emptyMessage="No records found" />
            </CardBody>

            {table.getRowModel().rows.length > 0 && (
              <CardFooter className="border-0">
                <TablePagination
                  totalItems={totalItems}
                  start={start}
                  end={end}
                  itemsName="leads"
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
              itemName="lead"
            />

            <AddNewLeadModal show={showDealModal} toggleModal={toggleDealModal} />
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default Leads
