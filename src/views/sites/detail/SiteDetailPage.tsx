import PageBreadcrumb from '@/components/PageBreadcrumb.tsx';
import { ContactSupportButton } from '@/components/support/ContactSupportButton';
import { TabNavLabel } from '@/components/TabNavLabel';
import { useNotificationContext } from '@/context/useNotificationContext';
import { useFetchSiteMetaIfNeeded, useSite, useRequestSiteHealthRefresh, useSitesStatusPoll } from '@/domains/sites';
import { hasUpdate, parsePluginsMeta, parseThemesMeta } from '@/domains/sites/installedMeta';
import type { Site, WordPressPlugin, WordPressTheme } from '@/types';
import ViewModeToggle, { type LibraryViewMode } from '@/views/library/components/ViewModeToggle';
import SiteDetailSidebarCard from '@/views/sites/detail/SiteDetailSidebarCard';
import SiteOverviewSitespeedCard from '@/views/sites/detail/SiteOverviewSitespeedCard';
import SiteInstalledExtensionGrid from '@/views/sites/detail/SiteInstalledExtensionGrid';
import { SiteInstalledPluginsTable, SiteInstalledThemesTable } from '@/views/sites/detail/SiteInstalledExtensionsTable';
import { SiteDetailHealthPanel, SiteDetailLogsPanel } from '@/views/sites/detail/SiteDetailSharedPanels';
import { SiteHealthTabStatusBadge } from '@/views/sites/detail/SiteHealthTabStatusBadge';
import { SITE_DETAIL_TAB_CONFIG } from '@/views/sites/detail/siteDetailNavTabs';
import { useEffect, useMemo, useState } from 'react';
import { TbStethoscope } from 'react-icons/tb';
import { Button, Card, CardBody, Col, Container, Nav, Row, Spinner, Tab, Table } from 'react-bootstrap';
import { Link, useParams, useSearchParams } from 'react-router';

const TAB_KEYS = ['overview', 'plugins', 'themes', 'health', 'logs'] as const;
type TabKey = (typeof TAB_KEYS)[number];

function indexFromTabKey(k: string | null): number {
  if (!k) return 0;
  const idx = TAB_KEYS.indexOf(k as TabKey);
  return idx >= 0 ? idx : 0;
}

function formatAvailableUpdate(update: string | { new_version?: string } | null | undefined): string {
  if (update == null) return '—';
  if (typeof update === 'object' && 'new_version' in update && update.new_version != null) {
    return String(update.new_version).trim() || '—';
  }
  const s = String(update).trim();
  return s || '—';
}

