import PageBreadcrumb from '@/components/PageBreadcrumb.tsx';
import { useFetchSiteMetaIfNeeded, useSites, useSitesStatusPoll } from '@/domains/sites';
import type { Site } from '@/types';
import DashboardSitesTable from '@/views/dashboard/components/DashboardSitesTable';
import { useMemo } from 'react';
import { Col, Container, Row, Spinner } from 'react-bootstrap';

const SitesPage = () => {
  const { data: sites, isLoading: sitesLoading } = useSites();
  const siteList: Site[] = sites ?? [];
  const enabledSites: Site[] = useMemo(
    () => siteList.filter((s) => s.enabled !== false),
    [siteList],
  );

  useSitesStatusPoll(enabledSites.map((s) => s.$id));
  useFetchSiteMetaIfNeeded(enabledSites);

  return (
    <Container fluid>
      <PageBreadcrumb title="Sites" subtitle="All connected WordPress sites" />

      {sitesLoading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading…</span>
          </Spinner>
        </div>
      ) : (
        <Row className="g-3">
          <Col xs={12} className="d-flex">
            <DashboardSitesTable sites={enabledSites} initialPageSize={10} />
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default SitesPage;
