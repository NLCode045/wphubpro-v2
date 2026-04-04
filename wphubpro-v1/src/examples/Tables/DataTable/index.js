/**
=========================================================
* Soft UI Dashboard PRO React - v4.0.3
=========================================================

* Product Page: https://www.creative-tim.com/product/soft-ui-dashboard-pro-react
* Copyright 2024 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useMemo, useEffect, useState, useRef, useCallback } from "react";

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// react-table components
import { useTable, usePagination, useGlobalFilter, useSortBy } from "react-table";

// @mui material components
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftPagination from "components/SoftPagination";

// Soft UI Dashboard PRO React example components
import DataTableHeadCell from "examples/Tables/DataTable/DataTableHeadCell";
import DataTableBodyCell from "examples/Tables/DataTable/DataTableBodyCell";


function DataTable({
  entriesPerPage = { defaultValue: 10, entries: [5, 10, 15, 20, 25] },
  canSearch = false,
  showTotalEntries = true,
  table,
  pagination = { variant: "gradient", color: "info" },
  isSorted = true,
  noEndBorder = false,
  headerColor,
}) {
  const defaultValue = entriesPerPage.defaultValue ? entriesPerPage.defaultValue : 10;
  const entries = entriesPerPage.entries ? entriesPerPage.entries : [5, 10, 15, 20, 25];
  const columns = useMemo(() => table.columns, [table]);
  const data = useMemo(() => table.rows, [table]);

  const tableInstance = useTable(
    { columns, data, initialState: { pageIndex: 0 } },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    rows,
    page,
    pageOptions,
    canPreviousPage,
    canNextPage,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    setGlobalFilter,
    state: { pageIndex, pageSize, globalFilter },
  } = tableInstance;

  // Set the default value for the entries per page when component mounts / defaultValue changes
  useEffect(() => setPageSize(defaultValue || 10), [defaultValue, setPageSize]);

  // Render the paginations
  const renderPagination = pageOptions.map((option) => (
    <SoftPagination
      item
      key={option}
      onClick={() => gotoPage(Number(option))}
      active={pageIndex === option}
    >
      {option + 1}
    </SoftPagination>
  ));

  // Handler for the input to set the pagination index
  const handleInputPagination = ({ target: { value } }) =>
    value > pageOptions.length || value < 0 ? gotoPage(0) : gotoPage(Number(value));

  // Customized page options starting from 1
  const customizedPageOptions = pageOptions.map((option) => option + 1);

  // Setting value for the pagination input
  const handleInputPaginationValue = ({ target: value }) => gotoPage(Number(value.value - 1));

  // Search input value state
  const [search, setSearch] = useState(globalFilter);

  // Debounced search (avoids regeneratorRuntime dependency from useAsyncDebounce)
  const debounceRef = useRef(null);
  const onSearchChange = useCallback(
    (value) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setGlobalFilter(value || undefined);
      }, 100);
    },
    [setGlobalFilter]
  );

  // A function that sets the sorted value for the table
  const setSortedValue = (column) => {
    if (column.disableSortBy || !isSorted) return false;

    if (column.isSorted) {
      return column.isSortedDesc ? "desc" : "asce";
    }
    return "none";
  };

  // Setting the entries starting point
  const entriesStart = pageIndex === 0 ? pageIndex + 1 : pageIndex * pageSize + 1;

  // Setting the entries ending point
  let entriesEnd;

  if (pageIndex === 0) {
    entriesEnd = pageSize;
  } else if (pageIndex === pageOptions.length - 1) {
    entriesEnd = rows.length;
  } else {
    entriesEnd = pageSize * (pageIndex + 1);
  }

  return (
    <TableContainer sx={{ boxShadow: "none" }}>
      <Table {...getTableProps()}>
        <SoftBox component="thead" sx={{ "& tr th": { pt: 2 } }}>
          {headerGroups.map((headerGroup) => {
            const { key: headerKey, ...headerGroupProps } = headerGroup.getHeaderGroupProps();
            return (
              <TableRow key={headerKey} {...headerGroupProps}>
                {headerGroup.headers.map((column, colIndex) => {
                  const { key: columnKey, ...headerProps } = column.getHeaderProps(
                    isSorted && !column.disableSortBy && column.getSortByToggleProps()
                  );
                  return (
                    <DataTableHeadCell
                      key={columnKey}
                      {...headerProps}
                      width={column.width ? column.width : "auto"}
                      align={column.align ? column.align : "left"}
                      sorted={setSortedValue(column)}
                      color={headerColor}
                      pl={colIndex === 0 ? 5 : undefined}
                    >
                      {column.render("Header")}
                    </DataTableHeadCell>
                  );
                })}
              </TableRow>
            );
          })}
        </SoftBox>
        <TableBody {...getTableBodyProps()}>
          {page.map((row, rowIndex) => {
            prepareRow(row);
            const { key: rowKey, ...rowProps } = row.getRowProps();
            return (
              <TableRow key={rowKey} {...rowProps}>
                {row.cells.map((cell) => {
                  const { key: cellKey, ...cellProps } = cell.getCellProps();
                  return (
                    <DataTableBodyCell
                      key={cellKey}
                      noBorder={noEndBorder && rows.length - 1 === rowIndex}
                      align={cell.column.align ? cell.column.align : "left"}
                      {...cellProps}
                    >
                      {cell.render("Cell")}
                    </DataTableBodyCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <SoftBox
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        flexWrap="wrap"
        gap={2}
        p={!showTotalEntries && !canSearch && pageOptions.length === 1 && !(entriesPerPage && entriesPerPage.showSelector !== false) ? 0 : 3}
      >
        {showTotalEntries && (
          <SoftBox>
            <SoftTypography variant="button" color="secondary" fontWeight="regular">
              Showing {entriesStart} to {entriesEnd} of {rows.length} entries
            </SoftTypography>
          </SoftBox>
        )}
        <SoftBox
          display="flex"
          alignItems="center"
          gap={1.5}
          flexWrap="wrap"
          ml={{ xs: 0, sm: "auto" }}
          justifyContent={{ xs: "flex-start", sm: "flex-end" }}
        >
          {entriesPerPage && entriesPerPage.showSelector !== false && (
            <SoftBox display="flex" alignItems="center" gap={0.5} sx={{ width: { xs: "100%", sm: "auto" }, minWidth: "4.25rem", maxWidth: "5.5rem" }}>
              {/* No FormControl wrapper: FormControl + Select can loop (InputBase onEmpty/onFilled vs unstable context). */}
              <Select
                size="small"
                value={pageSize ?? defaultValue ?? 10}
                onChange={(e) => setPageSize(Number(e.target.value))}
                sx={{
                  minWidth: 72,
                  height: 32,
                  fontSize: "0.875rem",
                  "& .MuiSelect-select": { py: 0.5, display: "flex", alignItems: "center" },
                }}
              >
                {entries.map((entry) => (
                  <MenuItem key={entry} value={entry}>
                    {entry}
                  </MenuItem>
                ))}
              </Select>
              <SoftTypography variant="caption" color="secondary" sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                / page
              </SoftTypography>
            </SoftBox>
          )}
          {canSearch && (
            <SoftBox width="12rem" sx={{ minWidth: "10rem" }}>
              <SoftInput
                placeholder="Search..."
                value={search}
                onChange={({ currentTarget }) => {
                  setSearch(currentTarget.value);
                  onSearchChange(currentTarget.value);
                }}
              />
            </SoftBox>
          )}
          {pageOptions.length > 1 && (
          <SoftPagination
            variant={pagination.variant ? pagination.variant : "gradient"}
            color={pagination.color ? pagination.color : "info"}
          >
            {canPreviousPage && (
              <SoftPagination item onClick={() => previousPage()}>
                <Icon sx={{ fontWeight: "bold" }}>chevron_left</Icon>
              </SoftPagination>
            )}
            {renderPagination.length > 6 ? (
              <SoftBox width="5rem" mx={1}>
                <SoftInput
                  inputProps={{ type: "number", min: 1, max: customizedPageOptions.length }}
                  value={customizedPageOptions[pageIndex]}
                  onChange={(handleInputPagination, handleInputPaginationValue)}
                />
              </SoftBox>
            ) : (
              renderPagination
            )}
            {canNextPage && (
              <SoftPagination item onClick={() => nextPage()}>
                <Icon sx={{ fontWeight: "bold" }}>chevron_right</Icon>
              </SoftPagination>
            )}
          </SoftPagination>
          )}
        </SoftBox>
      </SoftBox>
    </TableContainer>
  );
}


// Typechecking props for the DataTable
DataTable.propTypes = {
  entriesPerPage: PropTypes.oneOfType([
    PropTypes.shape({
      defaultValue: PropTypes.number,
      entries: PropTypes.arrayOf(PropTypes.number),
    }),
    PropTypes.bool,
  ]),
  canSearch: PropTypes.bool,
  showTotalEntries: PropTypes.bool,
  table: PropTypes.objectOf(PropTypes.array).isRequired,
  pagination: PropTypes.shape({
    variant: PropTypes.oneOf(["contained", "gradient"]),
    color: PropTypes.oneOf([
      "primary",
      "secondary",
      "info",
      "success",
      "warning",
      "error",
      "dark",
      "light",
    ]),
  }),
  isSorted: PropTypes.bool,
  noEndBorder: PropTypes.bool,
};

export default DataTable;
