import { TabNavLabel } from '@/components/TabNavLabel'
import type { LibraryDashboardRow } from '@/domains/library'
import type { Site } from '@/types'
import DashboardLibraryTable from '@/views/dashboard/components/DashboardLibraryTable'
import DashboardSitesTable from '@/views/dashboard/components/DashboardSitesTable'
import { Card, CardBody, CardHeader, Nav, Spinner, Tab } from 'react-bootstrap'
import { TbLibrary, TbWorld } from 'react-icons/tb'

export type DashboardSitesLibraryTabsProps = {
  sites: Site[];
  libraryRows: LibraryDashboardRow[];
  libraryLoading: boolean;
  libraryError: boolean;
  libraryErrorMessage: string;
};

const DashboardSitesLibraryTabs = ({
  sites,
  libraryRows,
  libraryLoading,
  libraryError,
  libraryErrorMessage,
}: DashboardSitesLibraryTabsProps) => {
  return (
    <Card className="h-100 w-100 d-flex flex-column">
      <Tab.Container defaultActiveKey="sites" id="dashboard-sites-library-tabs">
        <CardHeader className="border-light flex-shrink-0 card-tabs pb-0">
          <Nav variant="tabs" className="nav-tabs card-header-tabs nav-bordered mb-0" role="tablist">
            <Nav.Item>
              <Nav.Link eventKey="sites" role="tab">
                <TabNavLabel Icon={TbWorld}>
                  Sites
                  <span className="badge badge-label badge-soft-secondary fs-xxs ms-1">{sites.length}</span>
                </TabNavLabel>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="library" role="tab">
                <TabNavLabel Icon={TbLibrary}>
                  Library items
                  <span className="badge badge-label badge-soft-secondary fs-xxs ms-1">{libraryRows.length}</span>
                </TabNavLabel>
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </CardHeader>
        <CardBody className="p-0 d-flex flex-column flex-grow-1 min-h-0">
          <Tab.Content className="d-flex flex-column flex-grow-1 min-h-0">
            <Tab.Pane eventKey="sites" className="m-0">
              <div className="d-flex flex-column flex-grow-1 min-h-0 h-100">
                <DashboardSitesTable sites={sites} embedded />
              </div>
            </Tab.Pane>
            <Tab.Pane eventKey="library" className="m-0">
              <div className="d-flex flex-column flex-grow-1 min-h-0 h-100">
                {libraryLoading ? (
                  <div className="d-flex flex-grow-1 w-100 min-h-0 justify-content-center align-items-center py-5">
                    <Spinner animation="border" role="status" variant="primary">
                      <span className="visually-hidden">Loading library…</span>
                    </Spinner>
                  </div>
                ) : libraryError ? (
                  <div className="d-flex flex-grow-1 w-100 min-h-0 align-items-center p-4 text-danger small">
                    {libraryErrorMessage}
                  </div>
                ) : (
                  <DashboardLibraryTable rows={libraryRows} embedded />
                )}
              </div>
            </Tab.Pane>
          </Tab.Content>
        </CardBody>
      </Tab.Container>
    </Card>
  );
};

export default DashboardSitesLibraryTabs;
