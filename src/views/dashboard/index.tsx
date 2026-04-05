import { DocHelpButton } from '@/components/docs/DocHelpButton'
import PageBreadcrumb from '@/components/PageBreadcrumb.tsx'
import { buildLibraryDashboardRows } from '@/domains/library'
import { useFetchSiteMetaIfNeeded, useSites, useSitesStatusPoll } from '@/domains/sites'
import { useLibraryItems } from '@/hooks/useLibrary'
import { useSitesUpdateStats } from '@/hooks/useSitesUpdateStats'
import type { Site } from '@/types'
import DashboardSitesLibraryTabs from '@/views/dashboard/components/DashboardSitesLibraryTabs'
import StatisticWidget from '@/views/dashboards/dashboard2/components/StatisticWidget'
import type { StatisticType } from '@/views/dashboards/dashboard2/data'
import { useMemo } from 'react'
import { Col, Container, Row, Spinner } from 'react-bootstrap'
import { TbActivityHeartbeat, TbHeart, TbPackage, TbPlugConnected } from 'react-icons/tb'

function buildHealthStatItems(sites: Site[], updateStats: ReturnType<typeof useSitesUpdateStats>): StatisticType[] {
  const enabledSites = sites.filter((s) => s.enabled !== false);
  const total = enabledSites.length;
  const connectedCount = enabledSites.filter((s) => s.status === 'connected').length;
  const healthyCount = enabledSites.filter((s) => s.healthStatus === 'healthy').length;
  const disconnectedCount = enabledSites.filter((s) => s.status === 'disconnected').length;
  const sitesNeedingUpdatesCount = updateStats.sitesNeedingUpdatesCount;
  const healthyPct = total > 0 ? Math.round((healthyCount / total) * 100) : 0;
  const connectedPct = total > 0 ? Math.round(((total - disconnectedCount) / total) * 100) : 0;
  const updatesScore =
    connectedCount > 0 ? Math.round((1 - sitesNeedingUpdatesCount / connectedCount) * 100) : 100;
  const totalHealthScore =
    total > 0 ? Math.round((updatesScore + healthyPct + connectedPct) / 3) : 0;

  return [
    {
      icon: TbPackage,
      title: 'Sites needing updates',
      subtitle: 'UPDATE SCORE',
      count: sitesNeedingUpdatesCount,
      variant: sitesNeedingUpdatesCount > 0 ? 'warning' : 'success',
      progress: updatesScore,
    },
    {
      icon: TbHeart,
      title: 'Healthy sites',
      subtitle: 'HEALTH RATE',
      count: healthyCount,
      variant: 'success',
      progress: healthyPct,
    },
    {
      icon: TbPlugConnected,
      title: 'Connected sites',
      subtitle: 'CONNECTION',
      count: total - disconnectedCount,
      variant: connectedPct >= 80 ? 'success' : connectedPct >= 50 ? 'warning' : 'danger',
      progress: connectedPct,
    },
    {
      icon: TbActivityHeartbeat,
      title: 'Health score',
      subtitle: 'OVERALL',
      count: totalHealthScore,
      variant:
        totalHealthScore >= 80 ? 'success' : totalHealthScore >= 50 ? 'warning' : 'danger',
      progress: totalHealthScore,
    },
  ];
}

const DashboardPage = () => {
  const { data: sites, isLoading: sitesLoading } = useSites();
  const { data: libraryItems = [], isLoading: libraryLoading, isError: libraryError, error: libraryErr } =
    useLibraryItems();
  const libraryRows = useMemo(() => buildLibraryDashboardRows(libraryItems), [libraryItems]);
  const siteList: Site[] = sites ?? [];
  const enabledSites: Site[] = useMemo(() => {
    return siteList.filter((s) => s.enabled !== false);
  }, [siteList]);
  const updateStats = useSitesUpdateStats(enabledSites, { isLoading: sitesLoading });

  useSitesStatusPoll(enabledSites.map((s: Site) => s.$id));
  useFetchSiteMetaIfNeeded(enabledSites);

  const statItems = useMemo(
    () => buildHealthStatItems(enabledSites, updateStats),
    [enabledSites, updateStats.sitesNeedingUpdatesCount, sitesLoading]
  );

  return (
    <Container fluid>
      <PageBreadcrumb title="Dashboard" titleEnd={<DocHelpButton contextKey="dashboard" />} />

      {sitesLoading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading…</span>
          </Spinner>
        </div>
      ) : (
        <>
          <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1 g-3 align-items-stretch mb-3">
            {statItems.map((item, idx) => (
              <Col key={idx}>
                <StatisticWidget item={item} />
              </Col>
            ))}
          </Row>

          <Row className="g-3 align-items-stretch">
            <Col xs={12} className="d-flex">
              <DashboardSitesLibraryTabs
                sites={enabledSites}
                libraryRows={libraryRows}
                libraryLoading={libraryLoading}
                libraryError={libraryError}
                libraryErrorMessage={
                  libraryErr instanceof Error ? libraryErr.message : 'Could not load library.'
                }
              />
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default DashboardPage;
