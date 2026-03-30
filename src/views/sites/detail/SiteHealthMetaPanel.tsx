import {
  categoryLabelForCheck,
  getChecksForDashboard,
  groupChecksByCategory,
  groupChecksByResult,
  normalizeSiteHealthSeverity,
  parseSiteHealthMeta,
  severityDisplayName,
  severityTotalsForChecks,
  SITE_HEALTH_UNCATEGORIZED,
  sortCategoryGroupsCriticalFirst,
} from '@/lib/parseSiteHealthMeta';
import type { Site, SiteHealthCheck, SiteHealthSeverity } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import { Button, ButtonGroup, Card, CardBody, Collapse, Form } from 'react-bootstrap';

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

/** Subtle outline for filter chips that are part of the current selection. */
const FILTER_CHIP_ACTIVE_CLASS = 'border border-secondary-subtle rounded';

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
      className={`badge ${severitySoftClass(severity)} ${active ? FILTER_CHIP_ACTIVE_CLASS : 'border-0'}`}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      disabled={disabled}
      aria-pressed={active}
      aria-label={
        disabled
          ? `${label}: no checks`
          : active
            ? `${label}: remove from filter`
            : `Add ${label} to filter`
      }
      onClick={() => onToggle(severity)}
    >
      {label} {count}
    </button>
  );
}

function formatCategoryMixLine(checks: SiteHealthCheck[]): string {
  const m = new Map<string, number>();
  for (const c of checks) {
    const k = categoryLabelForCheck(c);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  const parts = Array.from(m.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, n]) => `${displayCategoryTitle(k)} (${n})`);
  return parts.length ? parts.join(' · ') : '';
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

type HealthChecksListView = 'category' | 'result';

