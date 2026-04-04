/**
 * Site Detail page - Horizontal tab menu at top, main content left, site card right
 * Tabs: Overview, Plugins, Themes, Health, Logs
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '@mui/material/Icon';
import TabNavList, { TabNavPanel } from 'components/ui/TabNavList';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Footer from 'examples/Footer';

import { useSite, useDeleteSite, useSiteStatusPoll, useFetchSiteMetaIfNeeded } from '../domains/sites';
import { usePageBreadcrumb } from '../contexts/PageBreadcrumbContext';

import { usePlugins } from '../hooks/useWordPress';
import SiteDetailsTab from './site-detail/SiteDetailsTab';
import PluginsTab from './site-detail/PluginsTab';
import ThemesTab from './site-detail/ThemesTab';
import SiteHealthTab from './site-detail/SiteHealthTab';
import LogsTab from './site-detail/LogsTab';
import SiteDetailSidebar from '../components/site-detail/SiteDetailSidebar';
import EditSiteModal from '../components/sites/EditSiteModal';
import { contentPageShellFlexSx } from '../theme/contentPaper';

const TAB_ITEMS = [
  { value: 0, label: 'Overview', icon: 'info' },
  { value: 1, label: 'Plugins', icon: 'extension' },
  { value: 2, label: "Themes", icon: 'palette' },
  { value: 3, label: 'Health', icon: 'health_and_safety' },
  { value: 4, label: 'Logs', icon: 'list_alt' },
];

const SiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(0);
  useEffect(() => {
    const raw = searchParams.get('tab');
    if (raw === null || raw === '') {
      setTab(0);
      return;
    }
    const t = parseInt(raw, 10);
    if (Number.isFinite(t) && t >= 0 && t <= 4) setTab(t);
  }, [searchParams]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { setBreadcrumbConfig } = usePageBreadcrumb();

  const handleTabChange = (_: unknown, value: number) => {
    setTab(value);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', String(value));
        return next;
      },
      { replace: true },
    );
  };

  const { data: site, isLoading, isError, error } = useSite(id);
  const deleteSite = useDeleteSite();
  // Poll every 15s so new heartbeat resets progress quickly (heartbeat every 60s)
  useSiteStatusPoll(site?.enabled !== false ? id : undefined, 15_000);
  usePlugins(id, { enabled: site?.enabled });
  useFetchSiteMetaIfNeeded(site);

  const tabInUrl = searchParams.get('tab');
  const breadcrumbActiveTab: number | null =
    tabInUrl === null || tabInUrl === '' ? null : tab;

  useEffect(() => {
    if (!site || !id) {
      setBreadcrumbConfig(null);
      return;
    }
    const name = site.siteName || 'Site';
    const pageHref = `/sites/${id}`;
    setBreadcrumbConfig({
      pageName: name,
      pageHref,
      tabs: TAB_ITEMS.map((t) => ({
        label: t.label,
        icon: t.icon,
        href: `${pageHref}?tab=${t.value}`,
      })),
      activeTabIndex: breadcrumbActiveTab,
    });
    return () => setBreadcrumbConfig(null);
  }, [site, id, breadcrumbActiveTab, setBreadcrumbConfig]);

  const handleRemove = () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to remove this site?')) {
      deleteSite.mutate(id, { onSuccess: () => navigate('/sites') });
    }
  };

  if (isLoading) {
    return (
      <SoftBox display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={12}>
        <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} className="spin">sync</Icon>
        <SoftTypography variant="button" color="secondary">Site gegevens ophalen...</SoftTypography>
      </SoftBox>
    );
  }

  if (isError || !site) {
    return (
      <SoftBox py={6} textAlign="center">
        <Icon sx={{ fontSize: 48, color: 'error.main', mb: 2 }}>error</Icon>
        <SoftTypography variant="h5" fontWeight="medium" mb={1}>Site not found</SoftTypography>
        <SoftTypography variant="button" color="secondary" mb={2}>{error?.message || `No site with ID: ${id}`}</SoftTypography>
        <SoftButton variant="gradient" color="info" size="small" onClick={() => navigate('/sites')}>Back to overview</SoftButton>
      </SoftBox>
    );
  }

  return (
    <>
      <SoftBox sx={{ ...contentPageShellFlexSx, backgroundColor: 'transparent' }}>
        {/* Tabs only above left column; right column aligns with scroll content (same row as main, not tabs) */}
        <SoftBox
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'grid',
            columnGap: { xs: 0, lg: 3 },
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 8fr) minmax(0, 4fr)' },
            gridTemplateRows: { xs: 'auto minmax(0, 1fr) auto', lg: 'auto minmax(0, 1fr)' },
            gridTemplateAreas: {
              xs: '"tabs" "main" "sidebar"',
              lg: '"tabs tabGap" "main sidebar"',
            },
          }}
        >
          <SoftBox sx={{ gridArea: 'tabs' }}>
            <TabNavList items={TAB_ITEMS} value={tab} onChange={handleTabChange} />
          </SoftBox>
          <SoftBox sx={{ gridArea: 'tabGap', display: { xs: 'none', lg: 'block' } }} />
          <SoftBox
            sx={{
              gridArea: 'main',
              minHeight: 0,
              overflow: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              px: 3,
              pb: 3,
            }}
          >
            <TabNavPanel value={tab} index={0}>
              <SiteDetailsTab siteId={site.$id} onTabChange={(idx) => handleTabChange(null, idx)} />
            </TabNavPanel>
            <TabNavPanel value={tab} index={1}>
              <PluginsTab siteId={site.$id} />
            </TabNavPanel>
            <TabNavPanel value={tab} index={2}>
              <ThemesTab siteId={site.$id} />
            </TabNavPanel>
            <TabNavPanel value={tab} index={3}>
              <SiteHealthTab siteId={site.$id} />
            </TabNavPanel>
            <TabNavPanel value={tab} index={4}>
              <LogsTab siteId={site.$id} />
            </TabNavPanel>
          </SoftBox>
          <SoftBox sx={{ gridArea: 'sidebar', pr: { lg: 4 }, minHeight: 0 }}>
            <SiteDetailSidebar
              site={site}
              onEdit={() => setEditModalOpen(true)}
              onRemove={handleRemove}
            />
          </SoftBox>
        </SoftBox>
      </SoftBox>

      <EditSiteModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        site={site}
      />

      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default SiteDetailPage;
