import DataTable from '@/components/table/DataTable';
import TablePagination from '@/components/table/TablePagination';
import { libraryCategoriesForLibraryItemRow, type LibraryDashboardRow } from '@/domains/library';
import { usePatchLibraryItem } from '@/hooks/useLibrary';
import type { LibraryCategory } from '@/types';
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
} from '@tanstack/react-table';
import { ROUTE_PATHS } from '@/config/routePaths';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router';
import { TbCopy, TbDotsVertical, TbStar, TbStarFilled } from 'react-icons/tb';
import LibraryCategoryGroupedSelect from './LibraryCategoryGroupedSelect';
import type { LibraryViewMode } from './ViewModeToggle';

const libraryGlobalFilterFn: FilterFn<LibraryDashboardRow> = () => true;

const columnHelper = createColumnHelper<LibraryDashboardRow>();

type LibraryTableMeta = { patchPending: boolean };

type LibraryItemsSectionProps = {
  rows: LibraryDashboardRow[];
  view: LibraryViewMode;
  categories?: LibraryCategory[];
};

const LibraryItemsSection = ({ rows, view, categories = [] }: LibraryItemsSectionProps) => {
  const patchMutation = usePatchLibraryItem();

  const columns = useMemo(() => {
    return [
      columnHelper.display({
        id: 'favourite',
        header: '',
        enableSorting: false,
        cell: ({ row, table }) => {
          const r = row.original;
          const fav = r.isFavourite;
          const patchPending = (table.options.meta as LibraryTableMeta | undefined)?.patchPending ?? false;
          return (
            <button
              type="button"
              className="btn btn-link p-0 text-warning"
              aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
              disabled={patchPending}
              onClick={() => {
                patchMutation.mutate({
                  itemId: r.libraryDocumentId,
                  isFavourite: !fav,
                });
              }}
            >
              {fav ? <TbStarFilled className="fs-lg" /> : <TbStar className="fs-lg text-muted" />}
            </button>
          );
        },
      }),
      columnHelper.accessor('kind', {
        header: 'Type',
        enableColumnFilter: false,
        cell: ({ getValue }) => (
          <span className="fs-xs text-muted">{getValue() === 'plugin' ? 'Plugin' : 'Theme'}</span>
        ),
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ getValue, row }) => {
          const r = row.original;
          const to = ROUTE_PATHS.libraryItemDetailPath(r.kind, r.routeSlug);
          return (
            <Link
              to={to}
              className="fw-medium text-truncate d-inline-block align-middle text-reset text-decoration-none"
              style={{ maxWidth: '18rem' }}
              title={String(getValue() || '')}
            >
              {String(getValue() || '—')}
            </Link>
          );
        },
        enableColumnFilter: false,
      }),
      columnHelper.display({
        id: 'category',
        header: 'Category',
        enableSorting: false,
        cell: ({ row, table }) => {
          const r = row.original;
          const rowCategories = libraryCategoriesForLibraryItemRow(r, categories);
          const patchPending = (table.options.meta as LibraryTableMeta | undefined)?.patchPending ?? false;
          return (
            <LibraryCategoryGroupedSelect
              categories={rowCategories}
              value={r.categoryId}
              onChange={(categoryId) =>
                patchMutation.mutate({
                  itemId: r.libraryDocumentId,
                  categoryId,
                })
              }
              disabled={patchPending}
              aria-label="Category"
              noneOptionLabel="—"
              noneGroupLabel="No category"
              size="sm"
              className="w-auto max-w-100"
              minWidth="10rem"
            />
          );
        },
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
          <span
            className="fs-xs text-muted text-truncate d-inline-block"
            style={{ maxWidth: '14rem' }}
            title={String(getValue())}
          >
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
    ];
  }, [categories]);

  const data = useMemo(() => rows, [rows]);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: '', columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: libraryGlobalFilterFn,
    enableColumnFilters: true,
    autoResetPageIndex: false,
    meta: { patchPending: patchMutation.isPending } satisfies LibraryTableMeta,
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalItems = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  useEffect(() => {
    if (pageCount < 1) return;
    const lastIndex = pageCount - 1;
    if (pageIndex > lastIndex) {
      table.setPageIndex(lastIndex);
    }
  }, [pageCount, pageIndex, table]);
  const start = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);

  if (view === 'grid') {
    return (
      <>
        {rows.length === 0 ? (
          <p className="text-muted text-center py-5 mb-0">No library items match your filters.</p>
        ) : (
          <Row className="g-3">
            {rows.map((r) => {
              const rowCategories = libraryCategoriesForLibraryItemRow(r, categories);
              return (
              <Col key={r.id} xs={12} sm={6} xl={4}>
                <Card className="h-100 shadow-sm">
                  <CardBody>
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <span className="badge badge-soft-primary fs-xxs">{r.kind === 'plugin' ? 'Plugin' : 'Theme'}</span>
                      <div className="d-flex align-items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-link p-0 text-warning"
                          aria-label="Favourite"
                          onClick={() =>
                            patchMutation.mutate({
                              itemId: r.libraryDocumentId,
                              isFavourite: !r.isFavourite,
                            })
                          }
                        >
                          {r.isFavourite ? <TbStarFilled className="fs-lg" /> : <TbStar className="fs-lg text-muted" />}
                        </button>
                        <Dropdown align="end">
                          <DropdownToggle variant="link" className="drop-arrow-none link-reset text-muted p-0 fs-lg">
                            <TbDotsVertical />
                          </DropdownToggle>
                          <DropdownMenu>
                            <DropdownItem as={Link} to={ROUTE_PATHS.libraryItemDetailPath(r.kind, r.routeSlug)}>
                              View details
                            </DropdownItem>
                            <DropdownItem onClick={() => void navigator.clipboard?.writeText(r.name)}>
                              <TbCopy className="me-1 align-middle" /> Copy name
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </div>
                    <h6 className="mb-2 text-truncate" title={r.name}>
                      <Link
                        to={ROUTE_PATHS.libraryItemDetailPath(r.kind, r.routeSlug)}
                        className="text-reset text-decoration-none"
                      >
                        {r.name}
                      </Link>
                    </h6>
                    <LibraryCategoryGroupedSelect
                      categories={rowCategories}
                      value={r.categoryId}
                      onChange={(categoryId) =>
                        patchMutation.mutate({
                          itemId: r.libraryDocumentId,
                          categoryId,
                        })
                      }
                      disabled={patchMutation.isPending}
                      aria-label="Category"
                      placeholder="Category…"
                      noneOptionLabel="—"
                      noneGroupLabel="No category"
                      size="sm"
                      className="mb-2 w-100"
                    />
                    <p className="text-muted fs-xs mb-2">
                      <span className="fw-semibold text-body">Version:</span> {r.versionLabel}
                    </p>
                    <p className="text-muted fs-xs mb-2">
                      <span className="fw-semibold text-body">Author:</span> {r.author}
                    </p>
                    {r.tags.length > 0 && (
                      <div className="d-flex flex-wrap gap-1">
                        {r.tags.map((t) => (
                          <span key={t} className="badge badge-soft-secondary fs-xxs">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Col>
            );
            })}
          </Row>
        )}
        {patchMutation.isPending && (
          <div className="position-fixed bottom-0 end-0 p-3">
            <Spinner size="sm" />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="table-responsive border rounded">
        <DataTable<LibraryDashboardRow>
          table={table}
          emptyMessage="No library items match your filters."
          dashboardUniformRows
        />
      </div>

      {table.getRowModel().rows.length > 0 && (
        <div className="pt-3">
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
        </div>
      )}
    </>
  );
};

export default LibraryItemsSection;
