/**
 * Overview tab - 4 cards: Plugins need update, Themes need update, Health analysis, Action log
 */
import React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import DefaultCounterCard from 'examples/Cards/CounterCards/DefaultCounterCard';
import { useSite } from '../../domains/sites';
import { usePlugins, useThemes } from '../../hooks/useWordPress';

interface SiteDetailsTabProps {
  siteId: string;
  onTabChange?: (index: number) => void;
}

const SiteDetailsTab: React.FC<SiteDetailsTabProps> = ({ siteId, onTabChange }) => {
  const { data: site } = useSite(siteId);
  const { data: plugins } = usePlugins(siteId, { enabled: site?.enabled });
  const { data: themes } = useThemes(siteId, { enabled: site?.enabled });

  const pluginsNeedingUpdate = plugins?.filter((p) => p.update != null && String(p.update).trim() !== '').length ?? 0;
  const themesNeedingUpdate = themes?.filter((t) => t.update != null && String(t.update ?? '').trim() !== '').length ?? 0;
  const logCount = Array.isArray(site?.actionLog) ? site.actionLog.length : 0;
  const healthStatus = site?.healthStatus ?? 'unknown';

  if (!site) return null;

  const handleGoToHealth = () => onTabChange?.(3);

  return (
    <SoftBox>
      <Grid container spacing={3}>
        {/* 1. Plugins need update */}
        <Grid item xs={12} sm={6}>
          <DefaultCounterCard
            count={pluginsNeedingUpdate}
            title="Plugins need update"
            description="available"
            color={pluginsNeedingUpdate > 0 ? 'warning' : 'success'}
          />
        </Grid>

        {/* 2. Themes need update */}
        <Grid item xs={12} sm={6}>
          <DefaultCounterCard
            count={themesNeedingUpdate}
            title="Themes need update"
            description="available"
            color={themesNeedingUpdate > 0 ? 'warning' : 'success'}
          />
        </Grid>

        {/* 3. Health analysis details */}
        <Grid item xs={12} sm={6}>
          <Card sx={{ height: '100%', minHeight: 140 }}>
            <SoftBox p={2} height="100%" display="flex" flexDirection="column" justifyContent="space-between">
              <SoftBox display="flex" alignItems="center" gap={1} mb={1}>
                <Icon color={healthStatus === 'healthy' ? 'success' : 'error'}>
                  {healthStatus === 'healthy' ? 'check_circle' : 'warning'}
                </Icon>
                <SoftTypography variant="h6" fontWeight="medium">Health analysis details</SoftTypography>
              </SoftBox>
              <SoftTypography variant="caption" color="secondary" mb={1}>
                Status: {healthStatus === 'healthy' ? 'Healthy' : 'Issues found'}
              </SoftTypography>
              <SoftTypography
                variant="button"
                color="info"
                fontWeight="medium"
                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                onClick={handleGoToHealth}
              >
                View full analysis →
              </SoftTypography>
            </SoftBox>
          </Card>
        </Grid>

        {/* 4. Action log */}
        <Grid item xs={12} sm={6}>
          <Card sx={{ height: '100%', minHeight: 140 }}>
            <SoftBox p={2} height="100%" display="flex" flexDirection="column" justifyContent="space-between">
              <SoftBox display="flex" alignItems="center" gap={1} mb={1}>
                <Icon color="info">history</Icon>
                <SoftTypography variant="h6" fontWeight="medium">Action log</SoftTypography>
              </SoftBox>
              <SoftTypography variant="caption" color="secondary" mb={1}>
                {logCount} action{logCount !== 1 ? 's' : ''} logged
              </SoftTypography>
              <SoftTypography
                variant="button"
                color="info"
                fontWeight="medium"
                sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                onClick={handleGoToHealth}
              >
                View action log →
              </SoftTypography>
            </SoftBox>
          </Card>
        </Grid>
      </Grid>
    </SoftBox>
  );
};

export default SiteDetailsTab;
