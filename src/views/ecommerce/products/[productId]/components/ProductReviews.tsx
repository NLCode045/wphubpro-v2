import {Badge, Button, Card, CardBody, CardFooter, CardHeader, CardTitle, Col, ProgressBar, Row} from 'react-bootstrap'
import {TbEdit, TbEye, TbStarFilled, TbTrash} from 'react-icons/tb'

import {ratings, reviewsData, type ReviewType} from '../data'

import ratingsImg from '@/assets/images/ratings.svg'
import Rating from '@/components/Rating'
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

import TablePagination from '@/components/table/TablePagination'
import DataTable from '@/components/table/DataTable'

const columnHelper = createColumnHelper<ReviewType>()

const ProductReviews = () => {
    const columns = [
        columnHelper.accessor('userName', {
            header: 'Reviewer',
            cell: ({row}) => (
                <div className="d-flex justify-content-start align-items-center gap-2">
                    <div className="avatar avatar-sm">
                        <img src={row.original.userAvatar} alt={`avatar-${row.original.id}`} width={32} height={32}
                             className="img-fluid rounded-circle"/>
                    </div>
                    <div>
                        <h5 className="text-nowrap fs-sm mb-0 lh-base">{row.original.userName}</h5>
                        <p className="text-muted fs-xs mb-0">{row.original.userEmail}</p>
                    </div>
                </div>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('rating', {
            header: 'Review',
            cell: ({row}) => (
                <>
          <span className="text-warning fs-lg">
            <Rating rating={row.original.rating} className={'d-inline-flex gap-1'}/>
          </span>
                    <h5 className="mt-2">{row.original.title}</h5>
                    <p className="text-muted fst-italic mb-0">"{row.original.comment}"</p>
                </>
            ),
            enableSorting: false,
        }),
        columnHelper.accessor('date', {
            header: 'Date',
            cell: ({row}) => (
                <>
                    {row.original.date} <small className="text-muted">{row.original.time}</small>
                </>
            ),
        }),
        columnHelper.accessor('status', {
            cell: ({row}) => (
                <span
                    className={`badge fs-xxs ${row.original.status === 'Published' ? 'badge-soft-success' : 'badge-soft-warning'}`}>
          {row.original.status}
        </span>
            ),
        }),
        {
            enableSorting: false,
            header: 'Actions',
            cell: () => (
                <div className="d-flex justify-content-center gap-1">
                    <Button size="sm" variant="light" className="btn-icon rounded-circle">
                        <TbEye className="fs-lg"/>
                    </Button>
                    <Button size="sm" variant="light" className="btn-icon rounded-circle">
                        <TbEdit className="fs-lg"/>
                    </Button>
                    <Button size="sm" variant="light" className="btn-icon rounded-circle">
                        <TbTrash className="fs-lg"/>
                    </Button>
                </div>
            ),
        }
    ]

    const [data, _setData] = useState<ReviewType[]>(() => [...reviewsData])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [pagination, setPagination] = useState({pageIndex: 0, pageSize: 5})

    const table = useReactTable({
        data,
        columns,
        state: {columnFilters, pagination},
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
        <Card className="mt-5 shadow-none border border-dashed">
            <CardHeader className="border-light">
                <CardTitle>Manage Reviews</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
                <Row className="align-items-center g-0">
                    <Col xl={7}>
                        <div className="d-flex align-items-center gap-4 p-4">
                            <img src={ratingsImg} alt="Product" width={95} height={80}/>
                            <div>
                                <h3 className="text-primary d-flex align-items-center gap-2 mb-2 fw-bold">
                                    4.92 <TbStarFilled/>
                                </h3>
                                <p className="mb-2">Based on 245 verified reviews</p>
                                <p className="pe-2 h6 text-muted mb-2 lh-base">Feedback collected from real customers
                                    who purchased our templates</p>
                                <Badge bg="success" className="badge-label">
                                    +12 new this week
                                </Badge>
                            </div>
                        </div>
                    </Col>
                    <Col xl={5}>
                        <div className="p-3">
                            {ratings.map((rating, index) => (
                                <div key={index} className="d-flex align-items-center gap-2 mb-2">
                                    <div className="flex-shrink-0" style={{width: 50}}>
                                        {rating.stars} Star
                                    </div>
                                    <ProgressBar now={rating.progress} className="w-100" style={{height: 8}}/>
                                    <div className="flex-shrink-0 text-end" style={{width: 30}}>
                                        <Badge bg="light" className="text-bg-light">
                                            {rating.count}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Col>
                </Row>
            </CardBody>

            <div className="table-responsive">
                <DataTable<ReviewType> table={table} emptyMessage="No records found"/>
                {table.getRowModel().rows.length > 0 && (
                    <CardFooter className="border-0">
                        <TablePagination
                            totalItems={totalItems}
                            start={start}
                            end={end}
                            showInfo
                            itemsName="reviews"
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
            </div>
        </Card>
    )
}

export default ProductReviews
