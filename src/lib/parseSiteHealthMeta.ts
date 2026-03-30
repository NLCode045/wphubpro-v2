import type {
  SiteHealthCheck,
  SiteHealthMetaSnapshot,
  SiteHealthSeverity,
} from '@/types';

/** Checks with no `category` (e.g. async pending) group under this label. */
export const SITE_HEALTH_UNCATEGORIZED = 'Uncategorized';

const ORDERED_CATEGORIES = ['Performance', 'Security', 'Privacy'] as const;

const SEVERITIES: SiteHealthSeverity[] = ['ok', 'warning', 'critical', 'pending', 'unknown'];

/** Severity groups in UI lists: critical first, warning second, then the rest in {@link SEVERITIES} order. */
const RESULT_SEVERITY_ORDER: SiteHealthSeverity[] = [
  'critical',
  'warning',
  ...SEVERITIES.filter((s) => s !== 'critical' && s !== 'warning'),
];

export function normalizeSiteHealthSeverity(value: string | undefined | null): SiteHealthSeverity {
  const v = String(value ?? '').toLowerCase();
  if (v === 'ok' || v === 'warning' || v === 'critical' || v === 'pending' || v === 'unknown') {
    return v;
  }
  return 'unknown';
}

export function parseSiteHealthMeta(raw: string | undefined | null): SiteHealthMetaSnapshot | null {
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (t.length <= 2) return null;
  try {
    const parsed: unknown = JSON.parse(t);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as SiteHealthMetaSnapshot;
  } catch {
    return null;
  }
}

/**
 * Prefer `checks_flat`; otherwise flatten `modules[].checks` with dedupe by `id`.
 */
export function getChecksForDashboard(snapshot: SiteHealthMetaSnapshot): SiteHealthCheck[] {
  const flat = snapshot.checks_flat;
  if (Array.isArray(flat) && flat.length > 0) {
    return flat.filter((c) => c && typeof c === 'object' && typeof c.id === 'string' && c.label);
  }
  const byId = new Map<string, SiteHealthCheck>();
  for (const mod of snapshot.modules ?? []) {
    for (const c of mod.checks ?? []) {
      if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !c.label) continue;
      if (!byId.has(c.id)) byId.set(c.id, c as SiteHealthCheck);
    }
  }
  return Array.from(byId.values());
}

/** Same grouping key as {@link groupChecksByCategory}. */
export function categoryLabelForCheck(c: SiteHealthCheck): string {
  const raw = c.category?.trim();
  return raw && raw.length > 0 ? raw : SITE_HEALTH_UNCATEGORIZED;
}

function compareCategoryLabels(a: string, b: string): number {
  if (a === SITE_HEALTH_UNCATEGORIZED && b === SITE_HEALTH_UNCATEGORIZED) return 0;
  if (a === SITE_HEALTH_UNCATEGORIZED) return 1;
  if (b === SITE_HEALTH_UNCATEGORIZED) return -1;
  const ia = ORDERED_CATEGORIES.indexOf(a as (typeof ORDERED_CATEGORIES)[number]);
  const ib = ORDERED_CATEGORIES.indexOf(b as (typeof ORDERED_CATEGORIES)[number]);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
}

export type SiteHealthChecksByCategory = { categoryLabel: string; checks: SiteHealthCheck[] };

export function groupChecksByCategory(checks: SiteHealthCheck[]): SiteHealthChecksByCategory[] {
  const map = new Map<string, SiteHealthCheck[]>();
  for (const c of checks) {
    const key = categoryLabelForCheck(c);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  const keys = Array.from(map.keys()).sort(compareCategoryLabels);
  return keys.map((categoryLabel) => ({ categoryLabel, checks: map.get(categoryLabel)! }));
}

function categoryHasCritical(checks: SiteHealthCheck[]): boolean {
  return checks.some((c) => normalizeSiteHealthSeverity(c.severity) === 'critical');
}

/** Categories with at least one critical check first; ties keep {@link compareCategoryLabels} order. */
export function sortCategoryGroupsCriticalFirst(
  groups: SiteHealthChecksByCategory[],
): SiteHealthChecksByCategory[] {
  return [...groups].sort((a, b) => {
    const ac = categoryHasCritical(a.checks);
    const bc = categoryHasCritical(b.checks);
    if (ac && !bc) return -1;
    if (!ac && bc) return 1;
    return compareCategoryLabels(a.categoryLabel, b.categoryLabel);
  });
}

export type SiteHealthChecksByResult = { severity: SiteHealthSeverity; checks: SiteHealthCheck[] };

/** Groups by normalized severity; only severities with at least one check appear; critical first, warning second. */
export function groupChecksByResult(checks: SiteHealthCheck[]): SiteHealthChecksByResult[] {
  const map = new Map<SiteHealthSeverity, SiteHealthCheck[]>();
  for (const s of SEVERITIES) map.set(s, []);
  for (const c of checks) {
    map.get(normalizeSiteHealthSeverity(c.severity))!.push(c);
  }
  return RESULT_SEVERITY_ORDER.filter((s) => map.get(s)!.length > 0).map((severity) => ({
    severity,
    checks: map.get(severity)!,
  }));
}

export type SiteHealthCategorySeverityRow = {
  categoryLabel: string;
  counts: Record<SiteHealthSeverity, number>;
};

function emptySeverityCounts(): Record<SiteHealthSeverity, number> {
  return { ok: 0, warning: 0, critical: 0, pending: 0, unknown: 0 };
}

/** Per-category severity counts for stacked charts (same category order as {@link groupChecksByCategory}). */
export function aggregateByCategory(checks: SiteHealthCheck[]): SiteHealthCategorySeverityRow[] {
  const grouped = groupChecksByCategory(checks);
  return grouped.map(({ categoryLabel, checks: list }) => {
    const counts = emptySeverityCounts();
    for (const c of list) {
      counts[normalizeSiteHealthSeverity(c.severity)] += 1;
    }
    return { categoryLabel, counts };
  });
}

export function severityTotalsForChecks(checks: SiteHealthCheck[]): Record<SiteHealthSeverity, number> {
  const counts = emptySeverityCounts();
  for (const c of checks) {
    counts[normalizeSiteHealthSeverity(c.severity)] += 1;
  }
  return counts;
}

/** Apex stacked series: one series per severity, one data point per category row. */
export function buildCategoryStackedBarSeries(rows: SiteHealthCategorySeverityRow[]): {
  categories: string[];
  series: { name: string; data: number[] }[];
} {
  const categories = rows.map((r) => r.categoryLabel);
  const series = SEVERITIES.map((sev) => ({
    name: severityDisplayName(sev),
    data: rows.map((r) => r.counts[sev]),
  }));
  return { categories, series };
}

export function severityDisplayName(s: SiteHealthSeverity): string {
  switch (s) {
    case 'ok':
      return 'OK';
    case 'warning':
      return 'Warning';
    case 'critical':
      return 'Critical';
    case 'pending':
      return 'Pending';
    default:
      return 'Unknown';
  }
}
