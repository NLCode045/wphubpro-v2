import { parseSiteHealthScore } from '@/lib/siteHealthScore.ts';
import type { Site } from '@/types';
import { useMemo } from 'react';

/** Matches connection flash icon in {@link SiteDetailSidebarCard}. */
export const SITE_HEALTH_RING_ORANGE = '#ea580c';

function conicGradientForHealth(score: number, ringColor: string, trackColor: string): string {
  const sweep = Math.min(360, Math.max(0, (score / 100) * 360));
  return `conic-gradient(from -90deg, ${ringColor} 0deg, ${ringColor} ${sweep}deg, ${trackColor} ${sweep}deg 360deg)`;
}

/** Drop shadow only (no large inset blur on the ring — those soften the circle edge). */
function ringDropShadow(surface: 'dark' | 'light'): string {
  if (surface === 'dark') {
    return '0 4px 12px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.3)';
  }
  return '0 4px 12px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)';
}

/** Tight inset only — wide-spread inset shadows blur the donut on HiDPI. */
function innerWellShadow(surface: 'dark' | 'light'): string {
  if (surface === 'dark') {
    return 'inset 0 2px 4px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.35)';
  }
  return 'inset 0 2px 4px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)';
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

  const px = Math.round(size);
  const innerPx = Math.max(2, Math.round(px * 0.7));
  const ringInset = Math.round((px - innerPx) / 2);

  const ringBevel =
    surface === 'dark'
      ? 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2)'
      : 'inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(0,0,0,0.06)';

  const donut = (
    <div
      className="position-relative flex-shrink-0"
      style={{
        width: px,
        height: px,
      }}
      role="img"
      aria-label={label}
    >
      <div
        className="position-relative"
        style={{
          width: px,
          height: px,
          borderRadius: '50%',
          background: conicGradientForHealth(score, ringColor, track),
          boxShadow: `${ringDropShadow(surface)}, ${ringBevel}`,
        }}
      >
        {/* No mix-blend-mode — keeps edges sharp on Retina */}
        <div
          className="position-absolute"
          style={{
            inset: 0,
            borderRadius: '50%',
            background:
              'linear-gradient(145deg, rgba(255,255,255,0.22) 0%, transparent 42%, rgba(0,0,0,0.06) 100%)',
            pointerEvents: 'none',
          }}
          aria-hidden
        />
      </div>
      <div
        className="position-absolute d-flex align-items-center justify-content-center rounded-circle border"
        style={{
          top: ringInset,
          left: ringInset,
          width: innerPx,
          height: innerPx,
          background:
            surface === 'dark'
              ? 'linear-gradient(165deg, #f8f9fa 0%, #e9ecef 45%, #dee2e6 100%)'
              : 'linear-gradient(165deg, #ffffff 0%, #f1f3f5 50%, #e9ecef 100%)',
          borderColor: surface === 'dark' ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.1)',
          boxShadow: innerWellShadow(surface),
        }}
      >
        <span
          className="fw-bold lh-1"
          style={{
            fontSize: Math.max(11, Math.round(px * 0.3)),
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
    <div className="d-flex flex-column align-items-center flex-shrink-0 text-center">
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
