import { getColor } from '@/helpers/color';
import { useLayoutContext } from '@/context/useLayoutContext.tsx';
import {
  aggregateByCategory,
  buildCategoryStackedBarSeries,
  getChecksForDashboard,
  groupChecksByCategory,
  normalizeSiteHealthSeverity,
  parseSiteHealthMeta,
  severityDisplayName,
  severityTotalsForChecks,
  SITE_HEALTH_UNCATEGORIZED,
} from '@/lib/parseSiteHealthMeta';
import { parseSiteHealthScore } from '@/lib/siteHealthScore.ts';
import type { Site, SiteHealthCheck, SiteHealthSeverity } from '@/types';
import type { ApexOptions } from 'apexcharts';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Button, Card, CardBody, Col, Collapse, Row } from 'react-bootstrap';
import ReactApexChart from 'react-apexcharts';
import SiteHealthScoreDonut from '@/views/sites/detail/SiteHealthScoreDonut';

import Loader from '@/components/Loader.tsx';
import { formatChecked } from '@/views/sites/detail/siteDetailFormat';

const CHART_COLORS = {
  ok: 'success',
  warning: 'warning',
  critical: 'danger',
  pending: 'info',
  unknown: 'secondary',
} as const satisfies Record<SiteHealthSeverity, string>;

function overallBadgeVariant(
  overall: string | undefined,
): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
  const o = String(overall ?? '').toLowerCase();
  if (o === 'critical') return 'danger';
  if (o === 'warning') return 'warning';
  if (o === 'ok' || o === 'good') return 'success';
  if (o === 'pending') return 'info';
  return 'secondary';
}

function overallLabel(overall: string | undefined): string {
  if (!overall) return 'Unknown';
  return overall.charAt(0).toUpperCase() + overall.slice(1).toLowerCase();
}

/** Map `summary.overall` to a check severity for filtering (good → ok). */
function overallToFilterSeverity(overall: string | undefined): SiteHealthSeverity | null {
  const o = String(overall ?? '').toLowerCase();
  if (o === 'critical') return 'critical';
  if (o === 'warning') return 'warning';
  if (o === 'ok' || o === 'good') return 'ok';
  if (o === 'pending') return 'pending';
  if (o === 'unknown') return 'unknown';
  return null;
}

function severitySoftClass(sev: SiteHealthSeverity): string {
  switch (sev) {
    case 'ok':
      return 'badge-soft-success';
    case 'warning':
      return 'badge-soft-warning';
    case 'critical':
      return 'badge-soft-danger';
    case 'pending':
      return 'badge-soft-info';
    default:
      return 'badge-soft-secondary';
  }
}

function formatCategorySummaryLine(counts: Record<SiteHealthSeverity, number>): string {
  const parts: string[] = [];
  if (counts.ok) parts.push(`${counts.ok} ok`);
  if (counts.warning) parts.push(`${counts.warning} warning`);
  if (counts.critical) parts.push(`${counts.critical} critical`);
  if (counts.pending) parts.push(`${counts.pending} pending`);
  if (counts.unknown) parts.push(`${counts.unknown} unknown`);
  return parts.length ? parts.join(' · ') : 'No checks';
}

const SEVERITY_ORDER: SiteHealthSeverity[] = ['ok', 'warning', 'critical', 'pending', 'unknown'];

type FilterSeverityBadgeProps = {
  severity: SiteHealthSeverity;
  count: number;
  active: boolean;
  onToggle: (s: SiteHealthSeverity) => void;
};

function FilterSeverityBadge({ severity, count, active, onToggle }: FilterSeverityBadgeProps) {
  const label = severityDisplayName(severity);
  const disabled = count <= 0;
  return (
    <button
      type="button"
      className={`badge ${severitySoftClass(severity)} border-0`}
      style={
        active ? { boxShadow: '0 0 0 2px var(--bs-primary)', cursor: disabled ? 'not-allowed' : 'pointer' } : { cursor: disabled ? 'not-allowed' : 'pointer' }
      }
      disabled={disabled}
      aria-pressed={active}
      aria-label={
        disabled
          ? `${label}: no checks`
          : active
            ? `${label}: filter active, click to show all checks`
            : `Show only ${label} checks`
      }
      onClick={() => onToggle(severity)}
    >
      {label} {count}
    </button>
  );
}

type SiteHealthCategoryChartProps = {
  rows: ReturnType<typeof aggregateByCategory>;
};

