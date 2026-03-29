

import { flexRender, type Table as TableType } from '@tanstack/react-table'
import clsx from 'clsx'
import { Table } from 'react-bootstrap'
import { TbArrowDown, TbArrowUp } from 'react-icons/tb'

type DataTableProps<TData> = {
  /**
   * The table instance from useReactTable
   */
  table: TableType<TData>
  /**
   * When set, clicking a body row navigates or runs an action. Clicks on links, buttons,
   * form controls, or elements inside `[data-row-click-ignore]` do not trigger this.
   */
  onRowClick?: (row: TData) => void
  /**
   * Optional class name for the table container
   */
  className?: string
  /**
   * Adds `table-dashboard-rows` for consistent row height / vertical alignment (dashboard tables).
   */
  dashboardUniformRows?: boolean
  /**
   * Optional message to display when no data is available
   * @default 'Nothing found.'
   */
  emptyMessage?: React.ReactNode

  /**
   * Optional boolean to display headers
   * @default true
   */
  showHeaders?: boolean
}

const DataTable = <TData,>({
  table,
  className = '',
  emptyMessage = 'Nothing found.',
  showHeaders = true,
  dashboardUniformRows = false,
  onRowClick,
}: DataTableProps<TData>) => {
  const columns = table.getAllColumns()

  return (
    <div className={clsx('table-responsive', className)}>
      <Table
        responsive
        hover
        className={clsx(
          'table table-custom table-centered table-select w-100 mb-0',
          dashboardUniformRows && 'table-dashboard-rows',
        )}
      >
        {showHeaders && (
          <thead className="bg-light align-middle bg-opacity-25 thead-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="text-uppercase fs-xxs">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}>
                    <div className="d-flex align-items-center">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() &&
                        ({
                          asc: <TbArrowUp className="ms-1" />,
                          desc: <TbArrowDown className="ms-1" />,
                        }[header.column.getIsSorted() as string] ??
                          null)}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
        )}
        <tbody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={clsx(onRowClick && 'cursor-pointer')}
                onClick={(e) => {
                  if (!onRowClick) return;
                  const el = e.target as HTMLElement;
                  if (el.closest('a, button, input, select, textarea, label, [data-row-click-ignore]')) return;
                  onRowClick(row.original);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="text-center py-3 text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  )
}

export default DataTable
