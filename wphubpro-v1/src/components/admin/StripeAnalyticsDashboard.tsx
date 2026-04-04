/**
 * Stripe Analytics Dashboard - shared component for admin dashboard and plan detail.
 * When productFilter is set, data is filtered to that product only.
 */
import React, { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import { alpha } from '@mui/material/styles';
import { executeFunction } from '../../integrations/appwrite/executeFunction';

export interface DashboardData {
  metrics: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    canceledSubscriptions: number;
    totalEarnings: number;
    totalEarningsAllTime?: number;
    newSubscriptions: number;
    recentCancellations: number;
    upgrades: number;
    downgrades: number;
  };
  productBreakdown: {
    id: string;
    name: string;
    subscriptions: number;
  }[];
  chartData: {
    date: string;
    earnings: number;
    earningsCumulative?: number;
    subscriptions: number;
  }[];
}

export interface StripeAnalyticsDashboardProps {
  /** When set, filter data to this product only (plan detail view) */
  productFilter?: string;
  /** Optional title override */
  title?: string;
  /** Compact mode for embedding in plan detail */
  compact?: boolean;
}

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'alltime', label: 'All Time' },
  { value: 'next_week', label: 'Next Week' },
  { value: 'end_of_this_month', label: 'End of This Month' },
  { value: 'end_of_next_month', label: 'End of Next Month' },
  { value: 'all_invoiced', label: 'All Invoiced' },
];

function MetricCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  secondaryValue,
  secondaryLabel,
  valueLabel,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  secondaryValue?: string | number;
  secondaryLabel?: string;
  valueLabel?: string;
}) {
  return (
    <Card sx={{ p: 2, height: '100%' }}>
      <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <SoftTypography variant="caption" color="secondary" fontWeight="medium">
          {title}
        </SoftTypography>
        <SoftBox
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'grey.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </SoftBox>
      </SoftBox>
      {valueLabel && (
        <SoftTypography variant="caption" color="secondary" sx={{ display: 'block' }}>
          {valueLabel}
        </SoftTypography>
      )}
      <SoftTypography variant="h5" fontWeight="bold">
        {value}
      </SoftTypography>
      {secondaryValue != null && secondaryLabel && (
        <SoftTypography variant="body2" color="secondary" fontWeight="medium" sx={{ mt: 1, display: 'block' }}>
          {secondaryLabel}: {secondaryValue}
        </SoftTypography>
      )}
      {trend && (
        <SoftTypography
          variant="caption"
          color={trendUp === true ? 'success' : trendUp === false ? 'error' : 'secondary'}
          fontWeight="medium"
          sx={{ mt: 0.5, display: 'block' }}
        >
          {trend}
        </SoftTypography>
      )}
    </Card>
  );
}

