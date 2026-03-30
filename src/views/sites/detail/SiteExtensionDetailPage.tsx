import PageBreadcrumb from '@/components/PageBreadcrumb.tsx';
import { TabNavLabel } from '@/components/TabNavLabel';
import { ROUTE_PATHS } from '@/config/routePaths';
import {
  hasUpdate,
  parseActionLogForExtensionAudit,
  parsePluginsMeta,
  parseThemesMeta,
  useFetchSiteMetaIfNeeded,
  useSite,
  useSitesStatusPoll,
} from '@/domains/sites';
import type { Site, WordPressPlugin, WordPressTheme } from '@/types';
import SiteActionHistoryList from '@/views/sites/detail/SiteActionHistoryList';
import SiteDetailSidebarCard from '@/views/sites/detail/SiteDetailSidebarCard';
import SiteOverviewSitespeedCard from '@/views/sites/detail/SiteOverviewSitespeedCard';
import { SiteDetailHealthPanel, SiteDetailLogsPanel } from '@/views/sites/detail/SiteDetailSharedPanels';
import { SiteHealthTabStatusBadge } from '@/views/sites/detail/SiteHealthTabStatusBadge';
import { SITE_DETAIL_TAB_CONFIG } from '@/views/sites/detail/siteDetailNavTabs';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, Col, Container, Nav, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

const EXT_TAB_KEYS = ['overview', 'health', 'logs'] as const;
type ExtTabKey = (typeof EXT_TAB_KEYS)[number];

