/**
 * Admin Plan Management - List Stripe products, create and edit plans
 * Uses same table layout as Sites page
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Stack from '@mui/material/Stack';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Footer from 'examples/Footer';
import {
  contentPageShellSx,
  contentPaperSurfaceSx,
  contentPaperPageTitleSx,
  contentPaperPageDescriptionSx,
} from '../../theme/contentPaper';
import DataTable from 'examples/Tables/DataTable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executeFunction } from '../../integrations/appwrite/executeFunction';
import { iconButtonOnLightSurfaceSx } from '../../theme/detailPageStyles';
import { useToast } from '../../contexts/ToastContext';

interface StripePlanAdmin {
  id: string;
  name: string;
  description: string;
  status: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  currency: string;
  stripeLink?: string;
  metadata?: Array<{ key: string; value: string }>;
}

function useAdminPlans(activeOnly: boolean) {
  return useQuery({
    queryKey: ['admin', 'plans', activeOnly],
    queryFn: async () => {
      const res = await executeFunction<{ plans: StripePlanAdmin[]; total: number }>(
        'stripe-products',
        { action: 'list', active_only: activeOnly }
      );
      return res?.plans ?? [];
    },
  });
}

function useCreatePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      label?: string;
      sites_limit?: number;
      library_limit?: number;
      storage_limit?: number;
      monthlyAmount?: number;
      yearlyAmount?: number;
      currency?: string;
      non_sellable?: boolean;
      hidden?: boolean;
    }) => {
      const res = await executeFunction<{ success: boolean; productId?: string; productName?: string }>(
        'stripe-products',
        { action: 'create', ...payload }
      );
      if (!res?.success) throw new Error('Failed to create plan');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      toast({ title: 'Plan created', variant: 'success' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Could not create plan', variant: 'destructive' });
    },
  });
}

const formatPrice = (amount: number, currency: string) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: currency.toUpperCase() }).format(amount);

function getMetaMap(plan: StripePlanAdmin): Record<string, string> {
  const meta = plan.metadata;
  return meta ? Object.fromEntries(meta.map((m) => [m.key, m.value])) : {};
}

const AdminPlansPage: React.FC = () => {
  const [hideInactive, setHideInactive] = useState(true);
  const { data: plans, isLoading, isError, error } = useAdminPlans(hideInactive);
  const createPlan = useCreatePlan();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sitesLimit, setSitesLimit] = useState<string>('5');
  const [libraryLimit, setLibraryLimit] = useState<string>('20');
  const [storageLimit, setStorageLimit] = useState<string>('50');
  const [monthlyAmount, setMonthlyAmount] = useState<string>('');
  const [yearlyAmount, setYearlyAmount] = useState<string>('');
  const [currency, setCurrency] = useState('eur');
  const [nonSellable, setNonSellable] = useState(false);
  const [hidden, setHidden] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    if (!monthlyAmount && !yearlyAmount) return;
    try {
      await createPlan.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        sites_limit: parseInt(sitesLimit, 10) || undefined,
        library_limit: parseInt(libraryLimit, 10) || undefined,
        storage_limit: parseInt(storageLimit, 10) || undefined,
        monthlyAmount: monthlyAmount ? parseFloat(monthlyAmount) : undefined,
        yearlyAmount: yearlyAmount ? parseFloat(yearlyAmount) : undefined,
        currency,
        non_sellable: nonSellable,
        hidden,
      });
      setCreateOpen(false);
      setName('');
      setDescription('');
      setSitesLimit('5');
      setLibraryLimit('20');
      setStorageLimit('50');
      setMonthlyAmount('');
      setYearlyAmount('');
      setNonSellable(false);
      setHidden(false);
    } catch {
      // Error handled by mutation
    }
  };

  const navigate = useNavigate();
  const handleViewPlan = (plan: StripePlanAdmin) => {
    navigate(`/admin/plans/${plan.id}`);
  };

  const dataTableData = {
    columns: [
      { Header: 'Name', accessor: 'name', width: '28%' },
      { Header: 'Status', accessor: 'status', width: '10%' },
      { Header: 'Monthly', accessor: 'monthly', width: '14%' },
      { Header: 'Yearly', accessor: 'yearly', width: '14%' },
      { Header: 'Limits', accessor: 'limits', width: '18%' },
      { Header: 'Actions', accessor: 'action', width: '16%', disableSortBy: true },
    ],
    rows: (plans ?? []).map((plan) => {
      const meta = getMetaMap(plan);
      return {
        name: (
          <SoftBox>
            <SoftTypography fontWeight="medium">{plan.name}</SoftTypography>
            {plan.description && (
              <SoftTypography variant="caption" color="secondary" display="block">
                {plan.description}
              </SoftTypography>
            )}
          </SoftBox>
        ),
        status: plan.status,
        monthly: plan.monthlyPrice > 0 ? formatPrice(plan.monthlyPrice, plan.currency) + '/mo' : '—',
        yearly: plan.yearlyPrice > 0 ? formatPrice(plan.yearlyPrice, plan.currency) + '/yr' : '—',
        limits: `${meta.sites_limit ?? '—'} / ${meta.library_limit ?? '—'} / ${meta.storage_limit ?? '—'}`,
        action: (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton size="small" onClick={() => handleViewPlan(plan)} title="View details" aria-label="View plan details" sx={iconButtonOnLightSurfaceSx}>
              <Icon sx={{ fontSize: 18 }}>visibility</Icon>
            </IconButton>
            {plan.stripeLink && (
              <SoftButton
                component="a"
                href={plan.stripeLink}
                target="_blank"
                rel="noreferrer"
                variant="text"
                color="info"
                size="small"
              >
                Stripe
              </SoftButton>
            )}
          </Stack>
        ),
      };
    }),
  };

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <Card sx={contentPaperSurfaceSx}>
          <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" p={3}>
            <SoftBox lineHeight={1}>
              <SoftTypography sx={contentPaperPageTitleSx}>
                Plan Management
              </SoftTypography>
              <SoftTypography sx={{ ...contentPaperPageDescriptionSx, display: 'block', mt: 0.5 }}>
                Manage Stripe products and prices.
              </SoftTypography>
            </SoftBox>
            <Stack spacing={1} direction="row">
              <SoftButton variant="gradient" color="info" size="small" onClick={() => setCreateOpen(true)}>
                + Create plan
              </SoftButton>
            </Stack>
          </SoftBox>

          {isLoading && (
            <SoftBox p={6} textAlign="center">
              <SoftTypography variant="button" color="secondary">Loading...</SoftTypography>
            </SoftBox>
          )}

          {isError && (
            <SoftBox p={4}>
              <SoftTypography variant="button" color="error">{error?.message || 'Error loading plans.'}</SoftTypography>
            </SoftBox>
          )}

          {!isLoading && !isError && plans && (
            <>
              <SoftBox px={3} pb={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={hideInactive}
                      onChange={(e) => setHideInactive(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Hide inactive plans"
                />
              </SoftBox>
              {plans.length === 0 ? (
                <SoftBox p={6} textAlign="center">
                  <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }}>workspace_premium</Icon>
                  <SoftTypography variant="h6" fontWeight="medium" mb={1}>No plans yet</SoftTypography>
                  <SoftTypography variant="button" color="secondary" mb={2} display="block">
                    Create your first plan to get started.
                  </SoftTypography>
                  <SoftButton variant="gradient" color="info" size="small" onClick={() => setCreateOpen(true)}>
                    + Create plan
                  </SoftButton>
                </SoftBox>
              ) : (
                <SoftBox pt={0} pr={2} pb={2} pl={1}>
                  <DataTable
                    table={dataTableData}
                    entriesPerPage={{ defaultValue: 10, entries: [5, 10, 15, 20, 25] }}
                    canSearch
                    headerColor="#4F5482"
                    showTotalEntries
                  />
                </SoftBox>
              )}
            </>
          )}
        </Card>
      </SoftBox>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create plan</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            variant="standard"
            label="Plan name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            variant="standard"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
          />
          <SoftBox display="flex" gap={2} flexWrap="wrap">
            <TextField
              variant="standard"
              label="Sites limit"
              value={sitesLimit}
              onChange={(e) => setSitesLimit(e.target.value)}
              type="number"
              inputProps={{ min: 0 }}
              sx={{ width: 100 }}
            />
            <TextField
              variant="standard"
              label="Library limit"
              value={libraryLimit}
              onChange={(e) => setLibraryLimit(e.target.value)}
              type="number"
              inputProps={{ min: 0 }}
              sx={{ width: 100 }}
            />
            <TextField
              variant="standard"
              label="Storage limit"
              value={storageLimit}
              onChange={(e) => setStorageLimit(e.target.value)}
              type="number"
              inputProps={{ min: 0 }}
              sx={{ width: 100 }}
            />
          </SoftBox>
          <SoftBox display="flex" gap={2} flexWrap="wrap">
            <TextField
              variant="standard"
              label="Monthly amount"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ width: 120 }}
            />
            <TextField
              variant="standard"
              label="Yearly amount"
              value={yearlyAmount}
              onChange={(e) => setYearlyAmount(e.target.value)}
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ width: 120 }}
            />
            <TextField
              variant="standard"
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              sx={{ width: 80 }}
            />
          </SoftBox>
          <SoftBox display="flex" flexDirection="column" gap={0}>
            <FormControlLabel
              control={
                <Switch
                  checked={nonSellable}
                  onChange={(e) => setNonSellable(e.target.checked)}
                  size="small"
                />
              }
              label="Not for Sale (plan can only be assigned by admins)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={hidden}
                  onChange={(e) => setHidden(e.target.checked)}
                  size="small"
                />
              }
              label="Hidden (plan will not be shown in the product tables at plans page)"
            />
          </SoftBox>
        </DialogContent>
        <DialogActions>
          <SoftButton variant="text" color="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </SoftButton>
          <SoftButton
            variant="gradient"
            color="info"
            onClick={handleCreate}
            disabled={createPlan.isPending || !name.trim()}
          >
            {createPlan.isPending ? 'Creating...' : 'Create'}
          </SoftButton>
        </DialogActions>
      </Dialog>

      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AdminPlansPage;
