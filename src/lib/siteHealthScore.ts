import { hasUpdate, parsePluginsMeta, parseThemesMeta } from '@/domains/sites/installedMeta.ts';
import { pagespeedResultFromPerformanceMeta } from '@/domains/sites/performanceMeta.ts';
import type { Site, SitePagespeedCoreWebVitals } from '@/types';

/** Gewichten (totaal 100%). */
const WEIGHT_CORE_SECURITY = 0.35;
const WEIGHT_PERF_SEO = 0.25;
const WEIGHT_CWV = 0.4;

/** Strafpunten per plugin- of theme-update (Core & Security). */
const PENALTY_PER_UPDATE = 6;

type HealthSummary = {
  overall?: string;
  counts?: Record<string, number>;
  total_checks?: number;
};

function totalFromCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, n) => a + (typeof n === 'number' && !Number.isNaN(n) ? n : 0), 0);
}

function clampScore(x: number): number {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0;
  return Math.min(100, Math.max(0, x));
}

/** major.minor.patch → sorteerbare integer (bv. 6.9.4 → 60904). */
function versionRank(v: string): number | null {
  const s = String(v).trim();
  const m = s.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return null;
  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2] ?? '0', 10);
  const patch = parseInt(m[3] ?? '0', 10);
  if ([major, minor, patch].some((n) => Number.isNaN(n))) return null;
  return major * 10_000 + minor * 100 + patch;
}

/** WP: 6.9.4+ = 100; lineair tussen 5.0.0 (0) en 6.9.4 (100). */
function scoreWordPressVersion(version: string): number {
  const r = versionRank(version);
  if (r == null) return 50;
  const hi = versionRank('6.9.4');
  const lo = versionRank('5.0.0');
  if (hi == null || lo == null) return 50;
  if (r >= hi) return 100;
  if (r <= lo) return 0;
  return clampScore((100 * (r - lo)) / (hi - lo));
}

/** PHP: 8.2+ = 100; lineair tussen 7.4.0 (0) en 8.2.0 (100). */
function scorePhpVersion(version: string): number {
  const r = versionRank(version);
  if (r == null) return 50;
  const hi = versionRank('8.2.0');
  const lo = versionRank('7.4.0');
  if (hi == null || lo == null) return 50;
  if (r >= hi) return 100;
  if (r <= lo) return 0;
  return clampScore((100 * (r - lo)) / (hi - lo));
}

/** SSL: geldig HTTPS op site-URL = 100, http = 0, anders 50. */
function scoreSslFromUrl(siteUrl: string): number {
  const u = siteUrl.trim().toLowerCase();
  if (u.startsWith('https://')) return 100;
  if (u.startsWith('http://')) return 0;
  return 50;
}

/**
 * Verfijnt SSL-score met `health_meta.checks_flat` (HTTPS / SSL / certificaat).
 */
function refineSslWithHealthMeta(healthMeta: string | undefined, base: number): number {
  if (!healthMeta?.trim()) return clampScore(base);
  try {
    const o = JSON.parse(healthMeta) as {
      checks_flat?: Array<{ label?: string; slug?: string; severity?: string }>;
    };
    const flat = o.checks_flat;
    if (!Array.isArray(flat)) return clampScore(base);

    const mentionsSsl = (row: { label?: string; slug?: string }) => {
      const t = `${row.slug ?? ''} ${row.label ?? ''}`.toLowerCase();
      return (
        t.includes('https') ||
        t.includes('ssl') ||
        t.includes('tls') ||
        t.includes('certificate') ||
        t.includes('encrypted')
      );
    };

    let out = base;
    for (const c of flat) {
      if (!mentionsSsl(c)) continue;
      const sev = String(c.severity ?? '').toLowerCase();
      if (sev === 'critical') out = Math.min(out, 15);
      else if (sev === 'warning') out = Math.min(out, 60);
      else if (sev === 'ok') out = Math.max(out, 95);
    }
    return clampScore(out);
  } catch {
    return clampScore(base);
  }
}

function wpPhpFromSite(site: Site): { wp: string; php: string } {
  let wp = (site.wpVersion ?? '').trim();
  let php = (site.phpVersion ?? '').trim();
  const raw = site.wpMeta?.trim();
  if (raw && raw.length > 2) {
    try {
      const o = JSON.parse(raw) as { wp_version?: string; php_version?: string };
      if (typeof o.wp_version === 'string' && o.wp_version.trim()) wp = o.wp_version.trim();
      if (typeof o.php_version === 'string' && o.php_version.trim()) php = o.php_version.trim();
    } catch {
      /* keep doc fields */
    }
  }
  return { wp, php };
}

