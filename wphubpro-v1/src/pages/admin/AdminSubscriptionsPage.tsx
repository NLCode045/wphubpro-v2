/**
 * Admin — all Stripe subscriptions (table layout aligned with Sites / DataTable)
 */
import React, { useMemo } from 'react';
import { useNavigate, generatePath } from 'react-router-dom';
import Card from '@mui/material/Card';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import Footer from 'examples/Footer';
import { contentPageShellSx } from '../../theme/contentPaper';
import DataTable from 'examples/Tables/DataTable';
import { ROUTE_PATHS } from '../../config/routePaths';
import { useAdminSubscriptions } from '../../domains/admin/useAdminBilling';
import type { AdminSubscriptionRow } from '../../types';

function formatPeriodEnd(ts: number) {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const AdminSubscriptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAdminSubscriptions();

  const table = useMemo(() => {
    const rows = (data?.subscriptions ?? []).map((s: AdminSubscriptionRow) => ({
      ...s,
      _userLabel: s.appwriteUser?.email || s.customerEmail || '—',
    }));

    const columns = [
      {
        Header: 'Plan',
        accessor: 'planLabel',
        width: '22%',
        Cell: ({ row }: { row: { original: AdminSubscriptionRow & { _userLabel: string } } }) => {
          const r = row.original;
          return (
            <SoftTypography
              variant="button"
              fontWeight="medium"
              sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              onClick={() =>
                navigate(
                  generatePath(ROUTE_PATHS.ADMIN_SUBSCRIPTION_DETAIL, { subscriptionId: r.subscriptionId })
                )
              }
            >
              {r.planLabel}
            </SoftTypography>
          );
        },
      },
      {
        Header: 'User / customer',
        accessor: '_userLabel',
        width: '26%',
      },
      {
        Header: 'Status',
        accessor: 'status',
        width: '12%',
      },
      {
        Header: 'Renews / ends',
        id: 'period',
        width: '18%',
        Cell: ({ row }: { row: { original: AdminSubscriptionRow } }) => (
          <SoftTypography variant="caption" color="secondary">
            {formatPeriodEnd(row.original.currentPeriodEnd)}
          </SoftTypography>
        ),
      },
      {
        Header: 'Subscription ID',
        accessor: 'subscriptionId',
        width: '22%',
        Cell: ({ row }: { row: { original: AdminSubscriptionRow } }) => (
          <SoftTypography variant="caption" color="secondary" sx={{ fontFamily: 'monospace' }}>
            {row.original.subscriptionId.length > 24
              ? `${row.original.subscriptionId.slice(0, 14)}…`
              : row.original.subscriptionId}
          </SoftTypography>
        ),
      },
    ];

    return { columns, rows };
  }, [data?.subscriptions, navigate]);

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <Card>
          <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" p={3}>
            <SoftBox lineHeight={1}>
              <SoftTypography variant="h5" fontWeight="bold">
                Subscriptions
              </SoftTypography>
              <SoftTypography variant="button" fontWeight="regular" color="text">
                All Stripe subscriptions linked to platform accounts.
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
                {error instanceof Error ? error.message : 'Could not load subscriptions.'}
              </SoftTypography>
            </SoftBox>
          )}

          {!isLoading && !isError && table.rows.length === 0 && (
            <SoftBox p={6} textAlign="center">
              <SoftTypography variant="button" color="secondary">
                No subscriptions found.
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

export default AdminSubscriptionsPage;
