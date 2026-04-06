/**
 * Admin — Stripe payment intents
 */
import React, { useMemo } from 'react';
import Card from '@mui/material/Card';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import Footer from 'examples/Footer';
import { contentPageShellSx } from '../../theme/contentPaper';
import DataTable from 'examples/Tables/DataTable';
import { useAdminPaymentIntents } from '../../domains/admin/useAdminBilling';
import type { AdminPaymentIntentRow } from '../../types';

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

function formatCreated(ts: number) {
  return new Date(ts * 1000).toLocaleString();
}

const AdminOrdersPage: React.FC = () => {
  const { data, isLoading, isError, error } = useAdminPaymentIntents();

  const table = useMemo(() => {
    const rows = data?.paymentIntents ?? [];

    const columns = [
      {
        Header: 'Amount',
        id: 'amount',
        width: '14%',
        Cell: ({ row }: { row: { original: AdminPaymentIntentRow } }) => (
          <SoftTypography variant="caption">{formatMoney(row.original.amount, row.original.currency)}</SoftTypography>
        ),
      },
      {
        Header: 'Currency',
        accessor: 'currency',
        width: '10%',
      },
      {
        Header: 'Status',
        accessor: 'status',
        width: '12%',
      },
      {
        Header: 'Customer',
        id: 'customer',
        width: '22%',
        Cell: ({ row }: { row: { original: AdminPaymentIntentRow } }) => (
          <SoftTypography variant="caption">
            {row.original.customerEmail || row.original.customerId || '—'}
          </SoftTypography>
        ),
      },
      {
        Header: 'Created',
        id: 'created',
        width: '20%',
        Cell: ({ row }: { row: { original: AdminPaymentIntentRow } }) => (
          <SoftTypography variant="caption" color="secondary">
            {formatCreated(row.original.created)}
          </SoftTypography>
        ),
      },
      {
        Header: 'Payment intent ID',
        accessor: 'id',
        width: '22%',
        Cell: ({ row }: { row: { original: AdminPaymentIntentRow } }) => (
          <SoftTypography variant="caption" color="secondary" sx={{ fontFamily: 'monospace' }}>
            {row.original.id.length > 28 ? `${row.original.id.slice(0, 22)}…` : row.original.id}
          </SoftTypography>
        ),
      },
    ];

    return { columns, rows };
  }, [data?.paymentIntents]);

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <Card>
          <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" p={3}>
            <SoftBox lineHeight={1}>
              <SoftTypography variant="h5" fontWeight="bold">
                Orders
              </SoftTypography>
              <SoftTypography variant="button" fontWeight="regular" color="text">
                Recent Stripe payment intents.
              </SoftTypography>
            </SoftBox>
          </SoftBox>

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
                {error instanceof Error ? error.message : 'Could not load payment intents.'}
              </SoftTypography>
            </SoftBox>
          )}

          {!isLoading && !isError && table.rows.length === 0 && (
            <SoftBox p={6} textAlign="center">
              <SoftTypography variant="button" color="secondary">
                No payment intents found.
              </SoftTypography>
            </SoftBox>
          )}

          {!isLoading && !isError && table.rows.length > 0 && (
            <SoftBox pt={2} pr={2} pb={2} pl={1}>
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
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AdminOrdersPage;
