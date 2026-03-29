import {
    createColumnHelper,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type Row as TableRow,
    type SortingState,
    type  Table as TableType,
    useReactTable,
} from '@tanstack/react-table'

import {Link} from "react-router";
import {useState} from 'react'
import {Button, Card, CardFooter, CardHeader, Col, Container, Row} from 'react-bootstrap'
import {LuGlobe, LuSearch, LuShuffle} from 'react-icons/lu'
import {TbEdit, TbEye, TbPlus, TbTrash} from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import CustomerModal from './components/CustomerModal.tsx'
import {customers, type CustomerType} from './data.ts'
import PageBreadcrumb from '@/components/PageBreadcrumb'

const columnHelper = createColumnHelper<CustomerType>()

const CustomersCard = () => {
    const [showModal, setShowModal] = useState(false);

    const columns = [
        {
            id: 'select',
            header: ({table}: { table: TableType<CustomerType> }) => (
                <input
                    type="checkbox"
                    className="form-check-input form-check-input-light fs-14"
                    checked={table.getIsAllRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                />
            ),
            cell: ({row}: { row: TableRow<CustomerType> }) => (
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
            header: 'Client Name',
            cell: ({row}) => (
                <div className="d-flex align-items-center gap-2">
                    <div className="avatar avatar-sm">
                        <img src={row.original.avatar} alt="" height={32} width={32}
                             className="img-fluid rounded-circle"/>
                    </div>
                    <div>
                        <h5 className="mb-0">
                            <Link to="/users/profile" className="link-reset">
                                {row.original.name}
                            </Link>
                        </h5>
                        <p className="text-muted fs-xs mb-0">{row.original.email}</p>
                    </div>
                </div>
            ),
        }),
        columnHelper.accessor('phone', {header: 'Phone'}),

        columnHelper.accessor('country', {
            header: 'Country',
            cell: ({row}) => (
                <>
                    <span className='badge p-1 text-bg-light fs-sm'>
                        <img src={row.original.countryFlag} alt="" className="rounded-circle me-1" height={16}
                             width={16}/> {row.original.country}
                    </span>
                </>
            ),
        }),
        columnHelper.accessor('joined', {
            header: 'Date',
            cell: ({row}) => (
                <>
                    {row.original.joined}
                </>
            ),
        }),
        columnHelper.accessor('type', {header: 'Type'}),
        columnHelper.accessor('company', {header: 'Company'}),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: ({row}) => {
                const color =
                    row.original.status === 'Blocked'
                        ? ' bg-danger-subtle text-danger badge-label'
                        : row.original.status === 'Verification Pending'
                            ? 'bg-warning-subtle text-warning badge-label'
                            : row.original.status === 'Active'
                                ? 'bg-success-subtle text-success badge-label'
                                : 'bg-secondary-subtle text-secondary badge-label'
                return <span className={`badge ${color}`}>{row.original.status}</span>
            },
        }),

        {
            header: 'Actions',
            cell: ({row}: { row: TableRow<CustomerType> }) => (
                <div className="d-flex  gap-1">
                    <Button variant="default" size="sm" className="btn btn-default btn-icon btn-sm rounded">
                        <TbEye className="fs-lg"/>
                    </Button>
                    <Button variant="default" size="sm" className="btn btn-default btn-icon btn-sm rounded">
                        <TbEdit className="fs-lg"/>
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className="btn btn-default btn-icon btn-sm rounded"
                        onClick={() => {
                            toggleDeleteModal()
                            setSelectedRowIds({[row.id]: true})
                        }}>
                        <TbTrash className="fs-lg"/>
                    </Button>
                </div>
            ),
        },
    ]

    const [data, setData] = useState<CustomerType[]>(() => [...customers])
    const [globalFilter, setGlobalFilter] = useState('')
    const [sorting, setSorting] = useState<SortingState>([])
    const [pagination, setPagination] = useState({pageIndex: 0, pageSize: 8})

    const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

    const table = useReactTable({
        data,
        columns,
        state: {sorting, globalFilter, pagination, rowSelection: selectedRowIds},
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        onRowSelectionChange: setSelectedRowIds,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn: 'includesString',
        enableColumnFilters: true,
        enableRowSelection: true,
    })

    const pageIndex = table.getState().pagination.pageIndex
    const pageSize = table.getState().pagination.pageSize
    const totalItems = table.getFilteredRowModel().rows.length

    const start = pageIndex * pageSize + 1
    const end = Math.min(start + pageSize - 1, totalItems)

    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)

    const toggleDeleteModal = () => {
        setShowDeleteModal(!showDeleteModal)
    }

    const handleDelete = () => {
        const selectedIds = new Set(Object.keys(selectedRowIds))
        setData((old) => old.filter((_, idx) => !selectedIds.has(idx.toString())))
        setSelectedRowIds({})
        setPagination({...pagination, pageIndex: 0})
        setShowDeleteModal(false)
    }

    return (
        <Container fluid>
            <PageBreadcrumb title="Customers" subtitle="CRM"/>
            <Row>
                <Col xs={12}>
                    <Card>
                        <CardHeader className="border-light justify-content-between">
                            <div className="d-flex gap-2">
                                <div className="app-search">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search Customer..."
                                        value={globalFilter ?? ''}
                                        onChange={(e) => setGlobalFilter(e.target.value)}
                                    />
                                    <LuSearch className="app-search-icon text-muted"/>
                                </div>

                                {Object.keys(selectedRowIds).length > 0 && (
                                    <Button variant="danger" size="sm" onClick={toggleDeleteModal}>
                                        Delete
                                    </Button>
                                )}

                                <Button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                    <TbPlus className="fs-lg"/> New Customer
                                </Button>
                                <CustomerModal show={showModal} onHide={() => setShowModal(false)}/>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                                <span className="me-2 fw-semibold">Filter By:</span>

                                <div className="app-search">
                                    <select
                                        className="form-select form-control my-1 my-md-0"
                                        value={(table.getColumn('country')?.getFilterValue() as string) ?? 'All'}
                                        onChange={(e) => table.getColumn('country')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                                        <option value="All">Country</option>
                                        <option value="US">United States</option>
                                        <option value="UK">United Kingdom</option>
                                        <option value="BR">Brazil</option>
                                        <option value="DE">Germany</option>
                                        <option value="JP">Japan</option>
                                        <option value="FR">France</option>
                                        <option value="IN">India</option>
                                        <option value="EG">Egypt</option>
                                        <option value="CA">Canada</option>
                                    </select>
                                    <LuGlobe className="app-search-icon text-muted"/>
                                </div>

                                <div className="app-search">
                                    <select
                                        className="form-select form-control my-1 my-md-0"
                                        value={(table.getColumn('status')?.getFilterValue() as string) ?? 'All'}
                                        onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                                        <option value="All">Account Status</option>
                                        <option value="Active">Active</option>
                                        <option value="Verification Pending">Verification Pending</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Blocked">Blocked</option>
                                    </select>
                                    <LuShuffle className="app-search-icon text-muted"/>
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
                        <DataTable<CustomerType> table={table} emptyMessage="No records found"/>

                        {table.getRowModel().rows.length > 0 && (
                            <CardFooter className="border-0">
                                <TablePagination
                                    totalItems={totalItems}
                                    start={start}
                                    end={end}
                                    itemsName="customers"
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
                            itemName="customers"
                        />
                    </Card>
                </Col>
            </Row>
        </Container>
    )
}

export default CustomersCard