function SiteDetailOverview({
  site,
  pluginsWithUpdates,
  themesWithUpdates,
  pluginTotal,
  themeTotal,
  onGoHealth,
}: {
  site: Site;
  pluginsWithUpdates: WordPressPlugin[];
  themesWithUpdates: WordPressTheme[];
  pluginTotal: number;
  themeTotal: number;
  onGoHealth: () => void;
}) {
  const healthOk = site.healthStatus === 'healthy';
  const nPlugins = pluginsWithUpdates.length;
  const nThemes = themesWithUpdates.length;
  const [updatesTab, setUpdatesTab] = useState<'plugins' | 'themes'>('plugins');

  return (
    <>
      <Row className="g-3 align-items-stretch">
        <Col xs={12} md={6} className="d-flex flex-column gap-3 min-h-0 h-100">
          <Card className="flex-grow-1 w-100 border shadow-none d-flex flex-column min-h-0">
            <CardBody className="d-flex flex-column h-100 min-w-0">
              <div className="mb-2">
                <p className="text-muted fs-xs text-uppercase fw-semibold mb-0">Updates needed</p>
                <p className="text-muted fs-xxs mb-0">Plugins and themes with an available update from the last sync</p>
              </div>
              <div className="flex-grow-1 d-flex flex-column min-h-0">
                <Card className="border-0 shadow-none mb-0 flex-grow-1 d-flex flex-column min-h-0 bg-transparent">
                  <CardBody className="p-0 d-flex flex-column flex-grow-1 min-h-0 rounded">
                    <Tab.Container
                      activeKey={updatesTab}
                      onSelect={(k) => {
                        if (k === 'plugins' || k === 'themes') setUpdatesTab(k);
                      }}
                      id={`site-updates-tabs-${site.$id}`}
                    >
                      <div className="px-3 pt-3">
                        <Nav variant="underline" className="fs-xs gap-3 flex-nowrap" role="tablist">
                          <Nav.Item>
                            <Nav.Link eventKey="plugins" className="py-2 px-0">
                              <TabNavLabel Icon={SITE_DETAIL_TAB_CONFIG.plugins.Icon}>
                                Plugins ({nPlugins})
                              </TabNavLabel>
                            </Nav.Link>
                          </Nav.Item>
                          <Nav.Item>
                            <Nav.Link eventKey="themes" className="py-2 px-0">
                              <TabNavLabel Icon={SITE_DETAIL_TAB_CONFIG.themes.Icon}>
                                Themes ({nThemes})
                              </TabNavLabel>
                            </Nav.Link>
                          </Nav.Item>
                        </Nav>
                      </div>
                      <Tab.Content className="flex-grow-1">
                        <Tab.Pane eventKey="plugins" className="p-3">
                          {nPlugins === 0 ? (
                            <p className="text-muted fs-xs mb-0">
                              {pluginTotal === 0 ? 'No plugin data synced yet.' : 'All reported plugins are up to date.'}
                            </p>
                          ) : (
                            <div className="table-responsive border rounded" style={{ maxHeight: '14rem' }}>
                              <Table size="sm" className="mb-0 align-middle">
                                <thead className="table-light position-sticky top-0">
                                  <tr className="fs-xxs text-uppercase">
                                    <th>Name</th>
                                    <th>Installed</th>
                                    <th>Update</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pluginsWithUpdates.map((p) => (
                                    <tr key={p.plugin}>
                                      <td className="text-truncate" style={{ maxWidth: '8rem' }} title={p.name}>
                                        {p.name || p.plugin}
                                      </td>
                                      <td className="text-muted fs-xs text-nowrap">{p.version || '—'}</td>
                                      <td className="fs-xs">
                                        <span className="badge badge-soft-warning fs-xxs">{formatAvailableUpdate(p.update)}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </div>
                          )}
                        </Tab.Pane>
                        <Tab.Pane eventKey="themes" className="p-3">
                          {nThemes === 0 ? (
                            <p className="text-muted fs-xs mb-0">
                              {themeTotal === 0 ? 'No theme data synced yet.' : 'All reported themes are up to date.'}
                            </p>
                          ) : (
                            <div className="table-responsive border rounded" style={{ maxHeight: '14rem' }}>
                              <Table size="sm" className="mb-0 align-middle">
                                <thead className="table-light position-sticky top-0">
                                  <tr className="fs-xxs text-uppercase">
                                    <th>Name</th>
                                    <th>Installed</th>
                                    <th>Update</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {themesWithUpdates.map((t) => (
                                    <tr key={t.stylesheet}>
                                      <td className="text-truncate" style={{ maxWidth: '8rem' }} title={t.name}>
                                        {t.name || t.stylesheet}
                                      </td>
                                      <td className="text-muted fs-xs text-nowrap">{t.version || '—'}</td>
                                      <td className="fs-xs">
                                        <span className="badge badge-soft-warning fs-xxs">
                                          {formatAvailableUpdate(t.update ?? null)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </div>
                          )}
                        </Tab.Pane>
                      </Tab.Content>
                    </Tab.Container>
          </CardBody>
        </Card>
              </div>
              <p className="text-muted fs-xs mb-0 mt-3 pt-3 border-top border-light">
                From last bridge sync · {pluginTotal} plugins, {themeTotal} themes reported
              </p>
          </CardBody>
        </Card>
          <Card className="border shadow-none d-flex flex-column flex-shrink-0">
            <CardBody className="d-flex flex-column flex-grow-1">
            <p className="text-muted fs-xs text-uppercase fw-semibold mb-1">Health</p>
            <p className="mb-2">{healthOk ? 'Status: Healthy' : 'Status: Needs attention'}</p>
            <Button variant="link" className="align-self-start p-0 mt-auto" onClick={onGoHealth}>
              View health details →
            </Button>
          </CardBody>
        </Card>
      </Col>
        <Col xs={12} md={6} className="d-flex min-h-0">
          <SiteOverviewSitespeedCard
            siteId={site.$id}
            siteUrl={site.siteUrl}
            performanceMeta={site.performanceMeta}
          />
      </Col>
    </Row>
    </>
  );
}

const SiteDetailPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabIndex = indexFromTabKey(searchParams.get('tab'));
  const [tab, setTab] = useState(tabIndex);
  const [pluginsViewMode, setPluginsViewMode] = useState<LibraryViewMode>('table');
  const [themesViewMode, setThemesViewMode] = useState<LibraryViewMode>('table');

  useEffect(() => {
    setTab(indexFromTabKey(searchParams.get('tab')));
  }, [searchParams]);

  const setTabKey = (key: TabKey) => {
    const i = TAB_KEYS.indexOf(key);
    setTab(i);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', key);
        return next;
      },
      { replace: true },
    );
  };

  const { data: site, isLoading, isError, error } = useSite(siteId);
  const enabled = site?.enabled !== false;
  const { showNotification } = useNotificationContext();
  const refreshHealthFromBridge = useRequestSiteHealthRefresh();
  const canPushHealthFromNav =
    Boolean(site?.siteUrl?.trim()) && site?.enabled !== false && !refreshHealthFromBridge.isPending;

  useSitesStatusPoll(siteId && enabled ? [siteId] : []);
  useFetchSiteMetaIfNeeded(site);

  const plugins = useMemo(() => parsePluginsMeta(site?.pluginsMeta), [site?.pluginsMeta]);
  const themes = useMemo(() => parseThemesMeta(site?.themesMeta), [site?.themesMeta]);

  const pluginsWithUpdates = useMemo(() => plugins.filter(hasUpdate), [plugins]);
  const themesWithUpdates = useMemo(() => themes.filter(hasUpdate), [themes]);

  const pluginRows = useMemo(() => plugins.map((item) => ({ kind: 'plugin' as const, item })), [plugins]);
  const themeRows = useMemo(() => themes.map((item) => ({ kind: 'theme' as const, item })), [themes]);

  if (isLoading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Site" subtitle="Sites" />
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading…</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (isError || !site) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Site" subtitle="Sites" />
        <Card className="mt-3">
          <CardBody className="text-center py-5">
            <p className="text-danger mb-2">{error?.message ?? 'Site not found.'}</p>
            <Link to="/sites" className="btn btn-primary btn-sm">
              Back to sites
            </Link>
          </CardBody>
        </Card>
      </Container>
    );
  }

  const title = site.siteName?.trim() || 'Site';

  return (
    <Container fluid>
      <PageBreadcrumb title={title} subtitle="Sites" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Row>
            <Col xl={9}>
              <Card className="mb-3 shadow-sm">
                <CardBody className="pb-0 border-bottom border-light">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-0">
                    <Nav variant="underline" className="gap-3 flex-nowrap mb-0 flex-grow-1 min-w-0">
                      {TAB_KEYS.map((key, i) => {
                        const { label, Icon } = SITE_DETAIL_TAB_CONFIG[key];
                        return (
                          <Nav.Item key={key}>
                            <Nav.Link
                              active={tab === i}
                              href="#"
                              className="py-2 px-0"
                              onClick={(e) => {
                                e.preventDefault();
                                setTabKey(key);
                              }}
                            >
                              <span className="d-inline-flex align-items-center gap-2">
                                <TabNavLabel Icon={Icon}>{label}</TabNavLabel>
                                {key === 'health' ? <SiteHealthTabStatusBadge healthMeta={site.healthMeta} /> : null}
                              </span>
                            </Nav.Link>
                          </Nav.Item>
                        );
                      })}
                    </Nav>
                    <Button
                      type="button"
                      variant="light"
                      size="sm"
                      className="d-inline-flex align-items-center justify-content-center flex-shrink-0 rounded-circle p-2 border"
                      disabled={!canPushHealthFromNav}
                      title="Ask the bridge on WordPress to send updated Site Health data"
                      aria-label="Refresh Site Health from WordPress"
                      aria-busy={refreshHealthFromBridge.isPending}
                      onClick={() => {
                        refreshHealthFromBridge.mutate(site.$id, {
                          onSuccess: (res) => {
                            showNotification({
                              title: 'Site Health',
                              message: res.message,
                              variant: 'success',
                              delay: 4000,
                            });
                          },
                          onError: (err) => {
                            showNotification({
                              title: 'Site Health',
                              message: err instanceof Error ? err.message : 'Request failed.',
                              variant: 'danger',
                              delay: 6000,
                            });
                          },
                        });
                      }}
                    >
                      <TbStethoscope className="fs-lg" aria-hidden />
                    </Button>
                  </div>
                </CardBody>
                <CardBody className="pt-4 pb-4">
              {tab === 0 && (
                <SiteDetailOverview
                  site={site}
                      pluginsWithUpdates={pluginsWithUpdates}
                      themesWithUpdates={themesWithUpdates}
                      pluginTotal={plugins.length}
                      themeTotal={themes.length}
                  onGoHealth={() => setTabKey('health')}
                />
              )}
              {tab === 1 && (
                    <div>
                      <div className="d-flex justify-content-end mb-3">
                        <ViewModeToggle
                          value={pluginsViewMode}
                          onChange={setPluginsViewMode}
                          idPrefix="site-plugins"
                        />
                      </div>
                      {pluginsViewMode === 'table' ? (
                        <SiteInstalledPluginsTable
                          siteId={site.$id}
                          plugins={plugins}
                          emptyMessage="No plugins in the last sync. Connect the site and wait for metadata, or open the bridge on the site."
                        />
                      ) : (
                <SiteInstalledExtensionGrid
                  siteId={site.$id}
                  rows={pluginRows}
                  emptyMessage="No plugins in the last sync. Connect the site and wait for metadata, or open the bridge on the site."
                />
                      )}
                    </div>
              )}
              {tab === 2 && (
                    <div>
                      <div className="d-flex justify-content-end mb-3">
                        <ViewModeToggle
                          value={themesViewMode}
                          onChange={setThemesViewMode}
                          idPrefix="site-themes"
                        />
                      </div>
                      {themesViewMode === 'table' ? (
                        <SiteInstalledThemesTable
                          siteId={site.$id}
                          themes={themes}
                          emptyMessage="No themes in the last sync. Connect the site and wait for metadata, or open the bridge on the site."
                        />
                      ) : (
                <SiteInstalledExtensionGrid
                  siteId={site.$id}
                  rows={themeRows}
                  emptyMessage="No themes in the last sync. Connect the site and wait for metadata, or open the bridge on the site."
                />
                      )}
                    </div>
              )}
              {tab === 3 && <SiteDetailHealthPanel site={site} />}
              {tab === 4 && <SiteDetailLogsPanel site={site} />}
                </CardBody>
              </Card>
            </Col>

            <Col xl={3}>
              <SiteDetailSidebarCard site={site} onViewFullLogs={() => setTabKey('logs')} />
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default SiteDetailPage;
