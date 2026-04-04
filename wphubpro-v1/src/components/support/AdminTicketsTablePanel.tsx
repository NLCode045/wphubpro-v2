/**
 * Admin helpdesk ticket table (reused on Admin tickets page and Admin support dashboard).
 */
import React, { useMemo } from 'react';
import { useNavigate, generatePath } from 'react-router-dom';
import Card from '@mui/material/Card';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import DataTable from 'examples/Tables/DataTable';
import { ROUTE_PATHS } from '../../config/routePaths';
import { useAdminTickets } from '../../domains/tickets';
import type { Ticket } from '../../types';

export type AdminTicketsTablePanelProps = {
  /** Section title + description */
  showHeader?: boolean;
  title?: string;
  subtitle?: string;
};

const AdminTicketsTablePanel: React.FC<AdminTicketsTablePanelProps> = ({
  showHeader = true,
  title = 'Tickets',
  subtitle = 'All helpdesk tickets across users.',
}) => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAdminTickets();

  const table = useMemo(() => {
    const rows = data?.tickets ?? [];

    const columns = [
      {
        Header: 'Subject',
        accessor: 'subject',
        width: '36%',
        Cell: ({ row }: { row: { original: Ticket } }) => (
          <SoftTypography
            variant="button"
            fontWeight="medium"
            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            onClick={() =>
              navigate(generatePath(ROUTE_PATHS.ADMIN_TICKET_DETAIL, { id: row.original.$id }))
            }
          >
            {row.original.subject}
          </SoftTypography>
        ),
      },
      {
        Header: 'Status',
        accessor: 'status',
        width: '14%',
      },
      {
        Header: 'Priority',
        accessor: 'priority',
        width: '12%',
      },
      {
        Header: 'User ID',
        accessor: 'userId',
        width: '22%',
        Cell: ({ row }: { row: { original: Ticket } }) => (
          <SoftTypography variant="caption" color="secondary" sx={{ fontFamily: 'monospace' }}>
            {row.original.userId.length > 18 ? `${row.original.userId.slice(0, 16)}…` : row.original.userId}
          </SoftTypography>
        ),
      },
      {
        Header: 'Updated',
        id: 'updated',
        width: '16%',
        Cell: ({ row }: { row: { original: Ticket } }) => (
          <SoftTypography variant="caption" color="secondary">
            {new Date(row.original.$updatedAt).toLocaleString()}
          </SoftTypography>
        ),
      },
    ];

    return { columns, rows };
  }, [data?.tickets, navigate]);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showHeader && (
        <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" p={3} pb={isLoading || isError || table.rows.length === 0 ? 1 : 0}>
          <SoftBox lineHeight={1}>
            <SoftTypography variant="h5" fontWeight="bold">
              {title}
            </SoftTypography>
            <SoftTypography variant="button" fontWeight="regular" color="text">
              {subtitle}
            </SoftTypography>
          </SoftBox>
        </SoftBox>
      )}

      {isLoading && (
        <SoftBox p={6} textAlign="center">
          <SoftTypography variant="button" color="secondary">
            Loading…
          </SoftTypography>
        </SoftBox>
      )}

      {isError && (
        <SoftBox p={4}>
          <SoftTypography variant="button" color="error">
            {error instanceof Error ? error.message : 'Could not load tickets.'}
          </SoftTypography>
        </SoftBox>
      )}

      {!isLoading && !isError && table.rows.length === 0 && (
        <SoftBox p={6} textAlign="center">
          <SoftTypography variant="button" color="secondary">
            No tickets yet.
          </SoftTypography>
        </SoftBox>
      )}

      {!isLoading && !isError && table.rows.length > 0 && (
        <SoftBox pt={showHeader ? 2 : 0} pr={2} pb={2} pl={1} sx={{ flex: 1, minHeight: 0 }}>
          <DataTable
            table={table}
            entriesPerPage={{ defaultValue: 10, entries: [5, 10, 15, 20, 25] }}
            canSearch
            headerColor="#4F5482"
            showTotalEntries
          />
        </SoftBox>
      )}
    </Card>
  );
};

export default AdminTicketsTablePanel;
