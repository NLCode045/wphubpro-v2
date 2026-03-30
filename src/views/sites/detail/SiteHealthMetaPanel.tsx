import {
  getChecksForDashboard,
  groupChecksByCategory,
  normalizeSiteHealthSeverity,
  parseSiteHealthMeta,
  severityDisplayName,
  severityTotalsForChecks,
  SITE_HEALTH_UNCATEGORIZED,
  type SiteHealthChecksByCategory,
} from '@/lib/parseSiteHealthMeta';
import { parseSiteHealthScore } from '@/lib/siteHealthScore.ts';
import type { Site, SiteHealthCheck, SiteHealthSeverity } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardBody, Col, Collapse, Row } from 'react-bootstrap';
import SiteHealthScoreDonut from '@/views/sites/detail/SiteHealthScoreDonut';

import { formatChecked } from '@/views/sites/detail/siteDetailFormat';

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

/** Higher = more urgent; used to order categories and checks. */
const SEVERITY_URGENCY: Record<SiteHealthSeverity, number> = {
  critical: 5,
  warning: 4,
  pending: 3,
  unknown: 2,
  ok: 1,
};

function urgencyOfCheck(c: SiteHealthCheck): number {
  return SEVERITY_URGENCY[normalizeSiteHealthSeverity(c.severity)];
}

function worstUrgencyInCategory(checks: SiteHealthCheck[]): number {
  let w = 0;
  for (const c of checks) {
    const u = urgencyOfCheck(c);
    if (u > w) w = u;
  }
  return w;
}

function sortCategoriesByUrgency(groups: SiteHealthChecksByCategory[]): SiteHealthChecksByCategory[] {
  return [...groups].sort((a, b) => {
    const diff = worstUrgencyInCategory(b.checks) - worstUrgencyInCategory(a.checks);
    if (diff !== 0) return diff;
    return a.categoryLabel.localeCompare(b.categoryLabel);
  });
}

function sortChecksByUrgency(checks: SiteHealthCheck[]): SiteHealthCheck[] {
  return [...checks].sort((a, b) => {
    const diff = urgencyOfCheck(b) - urgencyOfCheck(a);
    if (diff !== 0) return diff;
    return a.label.localeCompare(b.label);
  });
}

/** Same bucket key as {@link groupChecksByCategory}. */
function categoryKeyForCheck(c: SiteHealthCheck): string {
  const raw = c.category?.trim();
  return raw && raw.length > 0 ? raw : SITE_HEALTH_UNCATEGORIZED;
}

