import DataTable from '@/components/table/DataTable';
import TablePagination from '@/components/table/TablePagination';
import { ROUTE_PATHS } from '@/config/routePaths';
import type { Ticket } from '@/types';
import {
  type ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { Button, Card, CardFooter, CardHeader, Col, Row } from 'react-bootstrap';
import { LuSearch, LuShuffle } from 'react-icons/lu';
import { TbAlertTriangle, TbEye } from 'react-icons/tb';
import { Link } from 'react-router';
import {
  categoryLabel,
  formatPriority,
  formatTicketStatus,
  priorityBadgeClass,
  statusBadgeClass,
} from '@/views/support/supportUi';

const columnHelper = createColumnHelper<Ticket>();

type Props = {
  tickets: Ticket[];
  adminMode: boolean;
  newTicketTo: string;
};

export function SupportTicketsTable({ tickets, adminMode, newTicketTo }: Props) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

  const columns = useMemo(() => {
    const cols = [
      columnHelper.accessor('$id', {
        header: 'ID',
        cell: ({ row }) => (
          <Link to={ROUTE_PATHS.supportTicketPath(row.original.$id)} className="fw-semibold link-reset">
            #{row.original.$id.slice(0, 8)}…
          </Link>
        ),
      }),
    ];

    if (adminMode) {
      cols.push(
        columnHelper.display({
          id: 'user',
          header: 'User',
          cell: ({ row }) => {
            const r = row.original.reporter;
            if (!r) return <span className="text-muted">—</span>;
            const label = r.name?.trim() || r.email || r.id.slice(0, 8);
            return <span>{label}</span>;
          },
        })
      );
    }

    cols.push(
      columnHelper.accessor('subject', { header: 'Subject' }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: ({ row }) => categoryLabel(row.original.category),
      }),
      columnHelper.accessor('priority', {
        header: 'Priority',
        cell: ({ row }) => (
          <span className={`badge ${priorityBadgeClass(row.original.priority)}`}>
            {formatPriority(row.original.priority)}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        filterFn: 'equalsString',
        enableColumnFilter: true,
        cell: ({ row }) => (
          <span className={`badge ${statusBadgeClass(row.original.status)} badge-label`}>
            {formatTicketStatus(row.original.status)}
          </span>
        ),
      }),
      columnHelper.accessor('$createdAt', {
        header: 'Created',
        cell: ({ row }) => new Date(row.original.$createdAt).toLocaleString(),
      }),
      columnHelper.accessor('$updatedAt', {
        header: 'Updated',
        cell: ({ row }) => new Date(row.original.$updatedAt).toLocaleString(),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Link
            to={ROUTE_PATHS.supportTicketPath(row.original.$id)}
            className="btn btn-light btn-icon btn-sm rounded d-inline-flex align-items-center justify-content-center"
          >
            <TbEye className="fs-lg" />
          </Link>
        ),
      })
    );

    return cols;
  }, [adminMode]);

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    enableColumnFilters: true,
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start = pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);

  const statusFilterVal = (table.getColumn('status')?.getFilterValue() as string) ?? '';

  return (
    <Row>
      <Col cols={12}>
        <Card>
          <CardHeader className="border-light justify-content-between flex-wrap gap-2">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <div className="app-search">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search…"
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
                <LuSearch className="app-search-icon text-muted" />
              </div>
              <Link to={newTicketTo} className="btn btn-primary btn-sm">
                New ticket
              </Link>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="me-1 fw-semibold d-none d-md-inline">Filter:</span>
              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={statusFilterVal}
                  onChange={(e) =>
                    table.getColumn('status')?.setFilterValue(e.target.value === '' ? undefined : e.target.value)
                  }
                >
                  <option value="">All statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="waiting">Waiting</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <LuShuffle className="app-search-icon text-muted" />
              </div>
              <div className="app-search">
                <select
                  className="form-select form-control my-1 my-md-0"
                  value={(table.getColumn('priority')?.getFilterValue() as string) ?? ''}
                  onChange={(e) =>
                    table.getColumn('priority')?.setFilterValue(e.target.value === '' ? undefined : e.target.value)
                  }
                >
                  <option value="">All priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <TbAlertTriangle className="app-search-icon text-muted" />
              </div>
              <select
                className="form-select form-control my-1 my-md-0"
                style={{ width: 'auto' }}
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
              >
                {[5, 8, 10, 15, 20].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>

          <DataTable<Ticket> table={table} emptyMessage="No tickets yet" />

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
        </Card>
      </Col>
    </Row>
  );
}
