import { DocHelpButton } from '@/components/docs/DocHelpButton';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { ContactSupportButton } from '@/components/support/ContactSupportButton';
import { TabNavLabel } from '@/components/TabNavLabel';
import { ROUTE_PATHS } from '@/config/routePaths';
import {
  decodeHtmlEntities,
  filterLibraryItemsBySlugAndType,
  planLibraryBridgeInstall,
  runLibraryBridgeInstallOnSite,
} from '@/domains/library';
import { parsePluginsMeta, parseThemesMeta } from '@/domains/sites/installedMeta';
import { useFetchSiteMetaIfNeeded, useSites } from '@/domains/sites';
import { useDeleteLibraryItem, useLibraryItems, useSetLibraryDefaultVersion } from '@/hooks/useLibrary';
import { useLibraryCategories } from '@/hooks/useLibraryCategories';
import { useLibraryCollections, useLibraryFamilies } from '@/hooks/useLibraryFamiliesAndCollections';
import { useAuth } from '@/domains/auth';
import { useNotificationContext } from '@/context/useNotificationContext';
import { getWpPluginInfo, getWpThemeInfo } from '@/services/wordpress';
import type { LibraryItem, LibraryItemSource, Site, WordPressPlugin, WordPressTheme } from '@/types';
import LibraryItemDetailInfoCard from '@/views/library/detail/LibraryItemDetailInfoCard';
import LibraryItemDetailOrganization from '@/views/library/detail/LibraryItemDetailOrganization';
import { LIBRARY_ITEM_DETAIL_TAB_CONFIG } from '@/views/library/detail/libraryItemDetailNavTabs';
import AddRemoteUrlModal from '@/views/library/modals/AddRemoteUrlModal';
import PinWordPressOrgVersionsModal from '@/views/library/modals/PinWordPressOrgVersionsModal';
import UploadLibraryModal from '@/views/library/modals/UploadLibraryModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  Modal,
  Nav,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { TbBrandWordpress, TbCloudUpload, TbLink, TbTrash, TbUpload } from 'react-icons/tb';

