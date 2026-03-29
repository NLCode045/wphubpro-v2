import PageBreadcrumb from '@/components/PageBreadcrumb';
import { TabNavLabel } from '@/components/TabNavLabel';
import { ROUTE_PATHS } from '@/config/routePaths';
import {
  decodeHtmlEntities,
  filterCollectionsContainingSlug,
  filterFamiliesContainingSlug,
  filterLibraryItemsBySlugAndType,
} from '@/domains/library';
import { parsePluginsMeta, parseThemesMeta } from '@/domains/sites/installedMeta';
import { useFetchSiteMetaIfNeeded, useSites } from '@/domains/sites';
import { useDeleteLibraryItem, useLibraryItems } from '@/hooks/useLibrary';
import { useLibraryCollections, useLibraryFamilies } from '@/hooks/useLibraryFamiliesAndCollections';
import { getWpPluginInfo } from '@/services/wordpress';
import type { LibraryItem, LibraryItemSource, Site, WordPressPlugin, WordPressTheme } from '@/types';
import LibraryItemDetailInfoCard from '@/views/library/detail/LibraryItemDetailInfoCard';
import { LIBRARY_ITEM_DETAIL_TAB_CONFIG } from '@/views/library/detail/libraryItemDetailNavTabs';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Nav,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { TbTrash } from 'react-icons/tb';

const TAB_KEYS = ['overview', 'versions', 'sites'] as const;
type TabKey = (typeof TAB_KEYS)[number];

function indexFromTabKey(k: string | null): number {
  if (!k) return 0;
  const idx = TAB_KEYS.indexOf(k as TabKey);
  return idx >= 0 ? idx : 0;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function sourceLabel(source: LibraryItemSource): string {
  if (source === 'official') return 'WordPress.org';
  if (source === 'local') return 'Uploaded';
  return 'Remote URL';
}

function pluginDirFromFile(pluginFile: string): string {
  const t = pluginFile.trim();
  const i = t.indexOf('/');
  return (i > 0 ? t.slice(0, i) : t).toLowerCase();
}

function compareSemverDesc(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return y - x;
  }
  return 0;
}

