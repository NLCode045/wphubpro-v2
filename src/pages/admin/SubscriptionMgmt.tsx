import DataTable from '@/components/table/DataTable';
import { ROUTE_PATHS } from '@/config/routePaths';
import {
  useAdminCancelSubscription,
  useAdminPauseSubscription,
  useAdminResumeSubscription,
  useAdminSubscriptionList,
} from '@/domains/admin/finance/hooks';
import type { AdminSubscriptionRow } from '@/domains/admin/finance/types';
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { Badge, Button, ButtonGroup, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router';

type SubRow = {
  id: string;
  customerEmail: string;
  customerName: string;
  status: string;
  plan: string;
  periodStart: string;
  periodEnd: string;
  interval: string;
  paused: boolean;
};

const columnHelper = createColumnHelper<SubRow>();

function mapRow(r: AdminSubscriptionRow): SubRow {
  return {
    id: r.subscriptionId,
    customerEmail: r.customerEmail ?? '—',
    customerName: r.customerName ?? '—',
    status: r.status ?? '—',
    plan: r.planName ?? '—',
    periodStart: r.startDate ? new Date(r.startDate * 1000).toLocaleDateString() : '—',
    periodEnd: r.currentPeriodEnd ? new Date(r.currentPeriodEnd * 1000).toLocaleDateString() : '—',
    interval: r.billingCycle ?? '—',
    paused: r.status === 'paused',
  };
}

const SubscriptionMgmtPage = () => {
  const navigate = useNavigate();
  const listParams = useMemo(
    () => ({
      maxPages: 5,
      sortField: 'startDate' as const,
      sortDir: 'desc' as const,
    }),
    [],
  );
  const { data, isLoading, error, refetch } = useAdminSubscriptionList(listParams);
  const cancelMut = useAdminCancelSubscription();
  const pauseMut = useAdminPauseSubscription();
  const resumeMut = useAdminResumeSubscription();

  const rows: SubRow[] = useMemo(() => (data?.subscriptions ?? []).map(mapRow), [data?.subscriptions]);

  const actionPending = cancelMut.isPending || pauseMut.isPending || resumeMut.isPending;

  const runAction = (row: SubRow, action: 'cancel' | 'pause' | 'resume') => {
    const labels = {
      cancel: 'Cancel this subscription?',
      pause: 'Pause collection?',
      resume: 'Resume subscription?',
    };
    if (!window.confirm(labels[action])) return;
    const onDone = () => void refetch();
    if (action === 'cancel') {
      cancelMut.mutate({ subscriptionId: row.id }, { onSuccess: onDone });
    } else if (action === 'pause') {
      pauseMut.mutate({ subscriptionId: row.id }, { onSuccess: onDone });
    } else {
      resumeMut.mutate({ subscriptionId: row.id }, { onSuccess: onDone });
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'Subscription',
        cell: ({ getValue }) => <code className="small">{getValue()}</code>,
      }),
      columnHelper.accessor('customerEmail', {
        header: 'Customer',
        cell: ({ row }) => (
          <div>
            <div className="small">{row.original.customerEmail}</div>
            <div className="text-muted small">{row.original.customerName}</div>
          </div>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ getValue, row }) => (
          <div className="d-flex align-items-center gap-1 flex-wrap">
            <Badge bg="secondary">{getValue()}</Badge>
            {row.original.paused ? <Badge bg="warning">Paused</Badge> : null}
          </div>
        ),
      }),
      columnHelper.accessor('plan', { header: 'Plan' }),
      columnHelper.accessor('periodStart', { header: 'Start' }),
      columnHelper.accessor('periodEnd', { header: 'Period end' }),
      columnHelper.accessor('interval', { header: 'Billing' }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <ButtonGroup size="sm">
            <Button
              variant="outline-primary"
              onClick={() => navigate(ROUTE_PATHS.adminFinanceSubscriptionPath(row.original.id))}
            >
              View
            </Button>
            {row.original.paused ? (
              <Button
                variant="outline-success"
                disabled={actionPending}
                onClick={() => runAction(row.original, 'resume')}
              >
                Resume
              </Button>
            ) : (
              <Button
                variant="outline-warning"
                disabled={actionPending}
                onClick={() => runAction(row.original, 'pause')}
              >
                Pause
              </Button>
            )}
            <Button variant="outline-danger" disabled={actionPending} onClick={() => runAction(row.original, 'cancel')}>
              Cancel
            </Button>
          </ButtonGroup>
        ),
      }),
    ],
    [actionPending, navigate],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { sorting: [{ id: 'periodEnd', desc: true }] },
  });

  if (isLoading) return <Spinner animation="border" />;
  if (error) return <p className="text-danger">{error.message}</p>;

  return (
    <div>
      <p className="text-muted small mb-3">
        Live Stripe data via Appwrite (<code className="small">admin-list-subscriptions</code>).{' '}
        <Link to={ROUTE_PATHS.ADMIN_FINANCE_DASHBOARD}>Back to dashboard</Link>
      </p>
      <DataTable
        table={table}
        onRowClick={(row) => navigate(ROUTE_PATHS.adminFinanceSubscriptionPath(row.id))}
        emptyMessage="No subscriptions."
      />
    </div>
  );
};

export default SubscriptionMgmtPage;
