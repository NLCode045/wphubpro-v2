/**
 * Admin Plan Detail - Structured view with stats, tabs, plan info box
 * Layout: top stats, left tabs (analytics/subscriptions), right plan info
 */
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Footer from 'examples/Footer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executeFunction } from '../../integrations/appwrite/executeFunction';
import { useToast } from '../../contexts/ToastContext';
import TabNavList, { TabNavPanel } from 'components/ui/TabNavList';
import PlanDetailSidebar from 'components/plan-detail/PlanDetailSidebar';
import StripeAnalyticsDashboard from 'components/admin/StripeAnalyticsDashboard';
import DataTable from 'examples/Tables/DataTable';
import DetailPageInfoCard from 'components/ui/DetailPageInfoCard';
import { contentPageShellFlexSx, contentPageShellSx } from '../../theme/contentPaper';

interface PlanDetailMeta {
  key: string;
  value: string;
}

interface PlanDetail {
  id: string;
  name: string;
  description: string;
  status: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  currency: string;
  metadata?: PlanDetailMeta[];
  stripeLink?: string;
}

interface PlanStats {
  totalSubscriptions: number;
  subscriptionsMonthly: number;
  subscriptionsYearly: number;
  totalEarnings: number;
  upgradedTo: number;
  downgradedTo: number;
  downgradedFrom: number;
}

interface Subscriber {
  subscriptionId: string;
  customerId: string;
  email: string;
  name: string;
  billingInterval: string;
  subscribedSince: number;
  status: string;
  userId?: string;
}

const formatDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString('nl-NL', { year: 'numeric', month: 'short', day: 'numeric' });

function usePlanDetail(planId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'plan', planId],
    queryFn: async () => {
      const res = await executeFunction<{
        success: boolean;
        plan: PlanDetail;
        stats: PlanStats;
        subscribers: Subscriber[];
      }>('stripe-products', { action: 'get', product_id: planId });
      if (!res?.success || !res?.plan) throw new Error('Failed to load plan');
      return res;
    },
    enabled: !!planId,
  });
}

function useUpdatePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      productId: string;
      name?: string;
      description?: string;
      sites_limit?: number;
      library_limit?: number;
      storage_limit?: number;
      non_sellable?: boolean;
      hidden?: boolean;
    }) => {
      const res = await executeFunction<{ success: boolean }>(
        'stripe-products',
        { action: 'update', ...payload }
      );
      if (!res?.success) throw new Error('Failed to update plan');
      return res;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plan', vars.productId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      toast({ title: 'Plan updated', variant: 'success' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Could not update plan', variant: 'destructive' });
    },
  });
}

function useCreatePrice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: { productId: string; interval: 'month' | 'year'; amount: number; currency?: string }) => {
      const res = await executeFunction<{ success: boolean; priceId?: string }>(
        'stripe-products',
        {
          action: 'create-price',
          product_id: payload.productId,
          interval: payload.interval,
          amount: payload.amount,
          currency: payload.currency,
        }
      );
      if (!res?.success) throw new Error('Failed to create price');
      return res;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plan', vars.productId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      toast({ title: 'Price created', variant: 'success' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Could not create price', variant: 'destructive' });
    },
  });
}

function useSetPlanActive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: { productId: string; active: boolean }) => {
      const res = await executeFunction<{ success: boolean }>(
        'stripe-products',
        { action: 'set-active', product_id: payload.productId, active: payload.active }
      );
      if (!res?.success) throw new Error('Failed to update plan status');
      return res;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plan', vars.productId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      toast({ title: vars.active ? 'Plan activated' : 'Plan deactivated', variant: 'success' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Could not update status', variant: 'destructive' });
    },
  });
}

const TAB_ITEMS = [
  { value: 0, label: 'Analytics', icon: 'analytics' },
  { value: 1, label: 'Subscriptions', icon: 'people' },
];

const AdminPlanDetailPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  const { data, isLoading, isError, error } = usePlanDetail(planId);
  const updatePlan = useUpdatePlan();
  const createPrice = useCreatePrice();
  const setActive = useSetPlanActive();

  const plan = data?.plan;
  const subscribers = data?.subscribers ?? [];

  const handleUpdate = (field: string, value: string | number | boolean) => {
    if (!plan) return;
    const payload: Record<string, unknown> = { productId: plan.id };
    if (field === 'name') payload.name = value;
    else if (field === 'description') payload.description = value;
    else if (field === 'non_sellable') payload.non_sellable = value;
    else if (field === 'hidden') payload.hidden = value;
    else if (['sites_limit', 'library_limit', 'storage_limit'].includes(field)) {
      const num = parseInt(String(value), 10);
      payload[field] = value === '' ? undefined : (Number.isNaN(num) ? undefined : num);
    }
    updatePlan.mutate(payload as Parameters<typeof updatePlan.mutate>[0]);
  };

  const handleToggleActive = () => {
    if (!plan) return;
    setActive.mutate({ productId: plan.id, active: plan.status !== 'active' });
  };

  const subscriptionsTableData = useMemo(() => ({
    columns: [
      { Header: 'Username', accessor: 'username', width: '28%' },
      { Header: 'Subscribed at', accessor: 'subscribedAt', width: '18%' },
      { Header: 'Billing cycle', accessor: 'billing', width: '14%' },
      { Header: 'Status', accessor: 'status', width: '14%' },
      { Header: 'Usage / Limit', accessor: 'usage', width: '18%' },
    ],
    rows: subscribers.map((s) => ({
      username: (
        <SoftBox>
          <SoftTypography fontWeight="medium" variant="body2">{s.name || s.email || s.customerId}</SoftTypography>
          {s.email && s.name && (
            <SoftTypography variant="caption" color="secondary" display="block">{s.email}</SoftTypography>
          )}
        </SoftBox>
      ),
      subscribedAt: formatDate(s.subscribedSince),
      billing: s.billingInterval === 'year' ? 'Yearly' : 'Monthly',
      status: (
        <Chip
          label={s.status}
          size="small"
          color={
            s.status === 'active' ? 'success' :
            s.status === 'trialing' ? 'info' :
            s.status === 'past_due' ? 'warning' : 'default'
          }
        />
      ),
      usage: '— / —',
    })),
  }), [subscribers]);

  if (!planId) {
    return (
      <SoftBox sx={contentPageShellSx}>
        <SoftTypography color="error">Missing plan ID</SoftTypography>
      </SoftBox>
    );
  }

  if (isLoading) {
    return (
      <SoftBox sx={{ ...contentPageShellSx, p: 6, textAlign: 'center' }}>
        <SoftTypography variant="button" color="secondary">Loading plan...</SoftTypography>
      </SoftBox>
    );
  }

  if (isError || !plan) {
    return (
      <SoftBox sx={{ ...contentPageShellSx, p: 4 }}>
        <SoftTypography color="error">{error?.message || 'Failed to load plan.'}</SoftTypography>
        <SoftButton variant="gradient" color="info" size="small" onClick={() => navigate('/admin/plans')} sx={{ mt: 1 }}>
          ← Back to plans
        </SoftButton>
      </SoftBox>
    );
  }

  return (
    <>
      <SoftBox sx={contentPageShellFlexSx}>
        <DetailPageInfoCard
          backLabel="Plans"
          onBack={() => navigate('/admin/plans')}
          title={plan.name}
          subtitle={plan.description ? (plan.description.length > 160 ? `${plan.description.slice(0, 157)}…` : plan.description) : undefined}
          actions={
            <Chip
              label={plan.status}
              size="small"
              sx={{
                color: '#fff',
                bgcolor: plan.status === 'active' ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.35)',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
          }
        />

        <SoftBox
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'grid',
            mt: 2,
            columnGap: { xs: 0, lg: 3 },
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 8fr) minmax(0, 4fr)' },
            gridTemplateRows: { xs: 'auto auto 1fr', lg: 'auto minmax(0, 1fr)' },
            gridTemplateAreas: {
              xs: '"tabs" "main" "sidebar"',
              lg: '"tabs tabGap" "main sidebar"',
            },
          }}
        >
          <SoftBox sx={{ gridArea: 'tabs' }}>
            <TabNavList items={TAB_ITEMS} value={tab} onChange={(_, v) => setTab(v)} sx={{ width: '100%' }} />
          </SoftBox>
          <SoftBox sx={{ gridArea: 'tabGap', display: { xs: 'none', lg: 'block' } }} />
          <SoftBox sx={{ gridArea: 'main', minHeight: 0, overflow: 'auto', px: 3, pb: 3 }}>
            <TabNavPanel value={tab} index={0}>
              <StripeAnalyticsDashboard
                productFilter={plan.id}
                title={`Analytics: ${plan.name}`}
                compact
              />
            </TabNavPanel>
            <TabNavPanel value={tab} index={1}>
              <Card sx={{ overflow: 'hidden' }}>
                <SoftBox p={2} borderBottom="1px solid" borderColor="grey.200" display="flex" justifyContent="space-between" alignItems="center">
                  <SoftTypography variant="h6" fontWeight="bold" sx={{ color: '#4F5482' }}>
                    Subscriptions ({subscribers.length})
                  </SoftTypography>
                </SoftBox>
                <SoftBox pt={2} pr={2} pb={2} pl={1}>
                  <DataTable
                    table={subscriptionsTableData}
                    entriesPerPage={{ defaultValue: 10, entries: [5, 10, 15, 20, 25] }}
                    canSearch
                    headerColor="#4F5482"
                    showTotalEntries
                  />
                </SoftBox>
              </Card>
            </TabNavPanel>
          </SoftBox>
          <SoftBox sx={{ gridArea: 'sidebar', pr: { lg: 4 }, minHeight: 0 }}>
            <PlanDetailSidebar
              plan={plan}
              onUpdate={handleUpdate}
              onUpdatePrice={(interval, amount) => {
                createPrice.mutate({
                  productId: plan.id,
                  interval,
                  amount,
                  currency: plan.currency,
                });
              }}
              onToggleActive={handleToggleActive}
              isUpdating={setActive.isPending}
            />
          </SoftBox>
        </SoftBox>
      </SoftBox>

      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AdminPlanDetailPage;
