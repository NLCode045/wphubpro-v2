import CustomChartJs from '@/components/CustomChartJs'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useFinanceDashboard } from '@/domains/admin/finance/hooks'
import type { FinanceDashboardPeriod } from '@/domains/admin/finance/types'
import { AppwriteFunctionError } from '@/integrations/appwrite/errors'
import { getColor } from '@/helpers/color'
import type { ChartJSOptionsType } from '@/types'
import {
  BarController,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { useMemo, useState } from 'react'
import { Badge, Button, ButtonGroup, Card, Col, Row, Spinner, Table } from 'react-bootstrap'
import { Link } from 'react-router'

function formatMoney(cents: number, currency = 'eur') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

const PERIODS: { id: FinanceDashboardPeriod; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
]

function actionVariant(action: string): 'success' | 'danger' | 'primary' | 'secondary' | 'warning' | 'info' {
  switch (action) {
    case 'New':
      return 'success'
    case 'Canceled':
      return 'danger'
    case 'Upgrade':
      return 'primary'
    case 'Downgrade':
      return 'warning'
    default:
      return 'secondary'
  }
}

const FinanceDashboardPage = () => {
  const [period, setPeriod] = useState<FinanceDashboardPeriod>('week')
  const { data, isLoading, error } = useFinanceDashboard(period)

  const revenueChart = useMemo<() => ChartJSOptionsType>(() => {
    const buckets = data?.stats?.buckets ?? []
    return () => ({
      data: {
        labels: buckets.map((b) => b.label),
        datasets: [
          {
            label: 'Revenue',
            data: buckets.map((b) => Math.round((b.revenueCents / 100) * 100) / 100),
            backgroundColor: getColor('primary'),
            borderColor: getColor('primary'),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          title: { display: true, text: 'Revenue by period' },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Amount' },
          },
        },
      },
    })
  }, [data?.stats?.buckets])

  const activityChart = useMemo<() => ChartJSOptionsType>(() => {
    const buckets = data?.stats?.buckets ?? []
    return () => ({
      data: {
        labels: buckets.map((b) => b.label),
        datasets: [
          {
            type: 'bar' as const,
            label: 'New',
            data: buckets.map((b) => b.newSubscriptions),
            backgroundColor: getColor('success'),
          },
          {
            type: 'bar' as const,
            label: 'Canceled',
            data: buckets.map((b) => b.cancellations),
            backgroundColor: getColor('danger'),
          },
          {
            type: 'bar' as const,
            label: 'Upgrades',
            data: buckets.map((b) => b.upgrades),
            backgroundColor: getColor('primary'),
          },
          {
            type: 'bar' as const,
            label: 'Downgrades',
            data: buckets.map((b) => b.downgrades),
            backgroundColor: getColor('warning'),
          },
          {
            type: 'line' as const,
            label: 'Cumulative net (new − canceled)',
            data: buckets.map((b) => b.cumulativeNetSubscriptions),
            borderColor: getColor('secondary-color'),
            backgroundColor: 'transparent',
            yAxisID: 'y1',
            tension: 0.2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          title: { display: true, text: 'Subscriptions activity' },
        },
        scales: {
          x: { stacked: false },
          y: {
            beginAtZero: true,
            position: 'left' as const,
            title: { display: true, text: 'Count' },
          },
          y1: {
            beginAtZero: true,
            position: 'right' as const,
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Net cumulative' },
          },
        },
      },
    })
  }, [data?.stats?.buckets])

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    )
  }

  if (error || !data) {
    const hint =
      error instanceof AppwriteFunctionError &&
      (String(error.message).includes('Invalid') || String(error.rawBody).includes('admin-finance-dashboard'))
        ? ' Deploy the latest `stripe-subscriptions` Appwrite function so it includes the `admin-finance-dashboard` action.'
        : ''
    return (
      <div className="border border-danger border-opacity-25 rounded p-3 bg-danger-subtle">
        <p className="text-danger mb-1 fw-semibold">Could not load finance dashboard</p>
        <p className="text-danger small mb-0">{error?.message ?? 'Unknown error.'}{hint}</p>
      </div>
    )
  }

  const { kpis, byPlan, upgradeDowngradeNote, truncated, rangeLabel, buckets } = data.stats
  const cumulativeNetEnd =
    buckets.length > 0 ? buckets[buckets.length - 1].cumulativeNetSubscriptions : 0

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <span className="text-muted small me-2">Period</span>
          <ButtonGroup size="sm">
            {PERIODS.map((p) => (
              <Button
                key={p.id}
                variant={period === p.id ? 'primary' : 'outline-primary'}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
        <span className="text-muted small">{data.rangeLabel ?? rangeLabel}</span>
      </div>

      {(truncated || kpis.revenueAllTimeTruncated) && (
        <p className="text-muted small">
          Some figures are capped by pagination limits (Stripe list samples).
        </p>
      )}

      <Row className="g-3 mb-4">
        <Col md={6} lg={4}>
          <div className="border rounded p-3 h-100 bg-light-subtle">
            <div className="text-muted text-uppercase small">Active + trialing (sample)</div>
            <div className="fs-4 fw-semibold">{kpis.activeSubscriptionsNow}</div>
          </div>
        </Col>
        <Col md={6} lg={4}>
          <div className="border rounded p-3 h-100 bg-light-subtle">
            <div className="text-muted text-uppercase small">Revenue (period)</div>
            <div className="fs-4 fw-semibold">{formatMoney(kpis.revenueInPeriodCents)}</div>
          </div>
        </Col>
        <Col md={6} lg={4}>
          <div className="border rounded p-3 h-100 bg-light-subtle">
            <div className="text-muted text-uppercase small">Revenue (all time, sample)</div>
            <div className="fs-4 fw-semibold">{formatMoney(kpis.revenueAllTimeCents)}</div>
            {kpis.revenueAllTimeTruncated && (
              <div className="small text-muted">May be truncated — not all invoices loaded.</div>
            )}
          </div>
        </Col>
        <Col md={6} lg={3}>
          <div className="border rounded p-3 h-100 bg-light-subtle">
            <div className="text-muted text-uppercase small">New (period)</div>
            <div className="fs-5 fw-semibold">{kpis.newInPeriod}</div>
          </div>
        </Col>
        <Col md={6} lg={3}>
          <div className="border rounded p-3 h-100 bg-light-subtle">
            <div className="text-muted text-uppercase small">Canceled (period)</div>
            <div className="fs-5 fw-semibold">{kpis.canceledInPeriod}</div>
          </div>
        </Col>
        <Col md={6} lg={3}>
          <div className="border rounded p-3 h-100 bg-light-subtle">
            <div className="text-muted text-uppercase small">Upgrades (period)</div>
            <div className="fs-5 fw-semibold">{kpis.upgradesInPeriod}</div>
          </div>
        </Col>
        <Col md={6} lg={3}>
          <div className="border rounded p-3 h-100 bg-light-subtle">
            <div className="text-muted text-uppercase small">Downgrades (period)</div>
            <div className="fs-5 fw-semibold">{kpis.downgradesInPeriod}</div>
          </div>
        </Col>
        <Col md={6} lg={4}>
          <div className="border rounded p-3 h-100 bg-light-subtle">
            <div className="text-muted text-uppercase small">Cumulative net new − canceled (range)</div>
            <div className="fs-5 fw-semibold">{cumulativeNetEnd}</div>
            <div className="small text-muted">Running total across buckets in the chart.</div>
          </div>
        </Col>
      </Row>

      {upgradeDowngradeNote && <p className="text-muted small">{upgradeDowngradeNote}</p>}

      <Row className="g-3 mb-4">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Body>
              <CustomChartJs
                type="bar"
                height={300}
                getOptions={revenueChart}
                plugins={[BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend]}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="h-100">
            <Card.Body>
              <CustomChartJs
                type="bar"
                height={300}
                getOptions={activityChart}
                plugins={[
                  BarController,
                  BarElement,
                  LineController,
                  LineElement,
                  PointElement,
                  CategoryScale,
                  LinearScale,
                  Tooltip,
                  Legend,
                ]}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {byPlan.length > 0 && (
        <>
          <h6 className="mb-2">New subscriptions by plan (period)</h6>
          <div className="table-responsive mb-4">
            <Table size="sm" striped>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {byPlan.map((row) => (
                  <tr key={row.productId}>
                    <td>{row.name}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}

      <Card className="mb-4">
        <Card.Header className="bg-transparent py-3">
          <Card.Title as="h5" className="mb-0">
            Recent paid invoices
          </Card.Title>
          <p className="text-muted small mt-1 mb-0">
            Invoice ID links to the related subscription when available.
          </p>
        </Card.Header>
        <Card.Body className="pt-0">
          <div className="table-responsive">
            <Table size="sm" align-middle className="mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Invoice ID</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPaidInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="small text-nowrap">{new Date(inv.created * 1000).toLocaleString()}</td>
                    <td className="small">{inv.customerDisplayName}</td>
                    <td className="small">
                      {inv.subscriptionId ? (
                        <Link
                          to={ROUTE_PATHS.adminFinanceSubscriptionPath(inv.subscriptionId)}
                          className="font-monospace"
                        >
                          {inv.number ?? inv.id}
                        </Link>
                      ) : (
                        <span className="font-monospace">{inv.number ?? inv.id}</span>
                      )}
                      {inv.number && inv.id !== inv.number && (
                        <span className="text-muted d-block font-monospace fs-xs">{inv.id}</span>
                      )}
                    </td>
                    <td>{formatMoney(inv.amount_paid, inv.currency)}</td>
                  </tr>
                ))}
                {data.recentPaidInvoices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-muted text-center py-3">
                      No paid invoices.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header className="bg-transparent py-3">
          <Card.Title as="h5" className="mb-0">
            Recent subscription changes
          </Card.Title>
          <p className="text-muted small mt-1 mb-0">
            From Stripe events (about the last 30 days). User name links to the subscription.
          </p>
        </Card.Header>
        <Card.Body className="pt-0">
          <div className="table-responsive">
            <Table size="sm" align-middle className="mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Plan</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSubscriptionChanges.map((row) => (
                  <tr key={row.id}>
                    <td className="small text-nowrap">{new Date(row.created * 1000).toLocaleString()}</td>
                    <td className="small">
                      <Link to={ROUTE_PATHS.adminFinanceSubscriptionPath(row.subscriptionId)}>
                        {row.userDisplayName}
                      </Link>
                    </td>
                    <td>{formatMoney(row.amountCents, row.currency)}</td>
                    <td className="small">{row.planName}</td>
                    <td>
                      <Badge bg={actionVariant(row.action)}>{row.action}</Badge>
                    </td>
                  </tr>
                ))}
                {data.recentSubscriptionChanges.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted text-center py-3">
                      No recent events.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}

export default FinanceDashboardPage
