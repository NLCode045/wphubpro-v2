/**
 * Dashboard sites monitor - Updates, % healthy, disconnected count
 */
import React from 'react';
import Card from '@mui/material/Card';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import { Site } from '../../types';

interface DashboardSitesMonitorProps {
  sites: Site[];
  pluginUpdatesCount?: number;
  themeUpdatesCount?: number;
}

const DashboardSitesMonitor: React.FC<DashboardSitesMonitorProps> = ({
  sites,
  pluginUpdatesCount = 0,
  themeUpdatesCount = 0,
}) => {
  const healthyCount = sites.filter((s) => s.healthStatus === 'healthy').length;
  const disconnectedCount = sites.filter((s) => s.status === 'disconnected').length;
  const total = sites.length;
  const healthyPct = total > 0 ? Math.round((healthyCount / total) * 100) : 0;

  return (
    <Card>
      <SoftBox p={2}>
        <SoftBox display="flex" flexDirection="column" gap={0.75}>
          <SoftBox display="flex" alignItems="center" gap={1}>
            <Icon color="info" sx={{ fontSize: 18 }}>system_update</Icon>
            <SoftTypography variant="caption">
              {pluginUpdatesCount} plugin{pluginUpdatesCount !== 1 ? 's' : ''} &amp; {themeUpdatesCount} theme{themeUpdatesCount !== 1 ? 's' : ''} updates
            </SoftTypography>
          </SoftBox>
          <SoftBox display="flex" alignItems="center" gap={1}>
            <Icon color={healthyPct >= 80 ? 'success' : healthyPct >= 50 ? 'warning' : 'error'} sx={{ fontSize: 18 }}>monitor_heart</Icon>
            <SoftTypography variant="caption">
              {healthyPct}% sites healthy
            </SoftTypography>
          </SoftBox>
          <SoftBox display="flex" alignItems="center" gap={1}>
            <Icon color={disconnectedCount === 0 ? 'success' : 'error'} sx={{ fontSize: 18 }}>link</Icon>
            <SoftTypography variant="caption">
              {disconnectedCount === 0 ? 'Alles verbonden' : `${disconnectedCount} losgekoppeld`}
            </SoftTypography>
          </SoftBox>
        </SoftBox>
      </SoftBox>
    </Card>
  );
};

export default DashboardSitesMonitor;
