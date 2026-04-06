/**
 * Admin — subscription: 70% history/invoices, 30% gradient info (plugin-style)
 */
import React, { useMemo } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import Footer from 'examples/Footer';
import { contentPageShellSx, contentPaperSurfaceSx } from '../../theme/contentPaper';
import DataTable from 'examples/Tables/DataTable';
import DetailPageInfoCard from 'components/ui/DetailPageInfoCard';
import DetailInfoField from 'components/ui/DetailInfoField';
import { ROUTE_PATHS } from '../../config/routePaths';
import { useAdminSubscriptionDetail } from '../../domains/admin/useAdminBilling';
import {
  detailSectionTitleSx,
  detailSectionTitleOnGradientSx,
  iconButtonOnBlueGradientSx,
} from '../../theme/detailPageStyles';

function formatMoney(amountCents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

function formatUnix(ts: number | undefined) {
  if (ts == null) return '—';
  return new Date(ts * 1000).toLocaleString();
}

const AdminSubscriptionDetailPage: React.FC = () => {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAdminSubscriptionDetail(subscriptionId);

  const sub = data?.subscription;
  const status = typeof sub?.status === 'string' ? sub.status : '—';
  const cancelAtPeriodEnd = sub?.cancel_at_period_end === true;
  const customerId =
    typeof sub?.customer === 'string' ? sub.customer : (sub?.customer as { id?: string } | undefined)?.id;

  const invoicesTable = useMemo(() => {
    const invoices = data?.invoices ?? [];
    const rows = invoices.map((inv) => {
      const r = inv as Record<string, unknown>;
      return {
        id: String(r.id ?? ''),
        amount: typeof r.amount_paid === 'number' ? r.amount_paid : 0,
        currency: String(r.currency ?? 'usd'),
        status: String(r.status ?? '—'),
        created: typeof r.created === 'number' ? r.created : 0,
        hosted: typeof r.hosted_invoice_url === 'string' ? r.hosted_invoice_url : null,
      };
    });

    const columns = [
      {
        Header: 'Invoice',
        accessor: 'id',
        width: '28%',
        Cell: ({ row }: { row: { original: (typeof rows)[0] } }) => (
          <SoftTypography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
            {row.original.id.length > 20 ? `${row.original.id.slice(0, 18)}…` : row.original.id}
          </SoftTypography>
        ),
      },
      {
        Header: 'Amount',
        id: 'amount',
        width: '14%',
        Cell: ({ row }: { row: { original: (typeof rows)[0] } }) => (
          <SoftTypography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {formatMoney(row.original.amount, row.original.currency)}
          </SoftTypography>
        ),
      },
      {
        Header: 'Status',
        accessor: 'status',
        width: '12%',
      },
      {
        Header: 'Created',
        id: 'created',
        width: '22%',
        Cell: ({ row }: { row: { original: (typeof rows)[0] } }) => (
          <SoftTypography variant="body2" color="secondary" sx={{ fontSize: '0.8125rem' }}>
            {formatUnix(row.original.created)}
          </SoftTypography>
        ),
      },
      {
        Header: 'Link',
        id: 'link',
        width: '24%',
        Cell: ({ row }: { row: { original: (typeof rows)[0] } }) =>
          row.original.hosted ? (
            <Link href={row.original.hosted} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ fontSize: '0.875rem' }}>
              Open in Stripe
            </Link>
          ) : (
            <SoftTypography variant="body2" color="secondary">
              —
            </SoftTypography>
          ),
      },
    ];

    return { columns, rows };
  }, [data?.invoices]);

  const historyItems = useMemo(() => {
    const invoices = data?.invoices ?? [];
    return [...invoices]
      .map((inv) => {
        const r = inv as Record<string, unknown>;
        return {
          id: String(r.id ?? ''),
          created: typeof r.created === 'number' ? r.created : 0,
          amount: typeof r.amount_paid === 'number' ? r.amount_paid : 0,
          currency: String(r.currency ?? 'usd'),
          status: String(r.status ?? ''),
        };
      })
      .sort((a, b) => b.created - a.created)
      .slice(0, 12);
  }, [data?.invoices]);

  const subtitle =
    subscriptionId && subscriptionId.length > 24
      ? `${subscriptionId.slice(0, 20)}…`
      : subscriptionId ?? '';

  const stripeSubUrl = `https://dashboard.stripe.com/subscriptions/${encodeURIComponent(subscriptionId ?? '')}`;
  const stripeCustomerUrl = customerId
    ? `https://dashboard.stripe.com/customers/${encodeURIComponent(customerId)}`
    : null;

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        {isLoading && <SoftTypography color="secondary">Loading…</SoftTypography>}

        {isError && (
          <SoftTypography color="error">
            {error instanceof Error ? error.message : 'Could not load subscription.'}
          </SoftTypography>
        )}

        {!isLoading && !isError && data && (
          <SoftBox
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '7fr 3fr' },
              gap: 3,
              alignItems: 'flex-start',
            }}
          >
            {/* Left 70%: billing history + invoices */}
            <SoftBox sx={{ minWidth: 0 }}>
              <Stack spacing={2}>
                <Card sx={{ ...contentPaperSurfaceSx, overflow: 'hidden' }}>
                  <SoftBox
                    sx={{
                      background: 'linear-gradient(310deg, #4F5482 0%, #7a8ef0 100%)',
                      color: '#fff',
                      px: 2.5,
                      py: 2,
                    }}
                  >
                    <SoftTypography variant="h6" fontWeight="bold" sx={{ color: '#fff', fontSize: '1rem' }}>
                      Billing history
                    </SoftTypography>
                    <SoftTypography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', mt: 0.5 }}>
                      Recent invoice events (newest first)
                    </SoftTypography>
                  </SoftBox>
                  <SoftBox p={2}>
                    {historyItems.length === 0 ? (
                      <SoftTypography variant="body2" color="secondary">
                        No invoices yet.
                      </SoftTypography>
                    ) : (
                      <Stack spacing={1.5} divider={<Divider flexItem />}>
                        {historyItems.map((row) => (
                          <SoftBox key={row.id} display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                            <SoftBox>
                              <SoftTypography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                {formatMoney(row.amount, row.currency)}
                              </SoftTypography>
                              <SoftTypography variant="body2" color="secondary" sx={{ fontSize: '0.8125rem' }}>
                                {formatUnix(row.created)}
                              </SoftTypography>
                            </SoftBox>
                            <SoftTypography
                              variant="caption"
                              sx={{
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                                color: 'text.secondary',
                              }}
                            >
                              {row.status}
                            </SoftTypography>
                          </SoftBox>
                        ))}
                      </Stack>
                    )}
                  </SoftBox>
                </Card>

                <Card sx={contentPaperSurfaceSx}>
                  <SoftBox p={2.5}>
                    <SoftTypography sx={detailSectionTitleSx}>Invoices</SoftTypography>
                    {invoicesTable.rows.length === 0 ? (
                      <SoftTypography variant="body2" color="secondary">
                        No invoices for this subscription.
                      </SoftTypography>
                    ) : (
                      <SoftBox sx={{ mt: 1, '& .MuiTableCell-root': { fontSize: '0.875rem' } }}>
                        <DataTable
                          table={invoicesTable}
                          entriesPerPage={{ defaultValue: 10, entries: [5, 10, 15, 20, 25] }}
                          canSearch={false}
                          headerColor="#4F5482"
                          showTotalEntries
                        />
                      </SoftBox>
                    )}
                  </SoftBox>
                </Card>
              </Stack>
            </SoftBox>

            {/* Right 30%: plugin-style gradient info */}
            <SoftBox sx={{ minWidth: 0, width: '100%' }}>
              <DetailPageInfoCard
                variant="fullGradient"
                backLabel="Back to subscriptions"
                backIconOnly
                onBack={() => navigate(ROUTE_PATHS.ADMIN_SUBSCRIPTIONS)}
                title="Subscription"
                subtitle={subtitle}
                actions={
                  <>
                    <Tooltip title="Open subscription in Stripe">
                      <IconButton
                        component="a"
                        href={stripeSubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        aria-label="Open subscription in Stripe"
                        sx={iconButtonOnBlueGradientSx}
                      >
                        <Icon fontSize="small">open_in_new</Icon>
                      </IconButton>
                    </Tooltip>
                    {stripeCustomerUrl ? (
                      <Tooltip title="Stripe customer">
                        <IconButton
                          component="a"
                          href={stripeCustomerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          aria-label="Stripe customer"
                          sx={iconButtonOnBlueGradientSx}
                        >
                          <Icon fontSize="small">person</Icon>
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    <Tooltip title="Users">
                      <IconButton
                        component={RouterLink}
                        to={ROUTE_PATHS.ADMIN_USERS}
                        size="small"
                        aria-label="Users"
                        sx={iconButtonOnBlueGradientSx}
                      >
                        <Icon fontSize="small">people</Icon>
                      </IconButton>
                    </Tooltip>
                  </>
                }
              >
                <Stack spacing={2.5}>
                  <SoftBox>
                    <SoftTypography sx={detailSectionTitleOnGradientSx}>Subscription</SoftTypography>
                    <Stack direction="column" spacing={1.5}>
                      <DetailInfoField label="Status" onGradient>
                        {status}
                        {cancelAtPeriodEnd ? ' · Cancels at period end' : ''}
                      </DetailInfoField>
                      <DetailInfoField label="Current period" onGradient>
                        {formatUnix(sub?.current_period_start as number | undefined)} —{' '}
                        {formatUnix(sub?.current_period_end as number | undefined)}
                      </DetailInfoField>
                    </Stack>
                  </SoftBox>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.25)' }} />

                  <SoftBox>
                    <SoftTypography sx={detailSectionTitleOnGradientSx}>Appwrite user</SoftTypography>
                    {data.appwriteUser ? (
                      <Stack spacing={1}>
                        <DetailInfoField label="Name" onGradient>
                          {data.appwriteUser.name || '(no name)'}
                        </DetailInfoField>
                        <DetailInfoField label="Email" onGradient>
                          {data.appwriteUser.email}
                        </DetailInfoField>
                        <DetailInfoField label="User ID" onGradient>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{data.appwriteUser.id}</span>
                        </DetailInfoField>
                      </Stack>
                    ) : (
                      <SoftTypography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem' }}>
                        No account document linked to this Stripe customer.
                      </SoftTypography>
                    )}
                  </SoftBox>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.25)' }} />

                  <SoftBox>
                    <SoftTypography sx={detailSectionTitleOnGradientSx}>Platform usage</SoftTypography>
                    <Stack direction="column" spacing={1.5}>
                      <DetailInfoField label="Sites" onGradient>
                        {data.usage.sitesUsed}
                      </DetailInfoField>
                      <DetailInfoField label="Library items" onGradient>
                        {data.usage.libraryUsed}
                      </DetailInfoField>
                      <DetailInfoField label="Local uploads" onGradient>
                        {data.usage.storageUsed}
                      </DetailInfoField>
                    </Stack>
                  </SoftBox>
                </Stack>
              </DetailPageInfoCard>
            </SoftBox>
          </SoftBox>
        )}
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AdminSubscriptionDetailPage;
