
import {
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

import {Link} from "react-router";
import { useState } from 'react'
import { Button, Card, CardFooter, CardHeader } from 'react-bootstrap'
import { LuDollarSign, LuSearch, LuShuffle } from 'react-icons/lu'
import { TbEdit, TbEye, TbPlus, TbTrash } from 'react-icons/tb'

import DataTable from '@/components/table/DataTable'
import DeleteConfirmationModal from '@/components/table/DeleteConfirmationModal'
import TablePagination from '@/components/table/TablePagination'
import { estimates, type EstimateType } from '../data.ts'
import EstimationsModal from './EstimationsModal.tsx'

const columnHelper = createColumnHelper<EstimateType>()

const EstimationsTable = () => {
    const [showModal, setShowModal] = useState(false);

    const columns = [
        {
            id: 'select',
            header: ({ table }: { table: TableType<EstimateType> }) => (
                <input
                    type="checkbox"
                    className="form-check-input form-check-input-light fs-14"
                    checked={table.getIsAllRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                />
            ),
            cell: ({ row }: { row: TableRow<EstimateType> }) => (
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
            header: 'Estimate ID',
            cell: ({ row }) => (
                <Link to="" className="fw-semibold link-reset">
                    {row.original.id}
                </Link>
            ),
        }),
        columnHelper.accessor('project', { header: 'Project' }),

        columnHelper.accessor('client', {
            header: 'Client',
            cell: ({ row }) => (
                <div className="d-flex align-items-center gap-2">
                    <div className="avatar-sm border flex-shrink-0 border-dashed rounded-circle me-2 justify-content-center d-flex align-items-center">
                        <img src={row.original.client.logo} alt={row.original.client.name} height={20} />
                    </div>
                    <span className="link-reset">{row.original.client.name}</span>
                </div>
            ),
        }),

        columnHelper.accessor('value', { header: 'Estimated Value' }),

        columnHelper.accessor('estimatedBy', {
            header: 'Estimated By'
            , cell: ({ row }) => (
                <div className="d-flex gap-2 align-items-center">
                    <img src={row.original.estimatedBy.avatar} alt={row.original.estimatedBy.name} height={20} className="avatar-xs rounded-circle" />
                    <span className="link-reset">{row.original.estimatedBy.name}</span>
                </div>
            ),

        }),


        columnHelper.accessor('created', {
            header: 'Created'
            , cell: ({ row }) => (
                <>
                    {row.original.created} <small className="text-muted">{row.original.createdTime}</small>
                </>
            ),
        }),
        columnHelper.accessor('expectedClose', {
            header: 'Expected Close'
            , cell: ({ row }) => (
                <>
                    {row.original.expectedClose} <small className="text-muted">{row.original.expectedCloseTime}</small>
                </>
            ),
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: ({ row }) => {
                const color =
                    row.original.status === 'Declined'
                        ? 'badge-label bg-danger-subtle text-danger badge-label fs-xs'
                        : row.original.status === 'In Review'
                            ? 'badge-label bg-info-subtle text-info fs-xs'
                            : row.original.status === 'Approved'
                                ? 'badge-label bg-success-subtle text-success badge-label fs-xs'
                                : row.original.status === 'Pending'
                                    ? 'badge-label bg-warning-subtle text-warning fs-xs'
                                    : 'badge-label bg-secondary-subtle text-secondary fs-xs'
                return <span className={`badge ${color}`}>{row.original.status}</span>
            },
        }),
        {
            header: 'Actions',
            cell: ({ row }: { row: TableRow<EstimateType> }) => (
                <div className="d-flex  gap-1">
                    <Button variant="default" size="sm" className="btn btn-default btn-icon btn-sm rounded">
                        <TbEye className="fs-lg" />
                    </Button>
                    <Button variant="default" size="sm" className="btn btn-default btn-icon btn-sm rounded">
                        <TbEdit className="fs-lg" />
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className="btn btn-default btn-icon btn-sm rounded"
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


    const [data, setData] = useState<EstimateType[]>(() => [...estimates])
    const [globalFilter, setGlobalFilter] = useState('')
    const [sorting, setSorting] = useState<SortingState>([])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 })

    const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({})

    const table = useReactTable({
        data,
        columns,
        state: { sorting, globalFilter, pagination, rowSelection: selectedRowIds },
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
        setPagination({ ...pagination, pageIndex: 0 })
        setShowDeleteModal(false)
    }

    return (

        <Card>
            <CardHeader className="border-light justify-content-between">
                <div className="d-flex gap-2">
                    <div className="app-search">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search clients..."
                            value={globalFilter ?? ''}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                        />
                        <LuSearch className="app-search-icon text-muted" />
                    </div>

                    {Object.keys(selectedRowIds).length > 0 && (
                        <Button variant="danger" size="sm" onClick={toggleDeleteModal}>
                            Delete
                        </Button>
                    )}

                    <Button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <TbPlus className="fs-lg" /> New Estimation
                    </Button>
                    <EstimationsModal show={showModal} onHide={() => setShowModal(false)} />
                </div>

                <div className="d-flex align-items-center gap-2">
                    <span className="me-2 fw-semibold">Filter By:</span>

                    <div className="app-search">
                        <select
                            className="form-select form-control my-1 my-md-0"
                            value={(table.getColumn('status')?.getFilterValue() as string) ?? 'All'}
                            onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                            <option value="All">Status</option>
                            <option value="Approved">Approved</option>
                            <option value="Pending">Pending</option>
                            <option value="Declined">Declined</option>
                            <option value="Sent">Sent</option>
                            <option value="In Review">In Review</option>
                        </select>
                        <LuShuffle className="app-search-icon text-muted" />
                    </div>

                    <div className="app-search">
                        <select
                            className="form-select form-control my-1 my-md-0"
                            value={(table.getColumn('value')?.getFilterValue() as string) ?? 'All'}
                            onChange={(e) => table.getColumn('value')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)}>
                            <option value="All">Value Range</option>
                            <option value="0-5000">$0 - $5,000</option>
                            <option value="5001-10000">$5,001 - $10,000</option>
                            <option value="10001-20000">$10,001 - $20,000</option>
                            <option value="20001-50000">$20,001 - $50,000</option>
                            <option value="50000+">$50,000+</option>
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
            <DataTable<EstimateType> table={table} emptyMessage="No records found" />

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
    
    )
}

export default EstimationsTable

