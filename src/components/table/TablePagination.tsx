
import clsx from 'clsx'
import { Col, Row } from 'react-bootstrap'
import { TbChevronLeft, TbChevronRight } from 'react-icons/tb'

const DEFAULT_PAGE_SIZE_OPTIONS = [4, 8, 16, 32, 64] as const

export type TablePaginationProps = {
  totalItems: number
  start: number
  end: number
  itemsName?: string
  showInfo?: boolean
  /** When set with `onPageSizeChange`, a rows-per-page control is shown next to the page buttons. */
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: readonly number[]
  // Pagination control props
  previousPage: () => void
  canPreviousPage: boolean
  pageCount: number
  pageIndex: number
  setPageIndex: (index: number) => void
  nextPage: () => void
  canNextPage: boolean
  className?: string
}

const TablePagination = ({
  totalItems,
  start,
  end,
  itemsName = 'items',
  showInfo,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  previousPage,
  canPreviousPage,
  pageCount,
  pageIndex,
  setPageIndex,
  nextPage,
  canNextPage,
  className,
}: TablePaginationProps) => {
  const showPageSize = typeof onPageSizeChange === 'function' && typeof pageSize === 'number'

  return (
    <Row className={clsx('align-items-center text-center text-sm-start', showInfo ? 'justify-content-between' : 'justify-content-end')}>
      {showInfo && (
        <Col sm>
          <div className="text-muted">
            Showing <span className="fw-semibold">{start}</span> to <span className="fw-semibold">{end}</span> of{' '}
            <span className="fw-semibold">{totalItems}</span> {itemsName}
          </div>
        </Col>
      )}
      <Col sm="auto" className="mt-3 mt-sm-0">
        <div className="d-flex align-items-center gap-2 flex-wrap justify-content-center justify-content-sm-end">
          {showPageSize && (
            <select
              className="form-select form-select-sm"
              aria-label="Rows per page"
              style={{ width: 'auto', minWidth: '5.75rem' }}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          )}
          <ul className={clsx('pagination pagination-boxed mb-0 justify-content-center pagination-sm', className)}>
            <li className="page-item">
              <button className="page-link" onClick={() => previousPage()} disabled={!canPreviousPage}>
                <TbChevronLeft />
              </button>
            </li>

            {Array.from({ length: pageCount }).map((_, index) => (
              <li key={index} className={`page-item ${pageIndex === index ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPageIndex(index)}>
                  {index + 1}
                </button>
              </li>
            ))}

            <li className="page-item">
              <button className="page-link" onClick={() => nextPage()} disabled={!canNextPage}>
                <TbChevronRight />
              </button>
            </li>
          </ul>
        </div>
      </Col>
    </Row>
  )
}

export default TablePagination
