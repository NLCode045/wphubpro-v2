/**
 * Dashboard subscription details - Plan, dates, limits with usage, button
 */
import React from 'react';
import Card from '@mui/material/Card';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Icon from '@mui/material/Icon';
import { useNavigate } from 'react-router-dom';
import type { Subscription, UsageMetrics } from '../../types';
import { ROUTE_PATHS } from '../../config/routePaths';

const ARC_SIZE = 100;
const ARC_RADIUS = 38;
const ARC_STROKE = 10;
const ARC_CENTER_X = ARC_SIZE / 2;
const ARC_CENTER_Y = ARC_RADIUS + 6;
const ARC_HEIGHT = ARC_RADIUS * 2 + ARC_STROKE + 24;

const blueGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';

function CircleProgress({
  label,
  used,
  limit,
  valuePct,
}: {
  label: string;
  used: number;
  limit: number;
  valuePct: number;
}) {
  const pct = used > 0
    ? Math.max(10, Math.min(100, Math.round(valuePct)))
    : Math.min(100, Math.round(valuePct));
  const circumference = Math.PI * ARC_RADIUS;
  const progressOffset = circumference * (1 - pct / 100);
  const progressColor = valuePct >= 100 ? '#EF4444' : '#F97316';
  const trackColor = '#E0E0E0';

  // Semi-circle arc: flat at top, curved at bottom (U shape). Arc from left to right through bottom.
  const startX = ARC_CENTER_X - ARC_RADIUS;
  const endX = ARC_CENTER_X + ARC_RADIUS;
  const arcY = ARC_CENTER_Y;
  const pathD = `M ${startX} ${arcY} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${endX} ${arcY}`;

  return (
    <SoftBox
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: ARC_SIZE,
      }}
    >
      <SoftTypography
        variant="caption"
        color="white"
        sx={{ fontSize: '0.7rem', lineHeight: 1.2, mb: 0.25 }}
      >
        {label}
      </SoftTypography>
      <SoftBox position="relative" display="inline-flex" alignItems="center" justifyContent="center" width={ARC_SIZE} height={ARC_HEIGHT}>
        <svg
          width={ARC_SIZE}
          height={ARC_HEIGHT}
          viewBox={`0 0 ${ARC_SIZE} ${ARC_HEIGHT}`}
          style={{ overflow: 'visible' }}
        >
          {/* Background arc (grey track) */}
          <path
            d={pathD}
            fill="none"
            stroke={trackColor}
            strokeWidth={ARC_STROKE}
            strokeLinecap="round"
          />
          {/* Progress arc (purple) */}
          <path
            d={pathD}
            fill="none"
            stroke={progressColor}
            strokeWidth={ARC_STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <SoftBox
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <SoftTypography
            component="span"
            fontWeight="bold"
            color="white"
            sx={{
              fontSize: '1.35rem',
              lineHeight: 1.1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {used}
          </SoftTypography>
          <SoftTypography
            variant="caption"
            color="white"
            sx={{ fontSize: '0.65rem', lineHeight: 1.2, opacity: 0.95 }}
          >
            of {limit >= 9999 ? '∞' : limit}
          </SoftTypography>
        </SoftBox>
      </SoftBox>
    </SoftBox>
  );
}

interface DashboardSubscriptionCardProps {
  subscription: Subscription | null | undefined;
  usage: UsageMetrics | undefined;
  isLoading?: boolean;
}

const DashboardSubscriptionCard: React.FC<DashboardSubscriptionCardProps> = ({
  subscription,
  usage,
  isLoading,
}) => {
  const navigate = useNavigate();
  const sub = subscription;
  const u = usage ?? { sitesUsed: 0, libraryUsed: 0, storageUsed: 0 };
  const sitesLimit = sub?.sitesLimit ?? 1;
  const libraryLimit = sub?.libraryLimit ?? 5;
  const storageLimit = sub?.storageLimit ?? 10;

  const sitesPct = sitesLimit > 0 ? Math.min(100, (u.sitesUsed / sitesLimit) * 100) : 0;
  const libraryPct = libraryLimit > 0 ? Math.min(100, (u.libraryUsed / libraryLimit) * 100) : 0;
  const storagePct = storageLimit > 0 ? Math.min(100, (u.storageUsed / storageLimit) * 100) : 0;

  const periodStart = sub?.currentPeriodEnd
    ? new Date((sub.currentPeriodEnd - (sub.interval === 'year' ? 365 : 30) * 24 * 60 * 60) * 1000)
    : null;
  const periodEnd = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd * 1000) : null;
  const billingPeriod = sub?.interval === 'year' ? 'Yearly' : 'Monthly';

  const isFree = !sub?.priceAmount || sub.priceAmount === 0 || (sub.planId ?? '').toUpperCase() === 'FREE';
  const priceLabel = isFree
    ? 'FREE'
    : `${((sub?.priceAmount ?? 0) / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${sub?.interval === 'year' ? 'year' : 'month'}`;

  return (
    <Card sx={{ background: blueGradient, color: 'white', '& .MuiTypography-root': { color: 'white !important' } }}>
      <SoftBox p={2} sx={{ color: 'white', '& .MuiTypography-root': { color: 'white !important' } }}>
        <SoftTypography variant="h6" fontWeight="bold" color="white" mb={1.5}>
          Subscription Plan Details
        </SoftTypography>
        <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <SoftBox>
            <SoftTypography variant="button" fontWeight="medium" color="white">
              {sub?.planId ?? 'FREE'}
            </SoftTypography>
            {periodStart && (
              <SoftTypography variant="caption" display="block" color="white">
                {periodStart.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} – {periodEnd?.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) ?? '-'}
              </SoftTypography>
            )}
          </SoftBox>
          <SoftTypography variant="button" fontWeight="medium" color="white">
            {priceLabel}
          </SoftTypography>
        </SoftBox>
        {isLoading ? (
          <SoftTypography variant="caption" color="white">Loading...</SoftTypography>
        ) : (
          <>
            {!isFree && (
              <SoftTypography variant="caption" display="block" mb={1.5} color="white">{billingPeriod}</SoftTypography>
            )}
            <SoftBox display="flex" flexDirection="row" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="nowrap" gap={1}>
              <CircleProgress label="Sites" used={u.sitesUsed} limit={sitesLimit} valuePct={sitesPct} />
              <CircleProgress label="Library" used={u.libraryUsed} limit={libraryLimit} valuePct={libraryPct} />
              <CircleProgress label="Opslag" used={u.storageUsed} limit={storageLimit} valuePct={storagePct} />
            </SoftBox>
            <SoftButton variant="outlined" size="small" fullWidth onClick={() => navigate(ROUTE_PATHS.ACCOUNT_SUBSCRIPTION)} sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'white', color: 'white', backgroundColor: 'rgba(255,255,255,0.15)' } }}>
              <Icon sx={{ mr: 0.5, fontSize: 16 }}>credit_card</Icon>
              Manage
            </SoftButton>
          </>
        )}
      </SoftBox>
    </Card>
  );
};

export default DashboardSubscriptionCard;