/** 100 minus strafpunten voor elke plugin/theme met beschikbare update. */
function scorePendingUpdates(site: Site): number {
  const n =
    parsePluginsMeta(site.pluginsMeta).filter(hasUpdate).length +
    parseThemesMeta(site.themesMeta).filter(hasUpdate).length;
  return clampScore(100 - n * PENALTY_PER_UPDATE);
}

/**
 * Health snapshot score from `summary.counts`: starts at 100 and subtracts **per-check penalties**
 * (not an average over checks — many OKs do not cancel a critical).
 * Weights increase from warning upward: critical > warning > unknown > pending > ok (0).
 */
const HEALTH_META_PENALTY_CRITICAL = 38;
const HEALTH_META_PENALTY_WARNING = 15;
const HEALTH_META_PENALTY_UNKNOWN = 6;
const HEALTH_META_PENALTY_PENDING = 3;
/** Extra deduction whenever there is at least one critical check (severity impact beyond count). */
const HEALTH_META_ANY_CRITICAL_EXTRA = 22;
/** Max total deduction (allows score to reach 0 when many issues stack). */
const HEALTH_META_PENALTY_CAP = 100;

function scoreFromHealthMetaCounts(counts: Record<string, number>): number {
  const crit = typeof counts.critical === 'number' ? counts.critical : 0;
  const warn = typeof counts.warning === 'number' ? counts.warning : 0;
  const unk = typeof counts.unknown === 'number' ? counts.unknown : 0;
  const pend = typeof counts.pending === 'number' ? counts.pending : 0;
  const rawPenalty =
    crit * HEALTH_META_PENALTY_CRITICAL +
    warn * HEALTH_META_PENALTY_WARNING +
    unk * HEALTH_META_PENALTY_UNKNOWN +
    pend * HEALTH_META_PENALTY_PENDING +
    (crit > 0 ? HEALTH_META_ANY_CRITICAL_EXTRA : 0);
  const penalty = Math.min(rawPenalty, HEALTH_META_PENALTY_CAP);
  return clampScore(100 - penalty);
}

/** 0–100 uit health_meta samenvatting (checks), anders 50. */
function scoreHealthMetaOverview(healthMeta: string | undefined): number {
  const raw = healthMeta?.trim();
  if (!raw || raw.length < 3) return 50;
  try {
    const parsed = JSON.parse(raw) as { summary?: HealthSummary };
    const s = parsed?.summary;
    const counts = s?.counts;
    const total =
      typeof s?.total_checks === 'number' && s.total_checks > 0
        ? s.total_checks
        : counts && typeof counts === 'object'
          ? totalFromCounts(counts)
          : 0;

    if (total > 0 && counts && typeof counts === 'object') {
      return scoreFromHealthMetaCounts(counts as Record<string, number>);
    }

    const overall = s?.overall;
    if (overall === 'ok') return 95;
    if (overall === 'pending') return 82;
    if (overall === 'unknown') return 58;
    if (overall === 'warning') return 44;
    if (overall === 'critical') return 22;
  } catch {
    /* fall through */
  }
  return 50;
}

/**
 * Core & Security: WP/PHP/SSL/updates elk 12%, Site Health-snapshot **52%**
 * zodat een critical in `health_meta` het totaal sterk naar beneden trekt (niet 1/5 van alleen core).
 */
function scoreCoreSecurityBlock(site: Site): number {
  const { wp, php } = wpPhpFromSite(site);
  const wpS = scoreWordPressVersion(wp);
  const phpS = scorePhpVersion(php);
  const sslBase = scoreSslFromUrl(site.siteUrl ?? '');
  const sslS = refineSslWithHealthMeta(site.healthMeta, sslBase);
  const updS = scorePendingUpdates(site);
  const healthS = scoreHealthMetaOverview(site.healthMeta);
  const wInfra = 0.12;
  const wHealth = 0.52;
  return clampScore(wpS * wInfra + phpS * wInfra + sslS * wInfra + updS * wInfra + healthS * wHealth);
}

