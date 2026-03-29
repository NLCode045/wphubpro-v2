import {useState} from 'react'
import {Button, Card, CardFooter, CardHeader, Col, Row} from 'react-bootstrap'
import {LuSearch, LuShuffle} from 'react-icons/lu'
import {TbAlertTriangle, TbEdit, TbEye, TbPlus, TbTrash} from 'react-icons/tb'

import {
    type ColumnFiltersState,
    createColumnHelper,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    type Row as TableRow,
    type Table as TableType,
    useReactTable,
} from '@tanstack/react-table'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import {Link} from "react-router";
import {tickets,type TicketType} from '../data.ts'

const columnHelper = createColumnHelper<TicketType>()

const TicketTabel = () => {
    const [data, setData] = useState<TicketType[]>(() => [...tickets])
    const [globalFilter, setGlobalFilter] = useState('')
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [pagination, setPagination] = useState({pageIndex: 0, pageSize: 8})
    const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)

    const columns = [
        {
            id: 'select',
            header: ({table}: { table: TableType<TicketType> }) => (
                <input
                    type="checkbox"
                    className="form-check-input form-check-input-light fs-14"
                    checked={table.getIsAllRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                />
            ),
            cell: ({row}: { row: TableRow<TicketType> }) => (
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
            header: 'ID',
            cell: ({row}) => (
                <Link to="/ticket-detail" className="fw-semibold link-reset">{row.original.id}</Link>
            ),
        }),
        columnHelper.accessor('requestedBy', {
            header: 'Requested By',
            cell: ({row}) => (
                <div className="d-flex gap-2 align-items-center">
                    <img src={row.original.requestedByImg} height={24} width={24} alt={row.original.requestedBy}
                         className="avatar-xs rounded-circle"/>
                    <span>{row.original.requestedBy}</span>
                </div>
            ),
        }),
        columnHelper.accessor('subject', {header: 'Ticket Subject'}),
        columnHelper.accessor('agent', {
            header: 'Assigned Agent',
            cell: ({row}) => (
                <div className="d-flex gap-2 align-items-center">
                    <img src={row.original.agentImg} height={24} width={24} alt={row.original.agent}
                         className="avatar-xs rounded-circle"/>
                    <Link to="" className="link-reset">{row.original.agent}</Link>
                </div>
            ),
        }),
        columnHelper.accessor('priority', {
            header: 'Priority',
            cell: ({row}) => {
                const color =
                    row.original.priority === 'High'
                        ? 'text-bg-danger'
                        : row.original.priority === 'Medium'
                            ? 'text-bg-warning'
                            : row.original.priority === 'Low'
                                ? 'text-bg-primary'
                                : 'text-bg-danger'
                return <span className={`badge ${color}`}>{row.original.priority}</span>
            },
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            filterFn: 'equalsString',
            enableColumnFilter: true,
            cell: ({row}) => {
                let badgeClass = ''
                switch (row.original.status) {
                    case 'Pending':
                        badgeClass = 'bg-warning-subtle text-warning'
                        break
                    case 'In Progress':
                        badgeClass = 'bg-info-subtle text-info'
                        break
                    case 'Resolved':
                        badgeClass = 'bg-success-subtle text-success'
                        break
                    case 'Closed':
                        badgeClass = 'bg-secondary-subtle text-secondary'
                        break
                    case 'Escalated':
                        badgeClass = 'bg-danger-subtle text-danger'
                        break
                    default:
                        badgeClass = 'bg-secondary-subtle text-secondary'
                }
                return <span className={`badge ${badgeClass} badge-label`}>{row.original.status}</span>
            },
        }),
        columnHelper.accessor('createdAt', {
            header: 'Date Created',
            cell: ({row}) => (
                <>
                    {row.original.createdAt} <small className="text-muted">{row.original.createdAtTime}</small>
                </>
            ),
        }),
        columnHelper.accessor('dueDate', {header: 'Due Date'}),
        {
            header: 'Actions',
            cell: ({row}: { row: TableRow<TicketType> }) => (
                <div className="d-flex gap-1">
                    <Button size="sm" className="btn-default btn-icon btn-sm rounded">
                        <TbEye className="fs-lg"/>
                    </Button>
                    <Button size="sm" className="btn-default btn-icon btn-sm rounded">
                        <TbEdit className="fs-lg"/>
                    </Button>
                    <Button
                        size="sm"
                        className="btn-default btn-icon btn-sm rounded"
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

    const table = useReactTable({
        data,
        columns,
        state: {sorting, globalFilter, columnFilters, pagination, rowSelection: selectedRowIds},
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
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
        <>
            <Row>
                <Col cols={12}>
                    <Card>
                        <CardHeader className="border-light justify-content-between">
                            <div className="d-flex gap-2">
                                <div className="app-search">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search tickets..."
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

                                <Link to="/ticket-create" className="btn btn-primary">
                                    <TbPlus className="me-1"/> New Ticket
                                </Link>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                                <span className="me-2 fw-semibold">Filter By:</span>

                                <div className="app-search">
                                    <select
                                        className="form-select form-control my-1 my-md-0"
                                        value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
                                        onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value === '' ? undefined : e.target.value)}>
                                        <option value="">Status</option>
                                        <option value="Open">Open</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Closed">Closed</option>
                                        <option value="Escalated">Escalated</option>
                                        <option value="In Progress">In Progress</option>
                                    </select>
                                    <LuShuffle className="app-search-icon text-muted"/>
                                </div>

                                <div className="app-search">
                                    <select
                                        className="form-select form-control my-1 my-md-0"
                                        value={(table.getColumn('priority')?.getFilterValue() as string) ?? ''}
                                        onChange={(e) => table.getColumn('priority')?.setFilterValue(e.target.value === '' ? undefined : e.target.value)}>
                                        <option value="">Priority</option>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                    <TbAlertTriangle className="app-search-icon text-muted"/>
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

                        <DataTable<TicketType> table={table} emptyMessage="No records found"/>

                        {table.getRowModel().rows.length > 0 && (
                            <CardFooter className="border-0">
                                <TablePagination
                                    totalItems={totalItems}
                                    start={start}
                                    end={end}
                                    itemsName="tickets"
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
                            itemName="tickets"
                        />
                    </Card>
                </Col>
            </Row>
        </>
    )
}

export default TicketTabel