export default function StripeAnalyticsDashboard({
  productFilter,
  title = 'Analytics Dashboard',
  compact = false,
}: StripeAnalyticsDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [period, setPeriod] = useState('week');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(productFilter ? [productFilter] : []);
  const [isFetching, setIsFetching] = useState(false);
  const [showPeriodEarnings, setShowPeriodEarnings] = useState(true);
  const [showCumulativeEarnings, setShowCumulativeEarnings] = useState(true);

  const effectiveProducts = productFilter ? [productFilter] : selectedProducts;

  const fetchData = async () => {
    if (!data) setLoading(true);
    setIsFetching(true);
    setError(null);
    try {
      const payload: { period: string; products?: string[] } = { period };
      if (effectiveProducts.length > 0) {
        payload.products = effectiveProducts;
      }
      const result = await executeFunction<DashboardData | { error?: string; needsSetup?: boolean }>(
        'stripe-dashboard',
        payload
      );
      if (result && 'error' in result && result.error) {
        if (result.needsSetup) setNeedsSetup(true);
        throw new Error(result.error);
      }
      setData(result as DashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, productFilter ?? '', selectedProducts.join(',')]);

  if (needsSetup) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <SoftTypography variant="h6" color="error" gutterBottom>
          Setup Required
        </SoftTypography>
        <SoftTypography variant="body2" color="secondary" sx={{ mb: 2 }}>
          Please configure STRIPE_SECRET_KEY in Platform Settings to view the dashboard.
        </SoftTypography>
        <SoftButton variant="gradient" color="info" onClick={fetchData}>
          Retry Connection
        </SoftButton>
      </Card>
    );
  }

  if (loading && !data) {
    return (
      <SoftBox display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8}>
        <CircularProgress size={40} />
        <SoftTypography variant="body2" color="secondary" sx={{ mt: 2 }}>
          Loading analytics...
        </SoftTypography>
      </SoftBox>
    );
  }

  if (error) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <SoftTypography variant="h6" color="error" gutterBottom>
          Error Loading Data
        </SoftTypography>
        <SoftTypography variant="body2" color="secondary" sx={{ mb: 2 }}>
          {error}
        </SoftTypography>
        <SoftButton variant="gradient" color="info" onClick={fetchData}>
          Try Again
        </SoftButton>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <SoftBox>
      <SoftBox mb={3}>
        <SoftTypography variant="h5" fontWeight="bold">
          {title}
        </SoftTypography>
        <SoftTypography variant="body2" color="secondary">
          {productFilter ? `Data for this plan only` : 'Overview of Stripe subscriptions and revenue'}
        </SoftTypography>
      </SoftBox>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Total Earnings"
            valueLabel="In selected period"
            value={`$${data.metrics.totalEarnings.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            icon={<span className="material-icons" style={{ color: '#10b981', fontSize: 20 }}>payments</span>}
            secondaryValue={
              data.metrics.totalEarningsAllTime != null
                ? `$${data.metrics.totalEarningsAllTime.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : undefined
            }
            secondaryLabel="All-time total"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Active Subscriptions"
            value={data.metrics.activeSubscriptions.toLocaleString()}
            icon={<span className="material-icons" style={{ color: '#6366f1', fontSize: 20 }}>trending_up</span>}
            trend={`+${data.metrics.newSubscriptions} this period`}
            trendUp={true}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Cancellations"
            value={data.metrics.canceledSubscriptions.toLocaleString()}
            icon={<span className="material-icons" style={{ color: '#f43f5e', fontSize: 20 }}>person_off</span>}
            trend={`${data.metrics.recentCancellations} recent`}
            trendUp={false}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Upgrades / Downgrades"
            value={`${data.metrics.upgrades} / ${data.metrics.downgrades}`}
            icon={<span className="material-icons" style={{ color: '#f59e0b', fontSize: 20 }}>swap_horiz</span>}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={productFilter ? 12 : 8}>
          <Card sx={{ p: 2 }}>
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <SoftBox display="flex" alignItems="center" gap={1}>
                <Select
                  size="small"
                  sx={{ minWidth: 140 }}
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  inputProps={{ 'aria-label': 'Report period' }}
                >
                  {PERIOD_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
                <IconButton onClick={fetchData} disabled={isFetching} size="small" aria-label="Refresh">
                  <span className="material-icons">{isFetching ? 'hourglass_empty' : 'refresh'}</span>
                </IconButton>
              </SoftBox>
              <SoftTypography variant="h6" fontWeight="bold">
                Revenue Overview
              </SoftTypography>
            </SoftBox>
            <SoftBox display="flex" flexWrap="wrap" gap={2} mb={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showPeriodEarnings}
                    onChange={(e) => setShowPeriodEarnings(e.target.checked)}
                    size="small"
                    sx={{ color: '#4f46e5', '&.Mui-checked': { color: '#4f46e5' } }}
                  />
                }
                label={
                  <SoftTypography variant="caption" fontWeight="medium">
                    Period earnings (per day)
                  </SoftTypography>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showCumulativeEarnings}
                    onChange={(e) => setShowCumulativeEarnings(e.target.checked)}
                    size="small"
                    sx={{ color: '#10b981', '&.Mui-checked': { color: '#10b981' } }}
                  />
                }
                label={
                  <SoftTypography variant="caption" fontWeight="medium">
                    All-time cumulative
                  </SoftTypography>
                }
              />
            </SoftBox>
            <SoftBox height={compact ? 200 : 280}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e4e4e7',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number, name: string) => [`$${Number(value).toFixed(2)}`, name]}
                  />
                  {showPeriodEarnings && (
                    <Line
                      type="monotone"
                      dataKey="earnings"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                      name="Period earnings"
                    />
                  )}
                  {showCumulativeEarnings && data.chartData.some((d) => d.earningsCumulative != null) && (
                    <Line
                      type="monotone"
                      dataKey="earningsCumulative"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                      name="All-time cumulative"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </SoftBox>
          </Card>
        </Grid>

        {!productFilter && (
          <Grid item xs={12} lg={4}>
            <Card
              sx={{
                p: 2.5,
                height: '100%',
                borderRadius: 2,
                boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04), 0 2px 8px -2px rgba(0,0,0,0.02)',
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <SoftBox
                display="flex"
                justifyContent="space-between"
                alignItems="flex-start"
                mb={2}
                flexWrap="wrap"
                gap={1}
              >
                <SoftBox>
                  <SoftBox display="flex" alignItems="center" gap={1} mb={0.5}>
                    <SoftBox
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: 20 }}>
                        category
                      </span>
                    </SoftBox>
                    <SoftTypography variant="h6" fontWeight="bold">
                      Subscriptions by Product
                    </SoftTypography>
                  </SoftBox>
                  <SoftTypography variant="caption" color="secondary">
                    Select plans to filter revenue & charts
                  </SoftTypography>
                </SoftBox>
                {selectedProducts.length > 0 && (
                  <SoftButton
                    size="small"
                    variant="outlined"
                    color="info"
                    onClick={() => setSelectedProducts([])}
                    sx={{ textTransform: 'none', minWidth: 'auto', px: 1.5 }}
                  >
                    Clear all
                  </SoftButton>
                )}
              </SoftBox>
              {data.productBreakdown.length > 0 ? (
                <SoftBox
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    maxHeight: 320,
                    overflowY: 'auto',
                    pr: 0.5,
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-track': { bgcolor: 'grey.100', borderRadius: 3 },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 3 },
                  }}
                >
                  {data.productBreakdown.map((product) => {
                    const isSelected = selectedProducts.includes(product.id);
                    const totalSubs = data.productBreakdown.reduce((s, p) => s + p.subscriptions, 0);
                    const pct = totalSubs > 0 ? Math.round((product.subscriptions / totalSubs) * 100) : 0;
                    return (
                      <SoftBox
                        key={product.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedProducts(selectedProducts.filter((id) => id !== product.id));
                          } else {
                            setSelectedProducts([...selectedProducts, product.id]);
                          }
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 1.5,
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: isSelected ? 'primary.main' : 'grey.200',
                          bgcolor: (theme) =>
                            isSelected ? alpha(theme.palette.primary.main, 0.08) : 'grey.50',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: (theme) =>
                              isSelected ? alpha(theme.palette.primary.main, 0.12) : 'grey.100',
                            borderColor: isSelected ? 'primary.main' : 'grey.300',
                          },
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          size="small"
                          color="primary"
                          sx={{ p: 0, pointerEvents: 'none' }}
                        />
                        <SoftBox flex={1} minWidth={0}>
                          <SoftTypography
                            variant="body2"
                            fontWeight="medium"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={product.name}
                          >
                            {product.name}
                          </SoftTypography>
                          <SoftBox
                            sx={{
                              height: 4,
                              mt: 0.75,
                              borderRadius: 2,
                              bgcolor: 'grey.200',
                              overflow: 'hidden',
                            }}
                          >
                            <SoftBox
                              sx={{
                                height: '100%',
                                width: `${pct}%`,
                                bgcolor: isSelected ? 'primary.main' : 'grey.400',
                                borderRadius: 2,
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </SoftBox>
                        </SoftBox>
                        <Chip
                          label={product.subscriptions}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            minWidth: 36,
                            bgcolor: isSelected ? 'primary.main' : 'grey.200',
                            color: isSelected ? 'white' : 'grey.700',
                          }}
                        />
                      </SoftBox>
                    );
                  })}
                </SoftBox>
              ) : (
                <SoftBox
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  py={5}
                  sx={{ color: 'grey.500' }}
                >
                  <SoftBox
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: 'grey.100',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.5,
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: 28 }}>
                      category
                    </span>
                  </SoftBox>
                  <SoftTypography variant="body2" fontWeight="medium">
                    No product data available
                  </SoftTypography>
                  <SoftTypography variant="caption" color="secondary" sx={{ mt: 0.5 }}>
                    Products will appear once subscriptions exist
                  </SoftTypography>
                </SoftBox>
              )}
            </Card>
          </Grid>
        )}
      </Grid>
    </SoftBox>
  );
}