/** Lighthouse Performance + SEO uit performance_meta (desktop/mobile gemiddeld). */
function scorePerformanceSeoBlock(performanceMeta: string | undefined): number {
  const d = pagespeedResultFromPerformanceMeta(performanceMeta, 'desktop');
  const m = pagespeedResultFromPerformanceMeta(performanceMeta, 'mobile');

  const perfVals: number[] = [];
  const seoVals: number[] = [];
  for (const r of [d, m]) {
    if (!r?.scores) continue;
    if (typeof r.scores.performance === 'number' && !Number.isNaN(r.scores.performance)) {
      perfVals.push(clampScore(r.scores.performance));
    }
    if (typeof r.scores.seo === 'number' && !Number.isNaN(r.scores.seo)) {
      seoVals.push(clampScore(r.scores.seo));
    }
  }

  const perfAvg = perfVals.length ? perfVals.reduce((a, b) => a + b, 0) / perfVals.length : 50;
  const seoAvg = seoVals.length ? seoVals.reduce((a, b) => a + b, 0) / seoVals.length : 50;

  // Binnen 25%: Performance 15 punten, SEO 10 punten van het totaal → gewogen gemiddelde 0–100
  return clampScore((15 * perfAvg + 10 * seoAvg) / 25);
}

function hasAnyVital(v: SitePagespeedCoreWebVitals | undefined): boolean {
  if (!v) return false;
  return (
    v.timeToFirstByteMs != null ||
    v.largestContentfulPaintMs != null ||
    v.cumulativeLayoutShift != null
  );
}

/** TTFB: 200 ms = 100, 1200 ms = 0 (lineair). */
function scoreTtfbMs(ms: number | null | undefined): number {
  if (ms == null || Number.isNaN(ms)) return 50;
  if (ms <= 200) return 100;
  if (ms >= 1200) return 0;
  return clampScore((100 * (1200 - ms)) / 1000);
}

/** LCP: 1,2 s = 100, 6,2 s = 0 (lineair). */
function scoreLcpMs(ms: number | null | undefined): number {
  if (ms == null || Number.isNaN(ms)) return 50;
  if (ms <= 1200) return 100;
  if (ms >= 6200) return 0;
  return clampScore((100 * (6200 - ms)) / 5000);
}

/** CLS: 0 = 100, 1 = 0 (lineair). */
function scoreClsUnit(cls: number | null | undefined): number {
  if (cls == null || Number.isNaN(cls)) return 50;
  const c = Math.max(0, cls);
  if (c <= 0) return 100;
  if (c >= 1) return 0;
  return clampScore(100 * (1 - c));
}

function scoreCwvTriple(v: SitePagespeedCoreWebVitals | undefined): number {
  if (!v) return 50;
  return clampScore(
    (scoreTtfbMs(v.timeToFirstByteMs) + scoreLcpMs(v.largestContentfulPaintMs) + scoreClsUnit(v.cumulativeLayoutShift)) /
      3,
  );
}

/** UX / CWV-blok: gemiddelde over desktop/mobile waar vitals aanwezig zijn. */
function scoreCwvBlock(performanceMeta: string | undefined): number {
  const d = pagespeedResultFromPerformanceMeta(performanceMeta, 'desktop');
  const m = pagespeedResultFromPerformanceMeta(performanceMeta, 'mobile');
  const parts: number[] = [];
  if (d?.coreWebVitals && hasAnyVital(d.coreWebVitals)) parts.push(scoreCwvTriple(d.coreWebVitals));
  if (m?.coreWebVitals && hasAnyVital(m.coreWebVitals)) parts.push(scoreCwvTriple(m.coreWebVitals));
  if (parts.length === 0) return 50;
  return clampScore(parts.reduce((a, b) => a + b, 0) / parts.length);
}

/**
 * Eindscore 0–100 als geheel getal (afronding: onder 0,5 omlaag, vanaf 0,5 omhoog),
 * op basis van wp_meta, performance_meta, plugin/theme-updates, health_meta en site-URL (SSL).
 */
export function parseSiteHealthScore(site: Site): number {
  const core = scoreCoreSecurityBlock(site);
  const perfSeo = scorePerformanceSeoBlock(site.performanceMeta);
  const cwv = scoreCwvBlock(site.performanceMeta);

  const total =
    WEIGHT_CORE_SECURITY * core + WEIGHT_PERF_SEO * perfSeo + WEIGHT_CWV * cwv;

  return Math.round(clampScore(total));
}
