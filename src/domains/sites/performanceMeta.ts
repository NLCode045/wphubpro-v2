import type { SitePagespeedResult } from '@/types';

type PagespeedStrategy = 'desktop' | 'mobile';

/**
 * Stored JSON shape written by `site-pagespeed` into `sites.performance_meta`.
 * Each strategy holds the same fields as {@link SitePagespeedResult} plus `fetchedAt`.
 */
export type PerformanceMetaStored = {
  updatedAt?: string;
  desktop?: PerformanceMetaStrategySlice;
  mobile?: PerformanceMetaStrategySlice;
};

export type PerformanceMetaStrategySlice = {
  success: true;
  scores: SitePagespeedResult['scores'];
  coreWebVitals?: SitePagespeedResult['coreWebVitals'];
  analyzedUrl?: string;
  lighthouseVersion?: string;
  fetchedAt?: string;
};

/** Build a {@link SitePagespeedResult} from persisted `performance_meta` for one strategy. */
export function pagespeedResultFromPerformanceMeta(
  raw: string | undefined,
  strategy: PagespeedStrategy,
): SitePagespeedResult | undefined {
  if (!raw || typeof raw !== 'string' || raw.trim().length < 3) return undefined;
  try {
    const o = JSON.parse(raw) as PerformanceMetaStored & Record<string, unknown>;
    const block = o[strategy];
    if (!block || typeof block !== 'object') return undefined;
    if (block.success !== true) return undefined;
    if (!block.scores || typeof block.scores !== 'object') return undefined;
    return {
      success: true,
      strategy,
      scores: block.scores,
      coreWebVitals: block.coreWebVitals,
      analyzedUrl: typeof block.analyzedUrl === 'string' ? block.analyzedUrl : undefined,
      lighthouseVersion: typeof block.lighthouseVersion === 'string' ? block.lighthouseVersion : undefined,
    };
  } catch {
    return undefined;
  }
}

export function hasBothPagespeedStrategiesInPerformanceMeta(raw: string | undefined): boolean {
  return (
    pagespeedResultFromPerformanceMeta(raw, 'desktop') != null &&
    pagespeedResultFromPerformanceMeta(raw, 'mobile') != null
  );
}