const LibraryItemDetailPage = () => {
  const { itemKind: rawKind, itemSlug } = useParams<{ itemKind: string; itemSlug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabIndex = indexFromTabKey(searchParams.get('tab'));
  const [tab, setTab] = useState(tabIndex);

  const itemKind: 'plugin' | 'theme' | null =
    rawKind === 'plugin' ? 'plugin' : rawKind === 'theme' ? 'theme' : null;
  const slug = (itemSlug ?? '').trim().toLowerCase();

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

  const { data: libraryItems = [], isLoading: itemsLoading, isError: itemsError, error: itemsErr } =
    useLibraryItems();
  const { data: sites = [] } = useSites();
  const { data: families = [] } = useLibraryFamilies();
  const { data: collections = [] } = useLibraryCollections();
  const deleteMutation = useDeleteLibraryItem();

  useFetchSiteMetaIfNeeded(sites);

  const groupItems = useMemo(() => {
    if (!itemKind || !slug) return [];
    return filterLibraryItemsBySlugAndType(libraryItems, slug, itemKind);
  }, [libraryItems, itemKind, slug]);

  const { data: wpInfo, isLoading: wpLoading } = useQuery({
    queryKey: ['wpPluginInfo', slug],
    queryFn: () => getWpPluginInfo(slug),
    enabled: itemKind === 'plugin' && slug.length > 0,
    staleTime: 1000 * 60 * 10,
  });

  const officialItems = useMemo(() => groupItems.filter((i) => i.source === 'official'), [groupItems]);
  const localItems = useMemo(() => groupItems.filter((i) => i.source === 'local'), [groupItems]);
  const remoteItems = useMemo(() => groupItems.filter((i) => i.source === 'remote'), [groupItems]);

  const displayName = useMemo(() => {
    const o = officialItems[0];
    const l = localItems[0];
    const r = remoteItems[0];
    const raw = o?.name ?? l?.name ?? r?.name ?? slug;
    return decodeHtmlEntities(String(raw || 'Library item'));
  }, [officialItems, localItems, remoteItems, slug]);

  const displayAuthor = useMemo(() => {
    const o = officialItems[0];
    const l = localItems[0];
    const r = remoteItems[0];
    const fromItem = (o?.author ?? l?.author ?? r?.author ?? '').replace(/<[^>]*>/g, '').trim();
    if (fromItem) return fromItem;
    return (wpInfo?.author ?? '').replace(/<[^>]*>/g, '').trim();
  }, [officialItems, localItems, remoteItems, wpInfo?.author]);

  const authorHref = wpInfo?.authorUri ?? wpInfo?.homepage;

  const longDescription = useMemo(() => {
    const fromWp = wpInfo?.description ? stripHtml(wpInfo.description) : '';
    let best = '';
    for (const i of groupItems) {
      const t = stripHtml(i.description ?? '');
      if (t.length > best.length) best = t;
    }
    return best.length >= fromWp.length ? best : fromWp;
  }, [groupItems, wpInfo?.description]);

  const descriptionShort = useMemo(() => {
    const t = longDescription.slice(0, 220);
    return longDescription.length > 220 ? `${t}…` : t;
  }, [longDescription]);

  const mergedTags = useMemo(() => {
    const s = new Set<string>();
    groupItems.forEach((i) =>
      (i.tags ?? []).forEach((t) => {
        const x = String(t).trim();
        if (x) s.add(x);
      }),
    );
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [groupItems]);

  const wpVersionList = useMemo(() => {
    if (!wpInfo?.versions) return [] as string[];
    return Object.keys(wpInfo.versions)
      .filter((v) => v !== 'trunk')
      .sort(compareSemverDesc);
  }, [wpInfo?.versions]);

  const latestKnownVersion = useMemo(() => {
    const wpLatest = wpInfo?.version ?? '';
    const vers = [
      wpLatest,
      ...localItems.map((i) => i.version),
      ...remoteItems.map((i) => i.version),
      ...officialItems.filter((i) => i.version && i.version !== 'latest').map((i) => i.version),
    ].filter(Boolean);
    if (vers.length === 0) return '—';
    return [...new Set(vers)].sort(compareSemverDesc)[0];
  }, [wpInfo?.version, localItems, remoteItems, officialItems]);

  const defaultVersionLabel = useMemo(() => {
    const explicit = groupItems.find((i) => i.isDefault === true);
    if (explicit) return explicit.version === 'latest' ? (wpInfo?.version ?? 'latest') : explicit.version;
    if (officialItems.length > 1) return `${officialItems.length} WordPress.org pins`;
    if (officialItems.length === 1) {
      const v = officialItems[0].version;
      return v === 'latest' ? (wpInfo?.version ? `Latest (${wpInfo.version})` : 'Latest') : v;
    }
    return localItems[0]?.version ?? remoteItems[0]?.version ?? '—';
  }, [groupItems, officialItems, localItems, remoteItems, wpInfo?.version]);

  const projectHref = useMemo(() => {
    if (itemKind === 'plugin') {
      return wpInfo?.homepage ?? `https://wordpress.org/plugins/${encodeURIComponent(slug)}/`;
    }
    return `https://wordpress.org/themes/${encodeURIComponent(slug)}/`;
  }, [itemKind, slug, wpInfo?.homepage]);

  const familiesForSlug = useMemo(
    () => (itemKind ? filterFamiliesContainingSlug(families, slug) : []),
    [families, itemKind, slug],
  );

  const collectionsForSlug = useMemo(
    () => (itemKind ? filterCollectionsContainingSlug(collections, slug, itemKind) : []),
    [collections, itemKind, slug],
  );

  const sitesWithItem = useMemo(() => {
    if (!itemKind || !slug) return [];
    const connected = sites.filter((s) => s.status === 'connected');
    if (itemKind === 'plugin') {
      return connected
        .map((site) => {
          const plugins = parsePluginsMeta(site.pluginsMeta);
          const m = plugins.find((p) => pluginDirFromFile(p.plugin) === slug);
          return m ? { site, plugin: m } : null;
        })
        .filter(Boolean) as { site: Site; plugin: WordPressPlugin }[];
    }
    return connected
      .map((site) => {
        const themes = parseThemesMeta(site.themesMeta);
        const m = themes.find((t) => t.stylesheet.toLowerCase() === slug);
        return m ? { site, theme: m } : null;
      })
      .filter(Boolean) as { site: Site; theme: WordPressTheme }[];
  }, [sites, itemKind, slug]);

  const handleRemoveAll = async () => {
    if (groupItems.length === 0) return;
    const ok = window.confirm(
      `Remove "${displayName}" and all ${groupItems.length} version(s) from your library?`,
    );
    if (!ok) return;
    try {
      for (const item of groupItems) {
        await deleteMutation.mutateAsync(item.$id);
      }
      navigate(ROUTE_PATHS.LIBRARY);
    } catch {
      /* onError from hook */
    }
  };

  const handleDeleteVersion = (item: LibraryItem) => {
    const label = item.version || item.$id;
    if (!window.confirm(`Remove version "${label}" from the library?`)) return;
    deleteMutation.mutate(item.$id);
  };

  if (!itemKind || !slug) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Library item" subtitle="Library" />
        <Card className="mt-3">
          <CardBody className="text-center py-5">
            <p className="text-danger mb-2">Invalid item link.</p>
            <Link to={ROUTE_PATHS.LIBRARY} className="btn btn-primary btn-sm">
              Back to library
            </Link>
          </CardBody>
        </Card>
      </Container>
    );
  }

  if (itemsLoading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Library item" subtitle="Library" />
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading…</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (itemsError || groupItems.length === 0) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Library item" subtitle="Library" />
        <Card className="mt-3">
          <CardBody className="text-center py-5">
            <p className="text-danger mb-2">
              {itemsErr instanceof Error ? itemsErr.message : 'This item is not in your library.'}
            </p>
            <Link to={ROUTE_PATHS.LIBRARY} className="btn btn-primary btn-sm">
              Back to library
            </Link>
          </CardBody>
        </Card>
      </Container>
    );
  }

  const latestSidebar = wpLoading ? '…' : latestKnownVersion;

  return (
    <Container fluid>
      <PageBreadcrumb title={displayName} subtitle="Library" />

      <div className="mb-3">
        <Link to={ROUTE_PATHS.LIBRARY} className="btn btn-link p-0 text-decoration-none">
          ← Back to library
        </Link>
      </div>

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Row>
            <Col xl={9}>
              <Card className="mb-3 shadow-sm">
                <CardBody className="pb-0">
                  <Nav variant="underline" className="gap-3 flex-nowrap mb-0">
                    {TAB_KEYS.map((key, i) => {
                      const { label, Icon } = LIBRARY_ITEM_DETAIL_TAB_CONFIG[key];
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
                            <TabNavLabel Icon={Icon}>{label}</TabNavLabel>
                          </Nav.Link>
                        </Nav.Item>
                      );
                    })}
                  </Nav>
                </CardBody>
                <CardBody className="pt-4 pb-4">
                  {tab === 0 && (
                    <div>
                      <h6 className="text-muted text-uppercase fs-xs fw-semibold mb-2">About</h6>
                      <p className="mb-4">
                        {longDescription ? (
                          decodeHtmlEntities(longDescription)
                        ) : (
                          <span className="text-muted">No description yet.</span>
                        )}
                      </p>
                      <h6 className="text-muted text-uppercase fs-xs fw-semibold mb-2">Sources in library</h6>
                      <ul className="mb-0">
                        {officialItems.length > 0 && (
                          <li>
                            WordPress.org: {officialItems.length} pin
                            {officialItems.length === 1 ? '' : 's'}
                          </li>
                        )}
                        {localItems.length > 0 && (
                          <li>
                            Uploaded: {localItems.length} version
                            {localItems.length === 1 ? '' : 's'}
                          </li>
                        )}
                        {remoteItems.length > 0 && (
                          <li>
                            Remote URL: {remoteItems.length} version
                            {remoteItems.length === 1 ? '' : 's'}
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {tab === 1 && (
                    <div>
                      <p className="text-muted fs-sm mb-3">
                        Pinned, uploaded, and remote versions for this {itemKind}. Removing a row deletes that
                        version from the library (and storage when applicable).
                      </p>
                      <div className="table-responsive border rounded">
                        <Table hover size="sm" className="mb-0 align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Version</th>
                              <th>Source</th>
                              <th>Details</th>
                              <th>Default</th>
                              <th className="text-end">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupItems.map((item) => {
                              const versionShown =
                                item.source === 'official' && item.version === 'latest'
                                  ? wpInfo?.version ?? 'latest'
                                  : item.version;
                              const details =
                                item.source === 'remote'
                                  ? item.remoteUrl
                                    ? item.remoteUrl.length > 48
                                      ? `${item.remoteUrl.slice(0, 48)}…`
                                      : item.remoteUrl
                                    : '—'
                                  : item.source === 'local'
                                    ? item.s3Path
                                      ? 'Storage'
                                      : 'Local'
                                    : item.version === 'latest'
                                      ? 'Track latest from WordPress.org'
                                      : 'Pinned version';
                              return (
                                <tr key={item.$id}>
                                  <td className="fw-medium">{versionShown}</td>
                                  <td>
                                    <span
                                      className={`badge fs-xxs ${
                                        item.source === 'official'
                                          ? 'bg-primary'
                                          : item.source === 'local'
                                            ? 'bg-secondary'
                                            : 'bg-info'
                                      }`}
                                    >
                                      {sourceLabel(item.source)}
                                    </span>
                                  </td>
                                  <td className="text-muted small text-break">{details}</td>
                                  <td>{item.isDefault ? <span className="text-success fw-medium">Yes</span> : '—'}</td>
                                  <td className="text-end">
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      className="d-inline-flex align-items-center gap-1"
                                      disabled={deleteMutation.isPending}
                                      onClick={() => handleDeleteVersion(item)}
                                    >
                                      <TbTrash />
                                      Remove
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {tab === 2 && (
                    <div>
                      <p className="text-muted fs-sm mb-3">
                        Connected sites where this {itemKind} appears in the last bridge sync. Open a site to manage
                        installs and updates.
                      </p>
                      {sitesWithItem.length === 0 ? (
                        <p className="text-muted mb-0">Not reported on any connected site yet.</p>
                      ) : (
                        <div className="table-responsive border rounded">
                          <Table hover size="sm" className="mb-0 align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Site</th>
                                <th>Installed version</th>
                                {itemKind === 'plugin' ? <th>Status</th> : null}
                              </tr>
                            </thead>
                            <tbody>
                              {itemKind === 'plugin'
                                ? sitesWithItem.map(({ site, plugin }) => (
                                    <tr key={site.$id}>
                                      <td>
                                        <Link
                                          to={`${ROUTE_PATHS.siteDetailPath(site.$id)}?tab=plugins`}
                                          className="fw-medium text-decoration-none"
                                        >
                                          {site.siteName?.trim() || site.$id}
                                        </Link>
                                      </td>
                                      <td>{plugin.version || '—'}</td>
                                      <td>
                                        <span className="badge bg-secondary bg-opacity-10 text-secondary">
                                          {plugin.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                : sitesWithItem.map(({ site, theme }) => (
                                    <tr key={site.$id}>
                                      <td>
                                        <Link
                                          to={`${ROUTE_PATHS.siteDetailPath(site.$id)}?tab=themes`}
                                          className="fw-medium text-decoration-none"
                                        >
                                          {site.siteName?.trim() || site.$id}
                                        </Link>
                                      </td>
                                      <td>{theme.version || '—'}</td>
                                    </tr>
                                  ))}
                            </tbody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            </Col>

            <Col xl={3}>
              <LibraryItemDetailInfoCard
                displayName={displayName}
                itemKind={itemKind}
                descriptionShort={descriptionShort}
                defaultVersionLabel={defaultVersionLabel}
                latestKnownLabel={latestSidebar}
                authorLabel={displayAuthor || '—'}
                authorHref={authorHref}
                projectHref={projectHref}
                mergedTags={mergedTags}
                families={familiesForSlug}
                collections={collectionsForSlug}
                routeSlug={slug}
                removeDisabled={deleteMutation.isPending}
                onRemoveFromLibrary={() => void handleRemoveAll()}
              />
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default LibraryItemDetailPage;
