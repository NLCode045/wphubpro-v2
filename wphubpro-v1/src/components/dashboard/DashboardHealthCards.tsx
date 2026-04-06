/**
 * Dashboard health cards - Updates, Healthy %, Connected, Total Health Score
 * 4 cards displayed above the sites table
 */
import React from 'react';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';

import { Site } from '../../types';

interface DashboardHealthCardsProps {
  sites: Site[];
  /** Sites that need an update (plugin or theme) */
  sitesNeedingUpdatesCount?: number;
  /** Plugins that can be updated across all sites */
  pluginUpdatesCount?: number;
  /** Total plugins across all sites */
  pluginTotalCount?: number;
  /** Themes that can be updated across all sites */
  themeUpdatesCount?: number;
  /** Total themes across all sites */
  themeTotalCount?: number;
}

/** Healthy = no critical health issues + at least 80% of WP site health checks passed */
const isHealthy = (site: Site): boolean => site.healthStatus === 'healthy';

const blueGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';

/** Round white circle for X/X numbers - explicit white bg so it shows on all cards */
const numberCircleSx = {
  flexShrink: 0,
  width: 56,
  height: 56,
  '& .MuiTypography-root': { color: '#ea580c !important' },
  minWidth: 56,
  minHeight: 56,
  borderRadius: '50%',
  background: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ea580c',
  fontFamily: '"Inter", sans-serif',
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums' as const,
  boxShadow: '4px 4px 10px rgba(0,0,0,0.15), -2px -2px 6px rgba(255,255,255,0.8)',
};

/** Card 4 circle - white bg, dark text so XX% is readable on orange card */
const numberCircleCard4Sx = {
  ...numberCircleSx,
  color: '#292F4D',
  '& .MuiTypography-root': { color: '#292F4D !important' },
};

const DashboardHealthCards: React.FC<DashboardHealthCardsProps> = ({
  sites,
  sitesNeedingUpdatesCount = 0,
}) => {
  const total = sites.length;
  const connectedCount = sites.filter((s) => s.status === 'connected').length;
  const healthyCount = sites.filter(isHealthy).length;
  const disconnectedCount = sites.filter((s) => s.status === 'disconnected').length;
  const healthyPct = total > 0 ? Math.round((healthyCount / total) * 100) : 0;
  const connectedPct = total > 0 ? Math.round((connectedCount / total) * 100) : 0;
  // Updates score: % of connected sites that do not need an update (aligned with Updates card)
  const updatesScore =
    connectedCount > 0
      ? Math.round((1 - sitesNeedingUpdatesCount / connectedCount) * 100)
      : 100;
  const totalHealthScore =
    total > 0 ? Math.round((updatesScore + healthyPct + connectedPct) / 3) : 0;

  return (
    <Grid container spacing={2} sx={{ mb: '20px', flexShrink: 0 }}>
      {/* Card 1: Updates */}
      <Grid item xs={12} sm={6} lg={3}>
        <Card sx={{ height: 150, background: blueGradient, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', '& .MuiTypography-root': { color: 'white !important' } }}>
          <SoftBox p={2} flex={1} display="flex" flexDirection="column" alignItems="center" gap={1.5} color="white" position="relative" textAlign="center">
            <SoftTypography variant="button" fontWeight="bold" color="white" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Updates
            </SoftTypography>
            <SoftBox sx={numberCircleSx}>
              <SoftTypography variant="h6" fontWeight="bold" color="#ea580c" sx={{ fontFamily: '"Inter", sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                {sitesNeedingUpdatesCount}/{connectedCount}
              </SoftTypography>
            </SoftBox>
            <SoftTypography variant="caption" color="white" sx={{ opacity: 0.95, fontSize: '0.7rem' }}>
              connected sites need an update.
            </SoftTypography>
          </SoftBox>
        </Card>
      </Grid>

      {/* Card 2: Healthy sites */}
      <Grid item xs={12} sm={6} lg={3}>
        <Card sx={{ height: 150, background: blueGradient, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', '& .MuiTypography-root': { color: 'white !important' } }}>
          <SoftBox p={2} flex={1} display="flex" flexDirection="column" alignItems="center" gap={1.5} color="white" position="relative" textAlign="center">
            <SoftTypography variant="button" fontWeight="bold" color="white" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Healthy Sites
            </SoftTypography>
            <SoftBox sx={numberCircleSx}>
              <SoftTypography variant="h6" fontWeight="bold" color="#ea580c" sx={{ fontFamily: '"Inter", sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                {healthyCount}/{total}
              </SoftTypography>
            </SoftBox>
            <SoftTypography variant="caption" color="white" sx={{ opacity: 0.95, fontSize: '0.7rem' }}>
              sites are healthy
            </SoftTypography>
          </SoftBox>
        </Card>
      </Grid>

      {/* Card 3: Connected */}
      <Grid item xs={12} sm={6} lg={3}>
        <Card sx={{ height: 150, background: blueGradient, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', '& .MuiTypography-root': { color: 'white !important' } }}>
          <SoftBox p={2} flex={1} display="flex" flexDirection="column" alignItems="center" gap={1.5} color="white" position="relative" textAlign="center">
            <SoftTypography variant="button" fontWeight="bold" color="white" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Connection
            </SoftTypography>
            <SoftBox sx={numberCircleSx}>
              <SoftTypography variant="h6" fontWeight="bold" color="#ea580c" sx={{ fontFamily: '"Inter", sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                {total - disconnectedCount}/{total}
              </SoftTypography>
            </SoftBox>
            <SoftTypography variant="caption" color="white" sx={{ opacity: 0.95, fontSize: '0.7rem' }}>
              sites are connected
            </SoftTypography>
          </SoftBox>
        </Card>
      </Grid>

      {/* Card 4: Total Health Score */}
      <Grid item xs={12} sm={6} lg={3}>
        <Card sx={{ height: 150, background: 'linear-gradient(310deg, #ea580c, #fb923c)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', '& .MuiTypography-root': { color: 'white !important' } }}>
          <SoftBox p={2} flex={1} display="flex" flexDirection="column" alignItems="center" gap={1.5} color="white" position="relative" textAlign="center">
            <SoftTypography variant="button" fontWeight="bold" color="white" sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Health Score
            </SoftTypography>
            <SoftBox sx={numberCircleCard4Sx}>
              <SoftTypography variant="h6" fontWeight="bold" color="#292F4D" sx={{ fontFamily: '"Inter", sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                {totalHealthScore}%
              </SoftTypography>
            </SoftBox>
            <SoftTypography variant="caption" fontWeight="regular" color="white" sx={{ opacity: 0.95, fontSize: '0.7rem' }}>
              Your Health Score
            </SoftTypography>
          </SoftBox>
        </Card>
      </Grid>
    </Grid>
  );
};

export default DashboardHealthCards;