function SiteHealthCategoryChart({ rows }: SiteHealthCategoryChartProps) {
  const { skin, theme } = useLayoutContext();
  const { categories, series } = useMemo(() => buildCategoryStackedBarSeries(rows), [rows]);

  const options: ApexOptions = useMemo(() => {
    const sevOrder: SiteHealthSeverity[] = ['ok', 'warning', 'critical', 'pending', 'unknown'];
    const colors = sevOrder.map((s) => getColor(CHART_COLORS[s]));
    const chartHeight = Math.min(420, Math.max(160, 40 + categories.length * 36));

    return {
      chart: {
        type: 'bar',
        stacked: true,
        stackType: '100%',
        toolbar: { show: false },
        fontFamily: 'inherit',
        height: chartHeight,
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '72%',
          borderRadius: 4,
          borderRadiusApplication: 'end',
        },
      },
      stroke: { show: true, width: 1, colors: ['#fff'] },
      colors,
      dataLabels: { enabled: false },
      xaxis: { categories, labels: { style: { fontSize: '12px' } } },
      yaxis: { labels: { maxWidth: 160, style: { fontSize: '12px' } } },
      legend: { position: 'top', horizontalAlign: 'left', offsetY: 0 },
      grid: {
        borderColor: getColor('border-color'),
        strokeDashArray: 4,
        padding: { left: 8, right: 8, top: 0, bottom: 0 },
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val} checks`,
        },
      },
    };
  }, [categories, skin, theme]);

  if (categories.length === 0) return null;

  return (
    <Suspense fallback={<Loader />}>
      <ReactApexChart type="bar" options={options} series={series} height={options.chart?.height} />
    </Suspense>
  );
}

type CheckRowProps = { check: SiteHealthCheck };

function SiteHealthCheckRow({ check }: CheckRowProps) {
  const [open, setOpen] = useState(false);
  const sev = normalizeSiteHealthSeverity(check.severity);
  const hasMessage = Boolean(check.message && check.message.trim().length > 0);
  const isAsync = check.execution === 'async_pending';

  return (
    <div className="border-bottom py-2">
      <div className="d-flex flex-wrap align-items-start gap-2">
        <span className={`badge ${severitySoftClass(sev)} align-self-center`}>{severityDisplayName(sev)}</span>
        {isAsync ? (
          <span className="badge badge-soft-info align-self-center">Async</span>
        ) : null}
        <div className="flex-grow-1 min-w-0">
          <div className="fw-semibold small">{check.label}</div>
          {check.module_id ? (
            <div className="text-muted fs-xxs text-truncate" title={check.module_id}>
              {check.module_id}
            </div>
          ) : null}
        </div>
        {hasMessage ? (
          <Button
            variant="link"
            className="p-0 fs-xs text-decoration-none flex-shrink-0"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? 'Hide details' : 'Details'}
          </Button>
        ) : null}
      </div>
      {hasMessage ? (
        <Collapse in={open}>
          <div className="mt-2 small text-muted bg-light rounded p-2">{check.message}</div>
        </Collapse>
      ) : null}
    </div>
  );
}

type SiteHealthMetaPanelProps = {
  site: Site;
};

export default function SiteHealthMetaPanel({ site }: SiteHealthMetaPanelProps) {
  const raw = site.healthMeta?.trim() ?? '';
  const snapshot = useMemo(() => parseSiteHealthMeta(site.healthMeta), [site.healthMeta]);
  const parseFailed = raw.length > 2 && snapshot === null;

  const checks = useMemo(() => (snapshot ? getChecksForDashboard(snapshot) : []), [snapshot]);
  const checkTotals = useMemo(() => severityTotalsForChecks(checks), [checks]);
  const [severityFilter, setSeverityFilter] = useState<SiteHealthSeverity | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    setSeverityFilter(null);
  }, [site.$id, site.healthMeta]);

  const displayedChecks = useMemo(() => {
    if (!severityFilter) return checks;
    return checks.filter((c) => normalizeSiteHealthSeverity(c.severity) === severityFilter);
  }, [checks, severityFilter]);

  const byCategory = useMemo(() => groupChecksByCategory(displayedChecks), [displayedChecks]);
  const aggRows = useMemo(() => aggregateByCategory(displayedChecks), [displayedChecks]);
  const score = useMemo(() => parseSiteHealthScore(site), [site]);

  const totalFromSummary =
    typeof snapshot?.summary?.total_checks === 'number' ? snapshot.summary.total_checks : undefined;

  const toggleSeverityFilter = (s: SiteHealthSeverity) => {
    setSeverityFilter((prev) => (prev === s ? null : s));
  };

  if (parseFailed) {
    return (
      <div className="d-flex flex-column gap-3">
        <p className="text-danger mb-0">Health snapshot could not be read (invalid JSON).</p>
        <Button variant="outline-secondary" size="sm" className="align-self-start" onClick={() => setShowRaw((v) => !v)}>
          {showRaw ? 'Hide raw data' : 'Show raw data'}
        </Button>
        <Collapse in={showRaw}>
          <pre className="bg-light rounded p-3 small mb-0 overflow-auto" style={{ maxHeight: '40vh' }}>
            {raw}
          </pre>
        </Collapse>
      </div>
    );
  }

  if (!snapshot || checks.length === 0) {
    return <p className="text-muted mb-0">No detailed health snapshot stored for this site yet.</p>;
  }

  const overall = snapshot.summary?.overall;
  const overallSev = overallToFilterSeverity(overall);
  const canFilterOverall =
    overallSev != null && checkTotals[overallSev] > 0;

  return (
    <div className="d-flex flex-column gap-3">
      <Row className="g-3 align-items-stretch">
        <Col md={4} lg={3} className="d-flex">
          <Card className="border shadow-none flex-grow-1 bg-transparent">
            <CardBody className="d-flex flex-column align-items-center justify-content-center text-center py-3">
              <SiteHealthScoreDonut site={site} size={80} surface="light" showHeading />
              <div className="fs-xxs text-muted mt-2">Score {score}/100</div>
            </CardBody>
          </Card>
        </Col>
        <Col md={8} lg={9}>
          <Card className="border shadow-none h-100 bg-transparent">
            <CardBody>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className="text-muted fs-sm">Overall</span>
                <Button
                  variant={overallBadgeVariant(overall)}
                  size="sm"
                  className="fs-6 py-1 px-2"
                  disabled={!canFilterOverall}
                  active={overallSev != null && severityFilter === overallSev}
                  onClick={() => overallSev && toggleSeverityFilter(overallSev)}
                  aria-pressed={overallSev != null && severityFilter === overallSev}
                  aria-label={
                    canFilterOverall
                      ? severityFilter === overallSev
                        ? 'Clear overall status filter'
                        : `Show only ${overallLabel(overall)} checks`
                      : 'Overall status filter unavailable'
                  }
                >
                  {overallLabel(overall)}
                </Button>
              </div>
              <p className="text-muted fs-xs mb-2">
                Snapshot: {formatChecked(snapshot.collected_at)}
                {typeof snapshot.collection_duration_ms === 'number' ? (
                  <> · Collected in {snapshot.collection_duration_ms} ms</>
                ) : null}
              </p>
              {severityFilter ? (
                <p className="text-primary fs-xs fw-semibold mb-2">
                  Showing {displayedChecks.length} of {checks.length} checks (
                  {severityDisplayName(severityFilter)} only). Click the same badge again to show all.
                </p>
              ) : null}
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="text-muted fs-xs text-uppercase" style={{ letterSpacing: '0.04em' }}>
                  Filter
                </span>
                {SEVERITY_ORDER.map((sev) => (
                  <FilterSeverityBadge
                    key={sev}
                    severity={sev}
                    count={checkTotals[sev]}
                    active={severityFilter === sev}
                    onToggle={toggleSeverityFilter}
                  />
                ))}
                <button
                  type="button"
                  className="badge badge-soft-secondary border-0"
                  style={{ cursor: severityFilter ? 'pointer' : 'default' }}
                  disabled={!severityFilter}
                  aria-label="Show all checks"
                  onClick={() => setSeverityFilter(null)}
                >
                  All ({typeof totalFromSummary === 'number' ? totalFromSummary : checks.length})
                </button>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {aggRows.length > 0 ? (
        <Card className="border shadow-none bg-transparent">
          <CardBody>
            <h6 className="fs-base mb-2">Checks by category</h6>
            <p className="text-muted fs-xs mb-3">100% stacked: share of severities within each category.</p>
            <SiteHealthCategoryChart rows={aggRows} />
          </CardBody>
        </Card>
      ) : null}

      {severityFilter && displayedChecks.length === 0 ? (
        <p className="text-muted mb-0">No checks match this filter.</p>
      ) : null}

      <div className="d-flex flex-column gap-3">
        {byCategory.map(({ categoryLabel, checks: catChecks }) => {
          const totals = severityTotalsForChecks(catChecks);
          const title =
            categoryLabel === SITE_HEALTH_UNCATEGORIZED ? 'Uncategorized / pending' : categoryLabel;
          return (
            <Card key={categoryLabel} className="border shadow-none bg-transparent">
              <CardBody>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                  <h6 className="fs-base mb-0">{title}</h6>
                  <span className="text-muted fs-xs">{formatCategorySummaryLine(totals)}</span>
                </div>
                <div>
                  {catChecks.map((c) => (
                    <SiteHealthCheckRow key={c.id} check={c} />
                  ))}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
