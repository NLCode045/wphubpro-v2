import DataTable from '@/components/table/DataTable';
import { ROUTE_PATHS } from '@/config/routePaths';
import {
  billingIntervalFromSubscriptionJson,
  formatStripeAddress,
  planLabelFromSubscriptionJson,
} from '@/lib/adminStripeFormat';
import { useAdminSubscriptionAction, useAdminSubscriptionsList } from '@/hooks/useAdminSubscriptions';
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
  address: string;
  status: string;
  plan: string;
  periodStart: string;
  periodEnd: string;
  interval: string;
  paused: boolean;
  raw: Record<string, unknown>;
};

const columnHelper = createColumnHelper<SubRow>();

function mapSub(r: Record<string, unknown>): SubRow {
  const customer = r.customer;
  const c = typeof customer === 'object' && customer ? (customer as Record<string, unknown>) : null;
  const email = typeof c?.email === 'string' ? c.email : '—';
  const name = typeof c?.name === 'string' && c.name ? c.name : '—';
  const address = formatStripeAddress(c?.address);
  const cps = r.current_period_start;
  const cpe = r.current_period_end;
  return {
    id: String(r.id ?? ''),
    customerEmail: email,
    customerName: name,
    address,
    status: String(r.status ?? '—'),
    plan: planLabelFromSubscriptionJson(r),
    periodStart: typeof cps === 'number' ? new Date(cps * 1000).toLocaleDateString() : '—',
    periodEnd: typeof cpe === 'number' ? new Date(cpe * 1000).toLocaleDateString() : '—',
    interval: billingIntervalFromSubscriptionJson(r) ?? '—',
    paused: Boolean(r.pause_collection),
    raw: r,
  };
}

const SubscriptionMgmtPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useAdminSubscriptionsList();
  const actionMut = useAdminSubscriptionAction();

  const rows: SubRow[] = useMemo(() => (data?.subscriptions ?? []).map((s) => mapSub(s)), [data?.subscriptions]);

  const runAction = (row: SubRow, action: 'cancel' | 'pause' | 'resume') => {
    const labels = { cancel: 'Cancel this subscription immediately?', pause: 'Pause collection?', resume: 'Resume subscription?' };
    if (!window.confirm(labels[action])) return;
    actionMut.mutate(
      { subscriptionId: row.id, action },
      { onSuccess: () => void refetch() },
    );
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'Subscription',
        cell: ({ getValue }) => <code className="small">{getValue()}</code>,
      }),
      columnHelper.accessor('customerEmail', {
        header: 'Email',
        cell: ({ row }) => (
          <div>
            <div className="small">{row.original.customerEmail}</div>
            <div className="text-muted small">{row.original.customerName}</div>
          </div>
        ),
      }),
      columnHelper.accessor('address', {
        header: 'Address',
        cell: ({ getValue }) => <span className="small text-muted">{getValue()}</span>,
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
      columnHelper.accessor('periodStart', { header: 'Period start' }),
      columnHelper.accessor('periodEnd', { header: 'Period end' }),
      columnHelper.accessor('interval', { header: 'Billing' }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <ButtonGroup size="sm">
            <Button variant="outline-primary" onClick={() => navigate(ROUTE_PATHS.adminFinanceSubscriptionPath(row.original.id))}>
              View
            </Button>
            {row.original.paused ? (
              <Button variant="outline-success" disabled={actionMut.isPending} onClick={() => runAction(row.original, 'resume')}>
                Resume
              </Button>
            ) : (
              <Button variant="outline-warning" disabled={actionMut.isPending} onClick={() => runAction(row.original, 'pause')}>
                Pause
              </Button>
            )}
            <Button variant="outline-danger" disabled={actionMut.isPending} onClick={() => runAction(row.original, 'cancel')}>
              Cancel
            </Button>
          </ButtonGroup>
        ),
      }),
    ],
    [actionMut.isPending, navigate],
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
        All subscriptions (live Stripe, expanded customer + product).{' '}
        <Link to={ROUTE_PATHS.ADMIN_FINANCE_DASHBOARD}>Back to dashboard</Link>
      </p>
      <DataTable table={table} onRowClick={(row) => navigate(ROUTE_PATHS.adminFinanceSubscriptionPath(row.id))} emptyMessage="No subscriptions." />
    </div>
  );
};

export default SubscriptionMgmtPage;