export default function SiteHealthMetaPanel({ site }: SiteHealthMetaPanelProps) {
  const raw = site.healthMeta?.trim() ?? '';
  const snapshot = useMemo(() => parseSiteHealthMeta(site.healthMeta), [site.healthMeta]);
  const parseFailed = raw.length > 2 && snapshot === null;

  const totalFromSummary =
    snapshot != null && typeof snapshot.summary?.total_checks === 'number'
      ? snapshot.summary.total_checks
      : undefined;

  const checks = useMemo(() => (snapshot ? getChecksForDashboard(snapshot) : []), [snapshot]);
  const checkTotals = useMemo(() => severityTotalsForChecks(checks), [checks]);
  const [severityFilters, setSeverityFilters] = useState<Set<SiteHealthSeverity>>(() => new Set());
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [listView, setListView] = useState<HealthChecksListView>('category');
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    setSeverityFilters(new Set());
    setSelectedCategoryKey(null);
    setListView('category');
  }, [site.$id, site.healthMeta]);

  const hasActiveSeverityFilter = severityFilters.size > 0;
  const hasActiveCategoryFilter = selectedCategoryKey !== null;

  const afterSeverityChecks = useMemo(() => {
    if (severityFilters.size === 0) return checks;
    return checks.filter((c) => severityFilters.has(normalizeSiteHealthSeverity(c.severity)));
  }, [checks, severityFilters]);

  const categoryRows = useMemo(() => groupChecksByCategory(afterSeverityChecks), [afterSeverityChecks]);

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const { categoryLabel, checks: list } of categoryRows) {
      m.set(categoryLabel, list.length);
    }
    return m;
  }, [categoryRows]);

  useEffect(() => {
    const valid = new Set(categoryRows.map((r) => r.categoryLabel));
    setSelectedCategoryKey((prev) => (prev != null && !valid.has(prev) ? null : prev));
  }, [categoryRows]);

  const displayedChecks = useMemo(() => {
    if (selectedCategoryKey === null) return afterSeverityChecks;
    return afterSeverityChecks.filter((c) => categoryLabelForCheck(c) === selectedCategoryKey);
  }, [afterSeverityChecks, selectedCategoryKey]);

  const byCategory = useMemo(
    () => sortCategoryGroupsCriticalFirst(groupChecksByCategory(displayedChecks)),
    [displayedChecks],
  );
  const byResult = useMemo(() => groupChecksByResult(displayedChecks), [displayedChecks]);

  const toggleSeverityFilter = (s: SiteHealthSeverity) => {
    setSeverityFilters((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const clearSeverityFilters = () => setSeverityFilters(new Set());

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

  return (
    <div className="d-flex flex-column gap-3">
      <div className="border-bottom border-secondary-subtle pb-3">
        <div className="d-flex flex-wrap align-items-center column-gap-3 row-gap-2 w-100">
          <div
            className="d-flex flex-wrap align-items-center gap-2 flex-grow-1 min-w-0"
            role="group"
            aria-label="By result"
          >
            <span className="text-muted fs-sm flex-shrink-0 align-self-center">Filter by Result</span>
            <div className="d-flex flex-wrap align-items-center gap-2 min-w-0">
              {SEVERITY_ORDER.map((sev) => (
                <FilterSeverityBadge
                  key={sev}
                  severity={sev}
                  count={checkTotals[sev]}
                  active={severityFilters.has(sev)}
                  onToggle={toggleSeverityFilter}
                />
              ))}
              <button
                type="button"
                className={`badge badge-soft-secondary ${!hasActiveSeverityFilter ? FILTER_CHIP_ACTIVE_CLASS : 'border-0'}`}
                style={{ cursor: 'pointer' }}
                aria-pressed={!hasActiveSeverityFilter}
                aria-label={`Show all checks (${typeof totalFromSummary === 'number' ? totalFromSummary : checks.length} total)`}
                onClick={clearSeverityFilters}
              >
                All ({typeof totalFromSummary === 'number' ? totalFromSummary : checks.length})
              </button>
            </div>
            {hasActiveSeverityFilter ? (
              <Button variant="outline-secondary" size="sm" className="flex-shrink-0" onClick={clearSeverityFilters}>
                Clear
              </Button>
            ) : null}
          </div>

          <div className="d-flex flex-nowrap align-items-center gap-2 flex-shrink-0">
            <Form.Label
              htmlFor="site-health-meta-category-filter"
              className="text-muted fs-sm mb-0 flex-shrink-0 align-self-center text-nowrap"
            >
              Category
            </Form.Label>
            <Form.Select
              id="site-health-meta-category-filter"
              size="sm"
              value={selectedCategoryKey ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedCategoryKey(v === '' ? null : v);
              }}
              aria-label="Filter by category"
              className="w-auto"
              style={{ minWidth: '12rem', maxWidth: '22rem' }}
            >
              <option value="">All categories</option>
              {categoryRows.map(({ categoryLabel }) => {
                const n = categoryCounts.get(categoryLabel) ?? 0;
                return (
                  <option key={categoryLabel} value={categoryLabel} disabled={n === 0}>
                    {displayCategoryTitle(categoryLabel)} ({n})
                  </option>
                );
              })}
            </Form.Select>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2 ms-auto flex-shrink-0">
            <span className="text-muted fs-sm flex-shrink-0">View</span>
            <ButtonGroup size="sm" role="group" aria-label="How to group checks">
              <Button
                variant={listView === 'category' ? 'primary' : 'outline-secondary'}
                aria-pressed={listView === 'category'}
                onClick={() => setListView('category')}
              >
                By category
              </Button>
              <Button
                variant={listView === 'result' ? 'primary' : 'outline-secondary'}
                aria-pressed={listView === 'result'}
                onClick={() => setListView('result')}
              >
                By result
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </div>

      {(hasActiveSeverityFilter || hasActiveCategoryFilter) && displayedChecks.length === 0 ? (
        <p className="text-muted mb-0">No checks match this filter.</p>
      ) : null}

      <div className="d-flex flex-column gap-3">
        {listView === 'category'
          ? byCategory.map(({ categoryLabel, checks: catChecks }) => {
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
                      {groupChecksByResult(catChecks).map(({ severity: subSev, checks: byStatus }, subIdx) => (
                        <div key={subSev}>
                          <div
                            className={`fs-xs text-uppercase fw-semibold text-muted mb-2 ${subIdx > 0 ? 'mt-3 pt-2 border-top border-secondary-subtle' : ''}`}
                          >
                            {severityDisplayName(subSev)}
                          </div>
                          <div>
                            {byStatus.map((c) => (
                              <SiteHealthCheckRow key={c.id} check={c} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              );
            })
          : byResult.map(({ severity, checks: sevChecks }) => {
              const mix = formatCategoryMixLine(sevChecks);
              return (
                <Card key={severity} className="border shadow-none bg-transparent">
                  <CardBody>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                      <h6 className="fs-base mb-0 d-flex align-items-center gap-2 flex-wrap">
                        <span className={`badge ${severitySoftClass(severity)}`}>
                          {severityDisplayName(severity)}
                        </span>
                        <span className="text-body">
                          {sevChecks.length} {sevChecks.length === 1 ? 'check' : 'checks'}
                        </span>
                      </h6>
                      {mix ? <span className="text-muted fs-xs text-end">{mix}</span> : null}
                    </div>
                    <div>
                      {groupChecksByCategory(sevChecks).map(({ categoryLabel: subCat, checks: byCat }, subIdx) => (
                        <div key={subCat}>
                          <div
                            className={`fs-xs text-uppercase fw-semibold text-muted mb-2 ${subIdx > 0 ? 'mt-3 pt-2 border-top border-secondary-subtle' : ''}`}
                          >
                            {displayCategoryTitle(subCat)}
                          </div>
                          <div>
                            {byCat.map((c) => (
                              <SiteHealthCheckRow key={c.id} check={c} />
                            ))}
                          </div>
                        </div>
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