function indexFromExtTabKey(k: string | null): number {
  if (!k) return 0;
  const idx = EXT_TAB_KEYS.indexOf(k as ExtTabKey);
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

type ExtensionKind = 'plugin' | 'theme';

function SiteExtensionOverview({
  site,
  kind,
  plugin,
  theme,
}: {
  site: Site;
  kind: ExtensionKind;
  plugin: WordPressPlugin | null;
  theme: WordPressTheme | null;
}) {
  const auditLines = useMemo(
    () =>
      kind === 'theme' && theme
        ? parseActionLogForExtensionAudit(site.actionLog, 'theme', theme.stylesheet)
        : [],
    [site.actionLog, kind, theme],
  );

  const item = kind === 'plugin' ? plugin : theme;
  const updateAvail = item ? hasUpdate(item) : false;

  return (
    <Row className="g-3 align-items-stretch">
      <Col xs={12} md={kind === 'plugin' ? 12 : 6} className="d-flex flex-column gap-3 min-h-0">
        <Card className="flex-grow-1 border shadow-none">
          <CardBody>
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className={`badge badge-soft-${kind === 'plugin' ? 'primary' : 'info'} fs-xxs`}>
                {kind === 'plugin' ? 'Plugin' : 'Theme'}
              </span>
              {item?.status === 'active' ? (
                <span className="badge badge-soft-success fs-xxs">Active</span>
              ) : (
                <span className="badge badge-soft-secondary fs-xxs">Inactive</span>
              )}
              {updateAvail ? <span className="badge badge-soft-warning fs-xxs">Update available</span> : null}
            </div>
            <p className="text-muted fs-xs text-uppercase fw-semibold mb-1">Identifier</p>
            <p className="font-monospace small text-break mb-3">
              {kind === 'plugin' ? plugin?.plugin ?? '—' : theme?.stylesheet ?? '—'}
            </p>
            <dl className="row mb-0 small">
              <dt className="col-sm-4 text-muted">Version</dt>
              <dd className="col-sm-8 mb-2">{item?.version || '—'}</dd>
              {kind === 'plugin' && plugin?.author ? (
                <>
                  <dt className="col-sm-4 text-muted">Author</dt>
                  <dd className="col-sm-8 mb-2">{plugin.author}</dd>
                </>
              ) : null}
              {updateAvail ? (
                <>
                  <dt className="col-sm-4 text-muted">Update to</dt>
                  <dd className="col-sm-8 mb-2">
                    <span className="badge badge-soft-warning fs-xxs">
                      {formatAvailableUpdate(kind === 'plugin' ? plugin?.update : theme?.update)}
                    </span>
                  </dd>
                </>
              ) : null}
            </dl>
            {kind === 'plugin' && plugin?.description ? (
              <>
                <p className="text-muted fs-xs text-uppercase fw-semibold mb-1 mt-3">Description</p>
                <p className="small text-muted mb-0">{plugin.description}</p>
              </>
            ) : null}
          </CardBody>
        </Card>
        {kind === 'theme' ? (
          <Card className="border shadow-none">
            <CardBody>
              <h5 className="fs-base mb-2">Actions for this theme</h5>
              <p className="text-muted fs-xs mb-3">From the site&apos;s bridge action log, filtered to this extension.</p>
              <SiteActionHistoryList
                lines={auditLines}
                emptyText="No recorded actions for this theme yet."
                variant="panel-light"
              />
            </CardBody>
          </Card>
        ) : null}
      </Col>
      {kind === 'theme' ? (
        <Col xs={12} md={6} className="d-flex min-h-0">
          <SiteOverviewSitespeedCard
            siteId={site.$id}
            siteUrl={site.siteUrl}
            performanceMeta={site.performanceMeta}
          />
        </Col>
      ) : null}
    </Row>
  );
}

const SiteExtensionDetailPage = () => {
  const navigate = useNavigate();
  const { siteId, pluginId, themeId } = useParams<{ siteId: string; pluginId?: string; themeId?: string }>();
  const kind: ExtensionKind | null = pluginId != null ? 'plugin' : themeId != null ? 'theme' : null;
  const rawKey = kind === 'plugin' ? pluginId : themeId;
  const extensionKey = rawKey ? decodeURIComponent(rawKey) : '';

  const [searchParams, setSearchParams] = useSearchParams();
  const tabIndex = indexFromExtTabKey(searchParams.get('tab'));
  const [tab, setTab] = useState(tabIndex);

  useEffect(() => {
    setTab(indexFromExtTabKey(searchParams.get('tab')));
  }, [searchParams]);

  const setTabKey = (key: ExtTabKey) => {
    const i = EXT_TAB_KEYS.indexOf(key);
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

  useSitesStatusPoll(siteId && enabled ? [siteId] : []);
  useFetchSiteMetaIfNeeded(site);

  const plugins = useMemo(() => parsePluginsMeta(site?.pluginsMeta), [site?.pluginsMeta]);
  const themes = useMemo(() => parseThemesMeta(site?.themesMeta), [site?.themesMeta]);

  const plugin = useMemo(() => {
    if (kind !== 'plugin' || !extensionKey) return null;
    const nk = extensionKey.replace(/\\/g, '/').trim().toLowerCase();
    return plugins.find((p) => p.plugin.replace(/\\/g, '/').trim().toLowerCase() === nk) ?? null;
  }, [kind, extensionKey, plugins]);

  const theme = useMemo(() => {
    if (kind !== 'theme' || !extensionKey) return null;
    const nk = extensionKey.trim().toLowerCase();
    return themes.find((t) => t.stylesheet.trim().toLowerCase() === nk) ?? null;
  }, [kind, extensionKey, themes]);

  if (!siteId || !kind || !rawKey) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Extension" subtitle="Sites" />
        <Card className="mt-3">
          <CardBody className="text-center py-5">
            <p className="text-danger mb-2">Invalid extension URL.</p>
            <Link to={ROUTE_PATHS.SITES} className="btn btn-primary btn-sm">
              Back to sites
            </Link>
          </CardBody>
        </Card>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Extension" subtitle="Sites" />
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
        <PageBreadcrumb title="Extension" subtitle="Sites" />
        <Card className="mt-3">
          <CardBody className="text-center py-5">
            <p className="text-danger mb-2">{error?.message ?? 'Site not found.'}</p>
            <Link to={ROUTE_PATHS.SITES} className="btn btn-primary btn-sm">
              Back to sites
            </Link>
          </CardBody>
        </Card>
      </Container>
    );
  }

  if ((kind === 'plugin' && !plugin) || (kind === 'theme' && !theme)) {
    const listTab = kind === 'plugin' ? 'plugins' : 'themes';
    return (
      <Container fluid>
        <PageBreadcrumb title="Extension" subtitle="Sites" />
        <Card className="mt-3">
          <CardBody className="text-center py-5">
            <p className="text-muted mb-3">
              This {kind} is not in the last sync for this site. Open the bridge or wait for metadata.
            </p>
            <Link to={`${ROUTE_PATHS.siteDetailPath(site.$id)}?tab=${listTab}`} className="btn btn-primary btn-sm">
              Back to site {listTab}
            </Link>
          </CardBody>
        </Card>
      </Container>
    );
  }

  const displayName =
    kind === 'plugin' ? (plugin?.name?.trim() || plugin?.plugin || 'Plugin') : (theme?.name?.trim() || theme?.stylesheet || 'Theme');

  const backListTab = kind === 'plugin' ? 'plugins' : 'themes';

  return (
    <Container fluid>
      <PageBreadcrumb title={displayName} subtitle="Sites" />

      <div className="mb-3">
        <Link
          to={`${ROUTE_PATHS.siteDetailPath(site.$id)}?tab=${backListTab}`}
          className="btn btn-link p-0 text-decoration-none"
        >
          ← Back to site · {site.siteName?.trim() || 'Site'}
        </Link>
      </div>

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Row>
            <Col xl={9}>
              <Card className="mb-3 shadow-sm">
                {kind === 'theme' ? (
                  <CardBody className="pb-0 border-bottom border-light">
                    <Nav variant="underline" className="gap-3 flex-nowrap mb-0">
                      {EXT_TAB_KEYS.map((key, i) => {
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
                  </CardBody>
                ) : null}
                <CardBody className={` pb-4 ${kind === 'theme' ? 'pt-4' : 'pt-3'}`}>
                  {kind === 'plugin' ? (
                    <SiteExtensionOverview site={site} kind={kind} plugin={plugin} theme={theme} />
                  ) : (
                    <>
                      {tab === 0 && (
                        <SiteExtensionOverview site={site} kind={kind} plugin={plugin} theme={theme} />
                      )}
                      {tab === 1 && <SiteDetailHealthPanel site={site} />}
                      {tab === 2 && <SiteDetailLogsPanel site={site} />}
                    </>
                  )}
                </CardBody>
              </Card>
            </Col>

            <Col xl={3}>
              <SiteDetailSidebarCard
                site={site}
                onViewFullLogs={
                  kind === 'plugin'
                    ? () => navigate(`${ROUTE_PATHS.siteDetailPath(site.$id)}?tab=logs`)
                    : () => setTabKey('logs')
                }
              />
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default SiteExtensionDetailPage;
