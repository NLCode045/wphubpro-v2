/**
 * Dashboard page — health summary, tabbed main area (Sites, Updates, Health, Logs), subscription card.
 */
import React, { useState } from 'react';
import Grid from '@mui/material/Grid';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import SoftBox from 'components/SoftBox';
import Footer from 'examples/Footer';

import { useSubscription, useUsage } from '../domains/billing';
import { useSites, useSitesStatusPoll, useFetchSiteMetaIfNeeded } from '../domains/sites';
import { useSitesUpdateStats } from '../hooks/useWordPress';

import DashboardHealthCards from '../components/dashboard/DashboardHealthCards';
import DashboardSitesTable from '../components/dashboard/DashboardSitesTable';
import DashboardSubscriptionCard from '../components/dashboard/DashboardSubscriptionCard';
import DashboardNotificationsCard from '../components/dashboard/DashboardNotificationsCard';
import DashboardUpdatesTable from '../components/dashboard/DashboardUpdatesTable';
import DashboardHealthSitesTable from '../components/dashboard/DashboardHealthSitesTable';
import DashboardLogsSitesTable from '../components/dashboard/DashboardLogsSitesTable';
import { CONTENT_PAGE_MARGIN_TOP } from '../theme/contentPaper';
import 'soft-ui-library/dist/css/neumorphism-ui.css';

const DASHBOARD_TAB_SITES = 0;
const DASHBOARD_TAB_UPDATES = 1;
const DASHBOARD_TAB_HEALTH = 2;
const DASHBOARD_TAB_LOGS = 3;

const dashboardTabsSx = {
  minHeight: 40,
  mb: 1.5,
  flexShrink: 0,
  '& .MuiTab-root': {
    minHeight: 40,
    py: 1,
    textTransform: 'none' as const,
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  '& .MuiTabs-indicator': {
    height: 3,
    borderRadius: '3px 3px 0 0',
    backgroundColor: 'primary.main',
  },
};

const DashboardPage: React.FC = () => {
  const [mainTab, setMainTab] = useState(DASHBOARD_TAB_SITES);
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: usage } = useUsage();
  const { data: sites, isLoading: sitesLoading } = useSites();
  const enabledSites = (sites ?? []).filter((s) => s.enabled !== false);
  const updateStats = useSitesUpdateStats(enabledSites, { isLoading: sitesLoading });
  useSitesStatusPoll(enabledSites.map((s) => s.$id));
  useFetchSiteMetaIfNeeded(enabledSites);

  return (
    <SoftBox
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        mt: CONTENT_PAGE_MARGIN_TOP,
      }}
    >
      <Grid container spacing={2} alignItems="stretch">
        <Grid
          size={{ xs: 12, md: 5, lg: 4 }}
          sx={{ display: 'flex', flexDirection: 'column' }}
        >
          <DashboardSubscriptionCard subscription={subscription} usage={usage} isLoading={subLoading} />
        </Grid>
        <Grid
          size={{ xs: 12, md: 7, lg: 8 }}
          sx={{ display: 'flex', flexDirection: 'column' }}
        >
          <DashboardNotificationsCard />
        </Grid>

        <Grid size={12} sx={{ display: 'flex', flexDirection: 'column', py: 0 }}>
          <DashboardHealthCards
            sites={enabledSites}
            sitesNeedingUpdatesCount={updateStats.sitesNeedingUpdatesCount}
            pluginUpdatesCount={updateStats.pluginUpdatesCount}
            pluginTotalCount={updateStats.pluginTotalCount}
            themeUpdatesCount={updateStats.themeUpdatesCount}
            themeTotalCount={updateStats.themeTotalCount}
          />
          <Tabs
            value={mainTab}
            onChange={(_, v) => setMainTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={dashboardTabsSx}
          >
            <Tab label="Sites" />
            <Tab label="Updates" />
            <Tab label="Health" />
            <Tab label="Logs" />
          </Tabs>
          <SoftBox sx={{ width: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {mainTab === DASHBOARD_TAB_SITES && <DashboardSitesTable sites={sites ?? []} />}
            {mainTab === DASHBOARD_TAB_UPDATES && <DashboardUpdatesTable sites={sites ?? []} />}
            {mainTab === DASHBOARD_TAB_HEALTH && <DashboardHealthSitesTable sites={sites ?? []} />}
            {mainTab === DASHBOARD_TAB_LOGS && <DashboardLogsSitesTable sites={sites ?? []} />}
          </SoftBox>
        </Grid>
      </Grid>
      <SoftBox sx={{ flexShrink: 0, pt: '5px', '& .MuiTypography-root': { fontSize: '0.8rem' } }}>
        <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
      </SoftBox>
    </SoftBox>
  );
};

export default DashboardPage;
