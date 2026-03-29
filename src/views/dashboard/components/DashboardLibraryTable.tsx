import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import ComponentCard from '@/components/cards/ComponentCard'
import { ROUTE_PATHS } from '@/config/routePaths'
import type { LibraryDashboardRow } from '@/domains/library'
import {
  createColumnHelper,
  type ColumnFiltersState,
  type FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CardFooter, CardHeader, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { LuSearch, LuTag } from 'react-icons/lu'
import { TbCopy, TbDotsVertical } from 'react-icons/tb'
const libraryGlobalFilterFn: FilterFn<LibraryDashboardRow> = (row, _columnId, filterValue) => {
  const q = String(filterValue ?? '')
    .trim()
    .toLowerCase();
  if (!q) return true;
  const r = row.original;
  return (
    r.name.toLowerCase().includes(q) ||
    r.tags.some((t) => t.toLowerCase().includes(q)) ||
    r.versionLabel.toLowerCase().includes(q) ||
    r.author.toLowerCase().includes(q) ||
    r.kind.toLowerCase().includes(q)
  );
};

const columnHelper = createColumnHelper<LibraryDashboardRow>();

type DashboardLibraryTableProps = {
  rows: LibraryDashboardRow[];
  /** When true, omit outer card chrome (for use inside a tabbed card). */
  embedded?: boolean;
};

const DashboardLibraryTable = ({ rows, embedded = false }: DashboardLibraryTableProps) => {
  const data = useMemo(() => rows, [rows]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('kind', {
        header: 'Type',
        filterFn: 'equalsString',
        cell: ({ getValue }) => (
          <span className="fs-xs text-muted">{getValue() === 'plugin' ? 'Plugin' : 'Theme'}</span>
        ),
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ getValue, row }) => {
          const r = row.original
          return (
            <Link
              to={ROUTE_PATHS.libraryItemDetailPath(r.kind, r.routeSlug)}
              className="fw-medium text-truncate d-inline-block align-middle text-reset text-decoration-none"
              style={{ maxWidth: '6.5rem' }}
              title={String(getValue() || '')}
            >
              {String(getValue() || '—')}
            </Link>
          )
        },
        enableColumnFilter: false,
      }),
      columnHelper.accessor('tags', {
        header: 'Tags',
        sortingFn: (a, b) => {
          const ta = a.original.tags.join(', ');
          const tb = b.original.tags.join(', ');
          return ta.localeCompare(tb, undefined, { sensitivity: 'base' });
        },
        cell: ({ row }) =>
          row.original.tags.length === 0 ? (
            <span className="text-muted fs-xs">—</span>
          ) : (
            <span className="d-flex flex-wrap gap-1">
              {row.original.tags.map((t) => (
                <span key={t} className="badge badge-soft-secondary fs-xxs">
                  {t}
                </span>
              ))}
            </span>
          ),
        enableColumnFilter: false,
      }),
      columnHelper.accessor('versionLabel', {
        header: 'Version',
        enableColumnFilter: false,
      }),
      columnHelper.accessor('author', {
        header: 'Author',
        cell: ({ getValue }) => (
          <span className="fs-xs text-muted text-truncate d-inline-block" style={{ maxWidth: '12rem' }} title={String(getValue())}>
            {String(getValue() || '—')}
          </span>
        ),
        enableColumnFilter: false,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="text-end">
              <Dropdown align="end">
                <DropdownToggle variant="link" className="drop-arrow-none fs-xxl link-reset text-muted p-0">
                  <TbDotsVertical />
                </DropdownToggle>
                <DropdownMenu>
                  <DropdownItem as={Link} to={ROUTE_PATHS.libraryItemDetailPath(r.kind, r.routeSlug)}>
                    View details
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      void navigator.clipboard?.writeText(r.name);
                    }}
                  >
                    <TbCopy className="me-1 align-middle" /> Copy name
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          );
        },
      }),
    ],
    []
  );

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

  const table = useReactTable({
    data,
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
    globalFilterFn: libraryGlobalFilterFn,
    enableColumnFilters: true,
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);

  const tableBlock = (
    <>
      <CardHeader className="border-light flex-shrink-0">
        <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3 w-100">
          <div className="app-search flex-grow-1" style={{ minWidth: '10rem', maxWidth: '22rem' }}>
            <input
              type="search"
              className="form-control"
              placeholder="Search name, tags, version…"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              aria-label="Search library"
            />
            <LuSearch className="app-search-icon text-muted" />
          </div>

          <span className="me-1 fw-semibold d-none d-md-inline text-muted small">Filter</span>

          <div className="app-search">
            <select
              className="form-select form-control"
              aria-label="Filter by type"
              value={(table.getColumn('kind')?.getFilterValue() as string | undefined) ?? 'All'}
              onChange={(e) =>
                table.getColumn('kind')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)
              }
            >
              <option value="All">Type</option>
              <option value="plugin">Plugin</option>
              <option value="theme">Theme</option>
            </select>
            <LuTag className="app-search-icon text-muted" />
          </div>
        </div>
      </CardHeader>

      <div className="flex-grow-1 min-h-0 overflow-auto">
        <DataTable<LibraryDashboardRow>
          table={table}
          emptyMessage="No library items match your filters."
          dashboardUniformRows
        />
      </div>

      {table.getRowModel().rows.length > 0 && (
        <CardFooter className="border-0 flex-shrink-0">
          <TablePagination
            totalItems={totalItems}
            start={start}
            end={end}
            itemsName="items"
            showInfo
            pageSize={table.getState().pagination.pageSize}
            onPageSizeChange={(size) => table.setPageSize(size)}
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
    </>
  );

  if (embedded) {
    return <div className="d-flex flex-column flex-grow-1 min-h-0 h-100 w-100">{tableBlock}</div>;
  }

  return (
    <ComponentCard
      fillColumnHeight
      title="Library items"
      titleExtra={<span className="badge badge-label badge-soft-secondary fs-xxs">{rows.length} total</span>}
      bodyClassName="p-0"
    >
      {tableBlock}
    </ComponentCard>
  );
};

export default DashboardLibraryTable;
