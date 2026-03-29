import { parseSiteHealthScore } from '@/lib/siteHealthScore.ts';
import type { Site } from '@/types';
import { useMemo } from 'react';

/** Matches connection flash icon in {@link SiteDetailSidebarCard}. */
export const SITE_HEALTH_RING_ORANGE = '#ea580c';

function conicGradientForHealth(score: number, ringColor: string, trackColor: string): string {
  const sweep = Math.min(360, Math.max(0, (score / 100) * 360));
  return `conic-gradient(from -90deg, ${ringColor} 0deg, ${ringColor} ${sweep}deg, ${trackColor} ${sweep}deg 360deg)`;
}

type SiteHealthScoreDonutProps = {
  site: Site;
  /** Outer diameter in px */
  size?: number;
  /** Progress arc color (e.g. same as bridge connection icon). */
  ringColor?: string;
  /** `dark` = site details sidebar card; `light` = table rows on white/light background. */
  surface?: 'dark' | 'light';
  /** When true, shows “HEALTH SCORE” above the donut (e.g. site details sidebar). */
  showHeading?: boolean;
};

const SiteHealthScoreDonut = ({
  site,
  size = 42,
  ringColor = SITE_HEALTH_RING_ORANGE,
  surface = 'dark',
  showHeading = false,
}: SiteHealthScoreDonutProps) => {
  const score = useMemo(
    () => parseSiteHealthScore(site),
    [
      site.$id,
      site.healthMeta,
      site.healthStatus,
      site.wpMeta,
      site.performanceMeta,
      site.pluginsMeta,
      site.themesMeta,
      site.siteUrl,
      site.wpVersion,
      site.phpVersion,
    ],
  );

  const track = surface === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255,255,255,0.14)';
  const label = `Site health score ${score} out of 100`;

  const donut = (
    <div
      className="position-relative flex-shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <div
        className="rounded-circle w-100 h-100 shadow-sm"
        style={{ background: conicGradientForHealth(score, ringColor, track) }}
      />
      <div
        className="position-absolute top-50 start-50 translate-middle rounded-circle d-flex align-items-center justify-content-center bg-white border"
        style={{
          width: '70%',
          height: '70%',
          borderColor: 'rgba(0,0,0,0.1)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        <span
          className="fw-bold lh-1"
          style={{
            fontSize: Math.max(11, Math.round(size * 0.3)),
            color: 'var(--ins-topbar-bg)',
          }}
        >
          {score}
        </span>
      </div>
    </div>
  );

  if (!showHeading) return donut;

  return (
    <div className="d-flex flex-column align-items-end flex-shrink-0">
      <span
        className={`fs-xxs fw-semibold mb-1 ${surface === 'light' ? 'text-muted' : 'text-white-50'}`}
        style={{ letterSpacing: '0.04em' }}
      >
        HEALTH SCORE
      </span>
      {donut}
    </div>
  );
};

export default SiteHealthScoreDonut;
