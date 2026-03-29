import DataTable from '@/components/table/DataTable'
import TablePagination from '@/components/table/TablePagination'
import ComponentCard from '@/components/cards/ComponentCard'
import { ROUTE_PATHS } from '@/config/routePaths'
import { hasUpdate, parsePluginsMeta, parseThemesMeta } from '@/domains/sites'
import type { Site } from '@/types'
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
import { Link, useNavigate } from 'react-router'
import {
  CardFooter,
  CardHeader,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap'
import SiteHealthScoreDonut from '@/views/sites/detail/SiteHealthScoreDonut.tsx'
import { LuHeart, LuSearch, LuTag } from 'react-icons/lu'
import { MdFlashOff, MdFlashOn } from 'react-icons/md'
import { TbDotsVertical, TbExternalLink, TbListDetails } from 'react-icons/tb'

/** Matches wphubpro `SitesTableCells` StatusIcon — Material `flash_on` / `flash_off`, orange when connected */
const CONNECTED_FLASH_COLOR = '#ea580c';

function connectionTooltip(site: Site): string {
  const isConnected = site.status === 'connected';
  const base = isConnected ? 'Connected' : 'Disconnected';
  const hb = site.connectionStatus?.heartbeatUpdatedAt;
  if (!hb) return base;
  try {
    const d = new Date(hb);
    if (Number.isNaN(d.getTime())) return base;
    return `${base} · Heartbeat: ${d.toLocaleString()}`;
  } catch {
    return base;
  }
}

function ConnectionFlashIcon({ site }: { site: Site }) {
  const isConnected = site.status === 'connected';
  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id={`conn-${site.$id}`}>{connectionTooltip(site)}</Tooltip>}
    >
      <span className="d-inline-flex align-items-center" style={{ lineHeight: 0 }}>
        {isConnected ? (
          <MdFlashOn
            aria-hidden
            style={{
              fontSize: '1.5rem',
              color: CONNECTED_FLASH_COLOR,
            }}
          />
        ) : (
          <MdFlashOff aria-hidden style={{ fontSize: '1.5rem', color: '#9e9e9e' }} />
        )}
      </span>
    </OverlayTrigger>
  );
}

function availableUpdateCounts(site: Site): { plugins: number; themes: number } {
  const plugins = parsePluginsMeta(site.pluginsMeta).filter(hasUpdate).length;
  const themes = parseThemesMeta(site.themesMeta).filter(hasUpdate).length;
  return { plugins, themes };
}

const siteGlobalFilterFn: FilterFn<Site> = (row, _columnId, filterValue) => {
  const q = String(filterValue ?? '').trim().toLowerCase();
  if (!q) return true;
  const s = row.original;
  return (
    String(s.siteName ?? '')
      .toLowerCase()
      .includes(q) ||
    String(s.siteUrl ?? '')
      .toLowerCase()
      .includes(q) ||
    String(s.status ?? '')
      .toLowerCase()
      .includes(q) ||
    String(s.healthStatus ?? '')
      .toLowerCase()
      .includes(q)
  );
};

const columnHelper = createColumnHelper<Site>();

type DashboardSitesTableProps = {
  sites: Site[];
  /** Rows per page on first render (dashboard uses 5; full Sites page uses 10). */
  initialPageSize?: number;
  /** When true, omit outer card chrome (for use inside a tabbed card). */
  embedded?: boolean;
};