const TAB_KEYS = ['overview', 'sites'] as const;
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
  const [pinWpOpen, setPinWpOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [installOnSiteOpen, setInstallOnSiteOpen] = useState(false);
  const [installPickerItem, setInstallPickerItem] = useState<LibraryItem | null>(null);
  const [installVersionItemId, setInstallVersionItemId] = useState('');
  const [installSiteIds, setInstallSiteIds] = useState<Set<string>>(() => new Set());
  const [installBridgeRunning, setInstallBridgeRunning] = useState(false);

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showNotification } = useNotificationContext();

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
  const { data: categories = [] } = useLibraryCategories();
  const deleteMutation = useDeleteLibraryItem();
  const setLibraryDefaultVersionMutation = useSetLibraryDefaultVersion();

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

  const { data: wpThemeInfo, isLoading: wpThemeLoading } = useQuery({
    queryKey: ['wpThemeInfo', slug],
    queryFn: () => getWpThemeInfo(slug),
    enabled: itemKind === 'theme' && slug.length > 0,
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

  const descriptionShort = useMemo(() => {
    const fromWp = wpInfo?.description ? stripHtml(wpInfo.description) : '';
    let best = '';
    for (const i of groupItems) {
      const t = stripHtml(i.description ?? '');
      if (t.length > best.length) best = t;
    }
    const long = best.length >= fromWp.length ? best : fromWp;
    const t = long.slice(0, 220);
    return long.length > 220 ? `${t}…` : t;
  }, [groupItems, wpInfo?.description]);

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

  const wordpressOrgHref = useMemo(() => {
    if (itemKind === 'plugin') {
      return `https://wordpress.org/plugins/${encodeURIComponent(slug)}/`;
    }
    return `https://wordpress.org/themes/${encodeURIComponent(slug)}/`;
  }, [itemKind, slug]);

  const pluginWebsiteHref = useMemo(() => {
    const h = wpInfo?.homepage?.trim();
    return h && h.length > 0 ? h : undefined;
  }, [wpInfo?.homepage]);

  const uniqueLibraryDocumentIds = useMemo(
    () => [...new Set(groupItems.map((i) => i.libraryDocumentId).filter(Boolean))] as string[],
    [groupItems],
  );
  const primaryLibraryDocumentId = uniqueLibraryDocumentIds[0] ?? '';
  const duplicateLibraryDocuments = uniqueLibraryDocumentIds.length > 1;
  const primaryLibraryRow = useMemo(
    () =>
      groupItems.find((i) => i.libraryDocumentId === primaryLibraryDocumentId) ?? groupItems[0] ?? null,
    [groupItems, primaryLibraryDocumentId],
  );
  const documentTagsForEdit = primaryLibraryRow?.tags ?? [];
  const documentCategoryIds = useMemo(() => {
    const row = primaryLibraryRow;
    if (!row) return [];
    const ids = row.categoryIds;
    if (ids && ids.length > 0) return [...ids];
    if (row.categoryId) return [row.categoryId];
    return [];
  }, [primaryLibraryRow]);

  const existingOfficialVersionKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const it of groupItems) {
      if (it.source === 'official' && it.version) keys.add(String(it.version));
    }
    return [...keys];
  }, [groupItems]);

  const sitesWithPlugin = useMemo(() => {
    if (itemKind !== 'plugin' || !slug) return [];
    const connected = sites.filter((s) => s.status === 'connected');
    return connected
      .map((site) => {
        const plugins = parsePluginsMeta(site.pluginsMeta);
        const m = plugins.find((p) => pluginDirFromFile(p.plugin) === slug);
        return m ? { site, plugin: m } : null;
      })
      .filter(Boolean) as { site: Site; plugin: WordPressPlugin }[];
  }, [sites, itemKind, slug]);

  const sitesWithTheme = useMemo(() => {
    if (itemKind !== 'theme' || !slug) return [];
    const connected = sites.filter((s) => s.status === 'connected');
    return connected
      .map((site) => {
        const themes = parseThemesMeta(site.themesMeta);
        const m = themes.find((t) => t.stylesheet.toLowerCase() === slug);
        return m ? { site, theme: m } : null;
      })
      .filter(Boolean) as { site: Site; theme: WordPressTheme }[];
  }, [sites, itemKind, slug]);

  const connectedSitesForInstall = useMemo(
    () => (sites ?? []).filter((s) => s.status === 'connected' && s.enabled !== false),
    [sites],
  );

  const installTargetItem = useMemo(() => {
    if (!installVersionItemId && !installPickerItem) return null;
    return (
      groupItems.find((i) => i.$id === installVersionItemId) ?? installPickerItem ?? null
    );
  }, [installVersionItemId, groupItems, installPickerItem]);

  const installTargetVersionLabel = useMemo(() => {
    const it = installTargetItem;
    if (!it || !itemKind) return '—';
    if (it.source === 'official' && it.version === 'latest' && itemKind === 'plugin') {
      return wpInfo?.version ?? 'latest';
    }
    if (it.source === 'official' && it.version === 'latest' && itemKind === 'theme') {
      return wpThemeInfo?.version ?? 'latest';
    }
    return it.version || '—';
  }, [installTargetItem, itemKind, wpInfo?.version, wpThemeInfo?.version]);

  const bridgeInstallPlan = useMemo(() => {
    if (!installTargetItem || !itemKind) {
      return { kind: 'unsupported' as const, message: '' };
    }
    return planLibraryBridgeInstall(installTargetItem, itemKind, slug, wpInfo, wpThemeInfo);
  }, [installTargetItem, itemKind, slug, wpInfo, wpThemeInfo]);

  const bridgeInstallWaitingForWp = useMemo(() => {
    const t = installTargetItem;
    if (!t || !itemKind) return false;
    if (itemKind === 'plugin' && t.source === 'official' && t.version === 'latest') return wpLoading;
    if (itemKind === 'theme' && t.source === 'official' && t.version === 'latest') return wpThemeLoading;
    return false;
  }, [installTargetItem, itemKind, wpLoading, wpThemeLoading]);

  const closeInstallOnSiteModal = () => {
    if (installBridgeRunning) return;
    setInstallOnSiteOpen(false);
    setInstallPickerItem(null);
    setInstallVersionItemId('');
    setInstallSiteIds(new Set());
    setInstallBridgeRunning(false);
  };

  const toggleInstallSite = (siteId: string) => {
    setInstallSiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  };

  const selectAllInstallSites = () => {
    setInstallSiteIds(new Set(connectedSitesForInstall.map((s) => s.$id)));
  };

  const clearInstallSiteSelection = () => {
    setInstallSiteIds(new Set());
  };

  const installOnSelectedSitesViaBridge = async () => {
    if (installSiteIds.size === 0) return;
    const target =
      groupItems.find((i) => i.$id === installVersionItemId) ?? installPickerItem ?? null;
    if (!target || !itemKind) return;

    const plan = planLibraryBridgeInstall(target, itemKind, slug, wpInfo, wpThemeInfo);
    if (plan.kind === 'unsupported') {
      showNotification({
        title: 'Cannot install from Hub',
        message: plan.message,
        variant: 'warning',
      });
      return;
    }

    const docId = target.libraryDocumentId;
    const vKey = target.versionKey ?? target.version;
    if (docId && vKey && target.isDefault !== true) {
      try {
        await setLibraryDefaultVersionMutation.mutateAsync({
          libraryDocumentId: docId,
          versionKey: vKey,
          silent: true,
        });
      } catch {
        return;
      }
    }

    setInstallBridgeRunning(true);
    const siteList = [...installSiteIds];
    const lines: string[] = [];
    let okCount = 0;

    try {
      for (const siteId of siteList) {
        const site = connectedSitesForInstall.find((s) => s.$id === siteId);
        const label = site?.siteName?.trim() || siteId;
        const result = await runLibraryBridgeInstallOnSite(siteId, plan);
        if (result.ok) {
          okCount += 1;
          lines.push(`${label}: installed`);
        } else {
          lines.push(`${label}: ${result.message}`);
        }
      }

      if (okCount === siteList.length) {
        showNotification({
          title: 'Install complete',
          message:
            siteList.length === 1
              ? lines[0] ?? 'The bridge finished installing on the site.'
              : `Installed on ${okCount} site(s).`,
          variant: 'success',
        });
      } else if (okCount > 0) {
        showNotification({
          title: 'Install finished with errors',
          message: lines.join('\n'),
          variant: 'warning',
        });
      } else {
        showNotification({
          title: 'Install failed',
          message: lines.join('\n'),
          variant: 'danger',
        });
      }

      if (okCount > 0 && user?.$id) {
        void queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
        for (const sid of siteList) {
          void queryClient.invalidateQueries({ queryKey: ['site', sid] });
        }
      }
    } finally {
      setInstallBridgeRunning(false);
    }

    closeInstallOnSiteModal();
  };

  const allInstallSitesSelected =
    connectedSitesForInstall.length > 0 && installSiteIds.size === connectedSitesForInstall.length;

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
        <PageBreadcrumb title="Library item" subtitle="Library" titleEnd={<DocHelpButton contextKey="library:item" />} />
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
        <PageBreadcrumb title="Library item" subtitle="Library" titleEnd={<DocHelpButton contextKey="library:item" />} />
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
        <PageBreadcrumb title="Library item" subtitle="Library" titleEnd={<DocHelpButton contextKey="library:item" />} />
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

  const latestReleaseLabel = wpLoading ? '…' : latestKnownVersion;

  return (
    <Container fluid>
      <PageBreadcrumb title={displayName} subtitle="Library" titleEnd={<DocHelpButton contextKey="library:item" />} />

      <div className="mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <Link to={ROUTE_PATHS.LIBRARY} className="btn btn-link p-0 text-decoration-none">
          ← Back to library
        </Link>
        {itemKind && slug ? (
          <ContactSupportButton
            category="library"
            context={{
              libraryItemKind: itemKind,
              libraryItemSlug: slug,
              sourceLabel: `Library: ${displayName}`,
            }}
          />
        ) : null}
      </div>

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Row>
            <Col xl={9}>
              <Card className="mb-3 shadow-sm">
                <CardBody className="pb-0 border-bottom border-light">
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <Nav variant="underline" className="gap-3 flex-nowrap mb-0 flex-grow-1 min-w-0">
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
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="d-inline-flex align-items-center justify-content-center flex-shrink-0 rounded-circle p-2"
                      style={{ width: '2.25rem', height: '2.25rem' }}
                      disabled={deleteMutation.isPending}
                      onClick={() => void handleRemoveAll()}
                      aria-label="Remove from library"
                      title="Remove from library"
                    >
                      <TbTrash className="fs-lg" />
                    </Button>
                  </div>
                </CardBody>
                <CardBody className="pt-4 pb-4">
                  {tab === 0 && (
                    <div>
                      <h6 className="text-muted text-uppercase fs-xs fw-semibold mb-2">Versions</h6>
                      <p className="text-muted fs-sm mb-3">
                        Pinned, uploaded, and remote versions for this {itemKind}. Removing a row deletes that
                        version from the library (and storage when applicable).
                      </p>
                      <Row className="g-3 mb-4">
                        <Col md={4}>
                          <Card className="h-100 border shadow-none bg-light bg-opacity-50">
                            <CardBody className="d-flex flex-column">
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <span className="avatar-xs bg-primary bg-opacity-10 text-primary rounded d-inline-flex align-items-center justify-content-center">
                                  <TbBrandWordpress className="fs-4" aria-hidden />
                                </span>
                                <h6 className="fw-semibold mb-0">Pin WordPress.org versions</h6>
                              </div>
                              <p className="text-muted small flex-grow-1 mb-3">
                                Choose official release numbers from the WordPress.org directory and pin them to this
                                library item.
                              </p>
                              <Button variant="primary" size="sm" className="align-self-start" onClick={() => setPinWpOpen(true)}>
                                Choose versions
                              </Button>
                            </CardBody>
                          </Card>
                        </Col>
                        <Col md={4}>
                          <Card className="h-100 border shadow-none bg-light bg-opacity-50">
                            <CardBody className="d-flex flex-column">
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <span className="avatar-xs bg-secondary bg-opacity-10 text-secondary rounded d-inline-flex align-items-center justify-content-center">
                                  <TbUpload className="fs-4" aria-hidden />
                                </span>
                                <h6 className="fw-semibold mb-0">Upload to WPHub.Pro</h6>
                              </div>
                              <p className="text-muted small flex-grow-1 mb-3">
                                Upload a ZIP from your computer and attach it to this {itemKind} slug as a local
                                version.
                              </p>
                              <Button variant="outline-primary" size="sm" className="align-self-start" onClick={() => setUploadOpen(true)}>
                                Upload ZIP
                              </Button>
                            </CardBody>
                          </Card>
                        </Col>
                        <Col md={4}>
                          <Card className="h-100 border shadow-none bg-light bg-opacity-50">
                            <CardBody className="d-flex flex-column">
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <span className="avatar-xs bg-info bg-opacity-10 text-info rounded d-inline-flex align-items-center justify-content-center">
                                  <TbLink className="fs-4" aria-hidden />
                                </span>
                                <h6 className="fw-semibold mb-0">Add from remote storage</h6>
                              </div>
                              <p className="text-muted small flex-grow-1 mb-3">
                                Point to a ZIP URL (your CDN or storage). That build can be installed on sites from the
                                library.
                              </p>
                              <Button variant="outline-secondary" size="sm" className="align-self-start" onClick={() => setRemoteOpen(true)}>
                                Add remote URL
                              </Button>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                      <div className="table-responsive border rounded mb-4">
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
                                  ? itemKind === 'theme'
                                    ? wpThemeInfo?.version ?? 'latest'
                                    : wpInfo?.version ?? 'latest'
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
                                    <div className="d-inline-flex flex-wrap align-items-center justify-content-end gap-2">
                                      <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        className="d-inline-flex align-items-center gap-1"
                                        onClick={() => {
                                          setInstallPickerItem(item);
                                          setInstallVersionItemId(item.$id);
                                          setInstallSiteIds(new Set());
                                          setInstallOnSiteOpen(true);
                                        }}
                                      >
                                        <TbCloudUpload />
                                        Install on site
                                      </Button>
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
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>

                      {itemKind && primaryLibraryDocumentId ? (
                        <LibraryItemDetailOrganization
                          itemKind={itemKind}
                          slug={slug}
                          displayName={displayName}
                          libraryDocumentId={primaryLibraryDocumentId}
                          categoryIds={documentCategoryIds}
                          tags={documentTagsForEdit}
                          categories={categories}
                          collections={collections}
                          families={families}
                          duplicateLibraryDocuments={duplicateLibraryDocuments}
                        />
                      ) : null}
                    </div>
                  )}

                  {tab === 1 && (
                    <div>
                      <p className="text-muted fs-sm mb-3">
                        Connected sites where this {itemKind} appears in the last bridge sync. Open a site to manage
                        installs and updates.
                      </p>
                      {itemKind === 'plugin' ? (
                        sitesWithPlugin.length === 0 ? (
                          <p className="text-muted mb-0">Not reported on any connected site yet.</p>
                        ) : (
                          <div className="table-responsive border rounded">
                            <Table hover size="sm" className="mb-0 align-middle">
                              <thead className="table-light">
                                <tr>
                                  <th>Site</th>
                                  <th>Installed version</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sitesWithPlugin.map(({ site, plugin }) => (
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
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        )
                      ) : sitesWithTheme.length === 0 ? (
                        <p className="text-muted mb-0">Not reported on any connected site yet.</p>
                      ) : (
                        <div className="table-responsive border rounded">
                          <Table hover size="sm" className="mb-0 align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Site</th>
                                <th>Installed version</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sitesWithTheme.map(({ site, theme }) => (
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
                latestReleaseLabel={latestReleaseLabel}
                defaultVersionLabel={defaultVersionLabel}
                authorLabel={displayAuthor || '—'}
                authorHref={authorHref}
                wordpressOrgHref={wordpressOrgHref}
                websiteHref={pluginWebsiteHref}
              />
            </Col>
          </Row>
        </Col>
      </Row>

      <Modal
        show={installOnSiteOpen}
        onHide={closeInstallOnSiteModal}
        centered
        scrollable
        size="lg"
        backdrop={installBridgeRunning ? 'static' : true}
        keyboard={!installBridgeRunning}
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-lg">Install on site</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-3">
            Choose one or more connected sites. The Hub calls the WPHub Pro bridge on each site (via wp-proxy) to
            install the selected library version.
          </p>
          <Form.Group className="mb-3" controlId="install-default-version">
            <Form.Label className="small fw-semibold">Default install version</Form.Label>
            <Form.Select
              size="sm"
              value={installVersionItemId}
              onChange={(e) => setInstallVersionItemId(e.target.value)}
              aria-label="Select library version for install"
            >
              {groupItems.map((item) => {
                const versionShown =
                  item.source === 'official' && item.version === 'latest'
                    ? itemKind === 'theme'
                      ? wpThemeInfo?.version ?? 'latest'
                      : wpInfo?.version ?? 'latest'
                    : item.version;
                return (
                  <option key={item.$id} value={item.$id}>
                    {versionShown} · {sourceLabel(item.source)}
                    {item.isDefault ? ' (current default)' : ''}
                  </option>
                );
              })}
            </Form.Select>
            <Form.Text className="d-block mt-1">
              If this row is not already your library default, we update the default before installing so the bridge
              matches your choice.
            </Form.Text>
          </Form.Group>
          {installTargetItem ? (
            <p className="small mb-3 text-muted">
              Selected: <span className="fw-medium text-body">{installTargetVersionLabel}</span>
            </p>
          ) : null}
          {bridgeInstallWaitingForWp ? (
            <Alert variant="light" className="small mb-3 py-2">
              Loading WordPress.org version information…
            </Alert>
          ) : null}
          {!bridgeInstallWaitingForWp && bridgeInstallPlan.kind === 'unsupported' && bridgeInstallPlan.message ? (
            <Alert variant="warning" className="small mb-3 py-2">
              {bridgeInstallPlan.message}
            </Alert>
          ) : null}
          {!bridgeInstallWaitingForWp && bridgeInstallPlan.kind !== 'unsupported' ? (
            <Alert variant="info" className="small mb-3 py-2">
              {bridgeInstallPlan.kind === 'plugin-install-version'
                ? `Will install plugin ${bridgeInstallPlan.slug} at version ${bridgeInstallPlan.version} from WordPress.org.`
                : 'Will install the theme from the resolved ZIP package on each selected site.'}
            </Alert>
          ) : null}
          {connectedSitesForInstall.length === 0 ? (
            <p className="text-muted small mb-0">
              No connected sites.{' '}
              <Link to={ROUTE_PATHS.SITES} onClick={closeInstallOnSiteModal}>
                Go to Sites
              </Link>{' '}
              to add one.
            </p>
          ) : (
            <>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <Button variant="outline-secondary" size="sm" type="button" onClick={selectAllInstallSites}>
                  Select all
                </Button>
                <Button variant="outline-secondary" size="sm" type="button" onClick={clearInstallSiteSelection}>
                  Clear
                </Button>
                <span className="text-muted small ms-auto">
                  {installSiteIds.size} of {connectedSitesForInstall.length} selected
                </span>
              </div>
              <div className="border rounded overflow-hidden" style={{ maxHeight: 'min(22rem, 55vh)' }}>
                <Table responsive hover size="sm" className="mb-0 align-middle">
                  <thead className="table-light position-sticky top-0">
                    <tr>
                      <th style={{ width: '2.5rem' }} className="text-center">
                        <Form.Check
                          type="checkbox"
                          aria-label="Select all sites"
                          checked={allInstallSitesSelected}
                          onChange={(e) => {
                            if (e.target.checked) selectAllInstallSites();
                            else clearInstallSiteSelection();
                          }}
                        />
                      </th>
                      <th>Site</th>
                      <th className="d-none d-md-table-cell">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connectedSitesForInstall.map((site) => (
                      <tr key={site.$id} className={installSiteIds.has(site.$id) ? 'table-active' : undefined}>
                        <td className="text-center">
                          <Form.Check
                            type="checkbox"
                            aria-label={`Select ${site.siteName?.trim() || site.$id}`}
                            checked={installSiteIds.has(site.$id)}
                            onChange={() => toggleInstallSite(site.$id)}
                          />
                        </td>
                        <td>
                          <div className="fw-medium">{site.siteName?.trim() || site.$id}</div>
                          <div className="small text-muted text-break d-md-none">{site.siteUrl}</div>
                        </td>
                        <td className="small text-muted text-break d-none d-md-table-cell">{site.siteUrl}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="gap-2">
          <Button variant="light" size="sm" onClick={closeInstallOnSiteModal} disabled={installBridgeRunning}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={
              installSiteIds.size === 0 ||
              connectedSitesForInstall.length === 0 ||
              setLibraryDefaultVersionMutation.isPending ||
              installBridgeRunning ||
              bridgeInstallWaitingForWp ||
              bridgeInstallPlan.kind === 'unsupported'
            }
            onClick={() => void installOnSelectedSitesViaBridge()}
          >
            {setLibraryDefaultVersionMutation.isPending ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Updating default…
              </>
            ) : installBridgeRunning ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Installing…
              </>
            ) : (
              <>
                Install on selected {installSiteIds.size === 1 ? 'site' : 'sites'}
                {installSiteIds.size > 0 ? ` (${installSiteIds.size})` : ''}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <PinWordPressOrgVersionsModal
        show={pinWpOpen}
        onHide={() => setPinWpOpen(false)}
        itemKind={itemKind}
        slug={slug}
        displayName={displayName}
        wpPluginInfo={wpInfo}
        wpPluginInfoLoading={wpLoading}
        existingOfficialVersionKeys={existingOfficialVersionKeys}
      />
      <UploadLibraryModal
        show={uploadOpen}
        onHide={() => setUploadOpen(false)}
        initialType={itemKind === 'theme' ? 'theme' : 'plugin'}
        prefillPluginSlug={slug}
      />
      <AddRemoteUrlModal
        show={remoteOpen}
        onHide={() => setRemoteOpen(false)}
        existingPluginSlug={slug}
        existingPluginName={displayName}
      />
    </Container>
  );
};

export default LibraryItemDetailPage;
