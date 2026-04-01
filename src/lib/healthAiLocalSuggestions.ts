import type { HealthAiSuggestion } from '@/types';
import {
  getChecksForDashboard,
  normalizeSiteHealthSeverity,
  parseSiteHealthMeta,
} from '@/lib/parseSiteHealthMeta';

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

const REFRESH_HINT: HealthAiSuggestion = {
  id: 'health-refresh-helper',
  title: 'Refresh Site Health data from WordPress',
  description:
    'Pushes a fresh health snapshot from the site to the hub (safe). Useful before or after other changes.',
  kind: 'health_refresh',
  payload: {},
};

function healthMetaToRawString(healthMeta: unknown): string {
  if (healthMeta == null) return '';
  if (typeof healthMeta === 'string') return healthMeta.trim();
  if (typeof healthMeta === 'object') {
    try {
      return JSON.stringify(healthMeta).trim();
    } catch {
      return '';
    }
  }
  return String(healthMeta).trim();
}

/**
 * Builds the Health assistant checklist from the site’s `health_meta` JSON (Appwrite `sites.health_meta`),
 * same shape as the bridge snapshot — no server round-trip for the suggestion list.
 */
export function buildLocalHealthAiSuggestions(healthMeta: string | undefined | null | unknown): HealthAiSuggestion[] {
  const raw = healthMetaToRawString(healthMeta);
  if (raw.length <= 2 || raw === '[]' || raw === '{}') {
    return [
      {
        id: 'no-health-data',
        title: 'Run a health check first',
        description:
          'There is no Site Health snapshot yet. Use “Check health” on this page, then open the assistant again.',
        kind: 'advice_only',
        payload: {},
      },
    ];
  }

  const snapshot = parseSiteHealthMeta(raw || null);
  if (!snapshot) {
    return [
      {
        id: 'no-health-parse',
        title: 'Health data could not be read',
        description:
          'The stored Site Health snapshot is missing or invalid. Run Check health on this site to refresh hub data.',
        kind: 'advice_only',
        payload: {},
      },
    ];
  }

  const checks = getChecksForDashboard(snapshot);
  const notable = checks.filter((c) => {
    const sev = normalizeSiteHealthSeverity(c.severity);
    return sev === 'critical' || sev === 'warning';
  });

  const heuristic: HealthAiSuggestion[] = notable.slice(0, 12).map((c, i) => ({
    id: `heuristic-${c.id}-${i}`,
    title: `Review: ${c.label}`,
    description: c.message
      ? stripHtml(String(c.message)).slice(0, 500)
      : 'Open WordPress → Tools → Site Health for details and manual fixes.',
    kind: 'advice_only',
    payload: { healthCheckId: c.id },
  }));

  return heuristic.length > 0 ? [REFRESH_HINT, ...heuristic] : [REFRESH_HINT];
}
