import { getChecksForDashboard, parseSiteHealthMeta, severityTotalsForChecks } from '@/lib/parseSiteHealthMeta';
import { useMemo } from 'react';
import { TbAlertSquareRounded } from 'react-icons/tb';

type HealthTabTone = 'danger' | 'warning' | 'success';

function toneFromHealthMeta(healthMeta: string | undefined): HealthTabTone {
  const snapshot = parseSiteHealthMeta(healthMeta);
  if (!snapshot) return 'success';
  const checks = getChecksForDashboard(snapshot);
  if (checks.length === 0) return 'success';
  const totals = severityTotalsForChecks(checks);
  if (totals.critical > 0) return 'danger';
  if (totals.warning > 0) return 'warning';
  return 'success';
}

const ARIA: Record<'danger' | 'warning', string> = {
  danger: 'Health snapshot includes critical checks',
  warning: 'Health snapshot includes warnings',
};

const BADGE_SOFT: Record<'danger' | 'warning', string> = {
  danger: 'badge-soft-danger',
  warning: 'badge-soft-warning',
};

/** Icon-only status on the Site → Health tab when health_meta has critical or warning checks. */
export function SiteHealthTabStatusBadge({ healthMeta }: { healthMeta: string | undefined }) {
  const tone = useMemo(() => toneFromHealthMeta(healthMeta), [healthMeta]);
  if (tone === 'success') return null;

  return (
    <span
      className={`badge ${BADGE_SOFT[tone]} rounded-pill p-1 d-inline-flex align-items-center justify-content-center`}
      role="img"
      aria-label={ARIA[tone]}
    >
      <TbAlertSquareRounded className="fs-sm" aria-hidden />
    </span>
  );
}