function displayCategoryTitle(categoryLabel: string): string {
  return categoryLabel === SITE_HEALTH_UNCATEGORIZED ? 'Uncategorized / pending' : categoryLabel;
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
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    setSeverityFilter(null);
    setCategoryFilter(null);
  }, [site.$id, site.healthMeta]);

  const severityFilteredChecks = useMemo(() => {
    if (!severityFilter) return checks;
    return checks.filter((c) => normalizeSiteHealthSeverity(c.severity) === severityFilter);
  }, [checks, severityFilter]);

  const categoryOptions = useMemo(() => {
    const grouped = groupChecksByCategory(severityFilteredChecks);
    return sortCategoriesByUrgency(grouped).map(({ categoryLabel, checks: catChecks }) => ({
      categoryLabel,
      count: catChecks.length,
    }));
  }, [severityFilteredChecks]);

  useEffect(() => {
    if (categoryFilter == null) return;
    const stillExists = categoryOptions.some((o) => o.categoryLabel === categoryFilter);
    if (!stillExists) setCategoryFilter(null);
  }, [categoryOptions, categoryFilter]);

  const displayedChecks = useMemo(() => {
    if (!categoryFilter) return severityFilteredChecks;
    return severityFilteredChecks.filter((c) => categoryKeyForCheck(c) === categoryFilter);
  }, [severityFilteredChecks, categoryFilter]);

  const byCategorySorted = useMemo(() => {
    const grouped = groupChecksByCategory(displayedChecks);
    return sortCategoriesByUrgency(grouped).map(({ categoryLabel, checks: catChecks }) => ({
      categoryLabel,
      checks: sortChecksByUrgency(catChecks),
    }));
  }, [displayedChecks]);

  const score = useMemo(() => parseSiteHealthScore(site), [site]);

  const toggleSeverityFilter = (s: SiteHealthSeverity) => {
    setSeverityFilter((prev) => (prev === s ? null : s));
  };

  const toggleCategoryFilter = (label: string) => {
    setCategoryFilter((prev) => (prev === label ? null : label));
  };

  const lastCheckLine = (
    <p className="text-muted fs-xs mb-0">
      <span className="text-muted">Last check:</span> {formatChecked(site.lastChecked)}
    </p>
  );

  if (parseFailed) {
    return (
      <div className="d-flex flex-column gap-3">
        {lastCheckLine}
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
    return (
      <div className="d-flex flex-column gap-2">
        {lastCheckLine}
        <p className="text-muted mb-0">No detailed health snapshot stored for this site yet.</p>
      </div>
    );
  }

  const overall = snapshot.summary?.overall;
  const overallSev = overallToFilterSeverity(overall);
  const canFilterOverall =
    overallSev != null && checkTotals[overallSev] > 0;

  return (
    <div className="d-flex flex-column gap-3">
      <Row className="g-3 align-items-stretch">
        <Col md={4} lg={3} className="d-flex flex-column">
          <Card className="border shadow-none flex-grow-1 w-100 bg-transparent d-flex flex-column">
            <CardBody className="d-flex flex-column align-items-center justify-content-center text-center py-3 flex-grow-1">
              <SiteHealthScoreDonut site={site} size={80} surface="light" showHeading />
              <div className="fs-xxs text-muted mt-2">Score {score}/100</div>
            </CardBody>
          </Card>
        </Col>
        <Col md={8} lg={9} className="d-flex flex-column">
          <Card className="border shadow-none flex-grow-1 w-100 bg-transparent d-flex flex-column">
            <CardBody className="flex-grow-1 d-flex flex-column">
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
                <span className="text-muted">Last check:</span> {formatChecked(site.lastChecked)}
              </p>
              {severityFilter || categoryFilter ? (
                <p className="text-primary fs-xs fw-semibold mb-2">
                  Showing {displayedChecks.length} of {checks.length} checks
                  {severityFilter ? <> ({severityDisplayName(severityFilter)} only)</> : null}
                  {categoryFilter ? <> in {displayCategoryTitle(categoryFilter)}</> : null}. Toggle a filter badge
                  again to clear it.
                </p>
              ) : null}
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="text-muted fs-xs text-uppercase" style={{ letterSpacing: '0.04em' }}>
                  Severity
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
                  aria-label="Clear severity filter"
                  onClick={() => setSeverityFilter(null)}
                >
                  All severities
                </button>
              </div>
              {categoryOptions.length > 0 ? (
                <div className="d-flex flex-wrap align-items-center gap-2 mt-2 pt-2 border-top border-light">
                  <span className="text-muted fs-xs text-uppercase" style={{ letterSpacing: '0.04em' }}>
                    Category
                  </span>
                  {categoryOptions.map(({ categoryLabel, count }) => {
                    const active = categoryFilter === categoryLabel;
                    return (
                      <button
                        key={categoryLabel}
                        type="button"
                        className="badge badge-soft-light text-dark border-0"
                        style={
                          active
                            ? { boxShadow: '0 0 0 2px var(--bs-primary)', cursor: 'pointer' }
                            : { cursor: 'pointer' }
                        }
                        disabled={count <= 0}
                        aria-pressed={active}
                        aria-label={
                          active
                            ? `Clear category filter ${displayCategoryTitle(categoryLabel)}`
                            : `Show only ${displayCategoryTitle(categoryLabel)}`
                        }
                        onClick={() => toggleCategoryFilter(categoryLabel)}
                      >
                        {displayCategoryTitle(categoryLabel)} {count}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="badge badge-soft-secondary border-0"
                    style={{ cursor: categoryFilter ? 'pointer' : 'default' }}
                    disabled={!categoryFilter}
                    aria-label="Clear category filter"
                    onClick={() => setCategoryFilter(null)}
                  >
                    All categories
                  </button>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {(severityFilter || categoryFilter) && displayedChecks.length === 0 ? (
        <p className="text-muted mb-0">No checks match this filter.</p>
      ) : null}

      <div className="d-flex flex-column gap-3">
        {byCategorySorted.map(({ categoryLabel, checks: catChecks }) => {
          const totals = severityTotalsForChecks(catChecks);
          const title = displayCategoryTitle(categoryLabel);
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
