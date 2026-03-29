import DataTable from '@/components/table/DataTable';
import TablePagination from '@/components/table/TablePagination';
import { ROUTE_PATHS } from '@/config/routePaths';
import { hasUpdate } from '@/domains/sites/installedMeta';
import type { WordPressPlugin, WordPressTheme } from '@/types';
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

const pluginHelper = createColumnHelper<WordPressPlugin>();
const themeHelper = createColumnHelper<WordPressTheme>();

type SiteInstalledPluginsTableProps = {
  siteId?: string;
  plugins: WordPressPlugin[];
  emptyMessage: string;
};

export function SiteInstalledPluginsTable({ siteId, plugins, emptyMessage }: SiteInstalledPluginsTableProps) {
  const data = useMemo(() => plugins, [plugins]);
  const columns = useMemo(
    () => [
      pluginHelper.accessor('name', {
        header: 'Name',
        cell: ({ getValue, row }) => {
          const name = String(getValue() || '—');
          const pluginPath = row.original.plugin;
          const inner = (
            <span className="fw-medium text-truncate d-inline-block align-middle" style={{ maxWidth: '18rem' }} title={name}>
              {name}
            </span>
          );
          if (siteId && pluginPath) {
            return (
              <Link
                to={ROUTE_PATHS.sitePluginDetailPath(siteId, pluginPath)}
                className="text-reset text-decoration-none"
              >
                {inner}
              </Link>
            );
          }
          return inner;
        },
      }),
      pluginHelper.accessor('version', {
        header: 'Version',
        cell: ({ getValue }) => <span className="fs-xs">{String(getValue() || '—')}</span>,
      }),
      pluginHelper.accessor('author', {
        header: 'Author',
        cell: ({ getValue }) => (
          <span className="fs-xs text-muted text-truncate d-inline-block" style={{ maxWidth: '14rem' }} title={String(getValue() || '')}>
            {String(getValue() || '—')}
          </span>
        ),
      }),
      pluginHelper.accessor('status', {
        header: 'Status',
        cell: ({ getValue }) => (
          <span className={`badge badge-soft-${getValue() === 'active' ? 'success' : 'secondary'} fs-xxs`}>
            {getValue() === 'active' ? 'Active' : 'Inactive'}
          </span>
        ),
      }),
      pluginHelper.display({
        id: 'update',
        header: 'Update',
        cell: ({ row }) =>
          hasUpdate(row.original) ? (
            <span className="badge badge-soft-warning fs-xxs">Available</span>
          ) : (
            <span className="text-muted fs-xs">—</span>
          ),
      }),
    ],
    [siteId],
  );

  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);

  return (
    <>
      <div className="table-responsive border rounded">
        <DataTable<WordPressPlugin> table={table} emptyMessage={emptyMessage} dashboardUniformRows />
      </div>
      {table.getRowModel().rows.length > 0 && (
        <div className="pt-3">
          <TablePagination
            totalItems={totalItems}
            start={start}
            end={end}
            itemsName="plugins"
            showInfo
            pageSize={pageSize}
            onPageSizeChange={(size) => table.setPageSize(size)}
            previousPage={table.previousPage}
            canPreviousPage={table.getCanPreviousPage()}
            pageCount={table.getPageCount()}
            pageIndex={pageIndex}
            setPageIndex={table.setPageIndex}
            nextPage={table.nextPage}
            canNextPage={table.getCanNextPage()}
          />
        </div>
      )}
    </>
  );
}

type SiteInstalledThemesTableProps = {
  siteId?: string;
  themes: WordPressTheme[];
  emptyMessage: string;
};

export function SiteInstalledThemesTable({ siteId, themes, emptyMessage }: SiteInstalledThemesTableProps) {
  const data = useMemo(() => themes, [themes]);
  const columns = useMemo(
    () => [
      themeHelper.accessor('name', {
        header: 'Name',
        cell: ({ getValue, row }) => {
          const name = String(getValue() || '—');
          const stylesheet = row.original.stylesheet;
          const inner = (
            <span className="fw-medium text-truncate d-inline-block align-middle" style={{ maxWidth: '18rem' }} title={name}>
              {name}
            </span>
          );
          if (siteId && stylesheet) {
            return (
              <Link
                to={ROUTE_PATHS.siteThemeDetailPath(siteId, stylesheet)}
                className="text-reset text-decoration-none"
              >
                {inner}
              </Link>
            );
          }
          return inner;
        },
      }),
      themeHelper.accessor('stylesheet', {
        header: 'Stylesheet',
        cell: ({ getValue }) => (
          <span className="fs-xs text-muted text-truncate d-inline-block font-monospace" style={{ maxWidth: '14rem' }} title={String(getValue() || '')}>
            {String(getValue() || '—')}
          </span>
        ),
      }),
      themeHelper.accessor('version', {
        header: 'Version',
        cell: ({ getValue }) => <span className="fs-xs">{String(getValue() || '—')}</span>,
      }),
      themeHelper.accessor('status', {
        header: 'Status',
        cell: ({ getValue }) => (
          <span className={`badge badge-soft-${getValue() === 'active' ? 'success' : 'secondary'} fs-xxs`}>
            {getValue() === 'active' ? 'Active' : 'Inactive'}
          </span>
        ),
      }),
      themeHelper.display({
        id: 'update',
        header: 'Update',
        cell: ({ row }) =>
          hasUpdate(row.original) ? (
            <span className="badge badge-soft-warning fs-xxs">Available</span>
          ) : (
            <span className="text-muted fs-xs">—</span>
          ),
      }),
    ],
    [siteId],
  );

  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);

  return (
    <>
      <div className="table-responsive border rounded">
        <DataTable<WordPressTheme> table={table} emptyMessage={emptyMessage} dashboardUniformRows />
      </div>
      {table.getRowModel().rows.length > 0 && (
        <div className="pt-3">
          <TablePagination
            totalItems={totalItems}
            start={start}
            end={end}
            itemsName="themes"
            showInfo
            pageSize={pageSize}
            onPageSizeChange={(size) => table.setPageSize(size)}
            previousPage={table.previousPage}
            canPreviousPage={table.getCanPreviousPage()}
            pageCount={table.getPageCount()}
            pageIndex={pageIndex}
            setPageIndex={table.setPageIndex}
            nextPage={table.nextPage}
            canNextPage={table.getCanNextPage()}
          />
        </div>
      )}
    </>
  );
}