const DashboardSitesTable = ({ sites, initialPageSize = 5, embedded = false }: DashboardSitesTableProps) => {
  const navigate = useNavigate();
  const data = useMemo(() => sites, [sites]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('siteName', {
        header: 'SITE',
        cell: ({ getValue }) => <span className="fw-medium">{String(getValue() || '—')}</span>,
        enableColumnFilter: false,
      }),
      columnHelper.accessor('siteUrl', {
        header: 'URL',
        cell: ({ getValue }) => {
          const url = String(getValue() || '');
          return (
            <span className="text-truncate d-inline-block" style={{ maxWidth: '16rem' }} title={url}>
              {url || '—'}
            </span>
          );
        },
        enableColumnFilter: false,
      }),
      columnHelper.accessor('status', {
        header: 'Connection',
        filterFn: 'equalsString',
        enableColumnFilter: true,
        cell: ({ row }) => <ConnectionFlashIcon site={row.original} />,
      }),
      columnHelper.accessor(
        (row) => {
          const { plugins, themes } = availableUpdateCounts(row);
          return plugins + themes;
        },
        {
          id: 'availableUpdates',
          header: 'AVAILABLE UPDATES',
          cell: ({ row }) => {
            const { plugins, themes } = availableUpdateCounts(row.original);
            return (
              <span className="fs-xs text-muted">
                plugin: {plugins} theme: {themes}
              </span>
            );
          },
          enableColumnFilter: false,
        },
      ),
      columnHelper.accessor('healthStatus', {
        header: 'HEALTH',
        filterFn: 'equalsString',
        enableColumnFilter: true,
        cell: ({ row }) => (
          <div className="d-flex justify-content-center align-items-center">
            <SiteHealthScoreDonut
              site={row.original}
              size={42}
              ringColor={CONNECTED_FLASH_COLOR}
              surface="light"
            />
          </div>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        enableSorting: false,
        cell: ({ row }) => {
          const site = row.original;
          return (
            <div className="text-end" data-row-click-ignore onClick={(e) => e.stopPropagation()}>
              <Dropdown align="end">
                <DropdownToggle variant="link" className="drop-arrow-none fs-xxl link-reset text-muted p-0">
                  <TbDotsVertical />
                </DropdownToggle>
                <DropdownMenu>
                  <DropdownItem as={Link} to={ROUTE_PATHS.siteDetailPath(site.$id)}>
                    <TbListDetails className="me-1 align-middle" /> Site details
                  </DropdownItem>
                  {site.siteUrl ? (
                    <DropdownItem as="a" href={site.siteUrl} target="_blank" rel="noopener noreferrer">
                      <TbExternalLink className="me-1 align-middle" /> Open site
                    </DropdownItem>
                  ) : (
                    <DropdownItem disabled>Open site</DropdownItem>
                  )}
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: initialPageSize });

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
    globalFilterFn: siteGlobalFilterFn,
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
              placeholder="Search name or URL…"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              aria-label="Search sites"
            />
            <LuSearch className="app-search-icon text-muted" />
          </div>

          <span className="me-1 fw-semibold d-none d-md-inline text-muted small">Filter</span>

          <div className="app-search">
            <select
              className="form-select form-control"
              aria-label="Filter by connection"
              value={(table.getColumn('status')?.getFilterValue() as string | undefined) ?? 'All'}
              onChange={(e) =>
                table.getColumn('status')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)
              }
            >
              <option value="All">Connection</option>
              <option value="connected">Connected</option>
              <option value="disconnected">Disconnected</option>
            </select>
            <LuTag className="app-search-icon text-muted" />
          </div>

          <div className="app-search">
            <select
              className="form-select form-control"
              aria-label="Filter by health"
              value={(table.getColumn('healthStatus')?.getFilterValue() as string | undefined) ?? 'All'}
              onChange={(e) =>
                table.getColumn('healthStatus')?.setFilterValue(e.target.value === 'All' ? undefined : e.target.value)
              }
            >
              <option value="All">Health</option>
              <option value="healthy">Healthy</option>
              <option value="bad">Needs attention</option>
            </select>
            <LuHeart className="app-search-icon text-muted" />
          </div>
        </div>
      </CardHeader>

      <div className="flex-grow-1 min-h-0 overflow-auto">
        <DataTable<Site>
          table={table}
          emptyMessage="No sites match your filters."
          dashboardUniformRows
          onRowClick={(site) => navigate(ROUTE_PATHS.siteDetailPath(site.$id))}
        />
      </div>

      {table.getRowModel().rows.length > 0 && (
        <CardFooter className="border-0 flex-shrink-0">
          <TablePagination
            totalItems={totalItems}
            start={start}
            end={end}
            itemsName="sites"
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
      title="Sites"
      titleExtra={<span className="badge badge-label badge-soft-secondary fs-xxs">{sites.length} total</span>}
      bodyClassName="p-0"
    >
      {tableBlock}
    </ComponentCard>
  );
};

export default DashboardSitesTable;
