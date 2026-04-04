/**
 * Library page — left: tabs + tables; right: gradient filters + bulk actions.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';

import Footer from 'examples/Footer';
import TabNavList, { TabNavPanel } from 'components/ui/TabNavList';
import ScrollableTableWrapper from 'components/ScrollableTableWrapper';
import DataTableHeadCell from 'examples/Tables/DataTable/DataTableHeadCell';
import DataTableBodyCell from 'examples/Tables/DataTable/DataTableBodyCell';

import { useLibraryItems, useDeleteLibraryItem, useMergeLibraryPluginItems } from '../hooks/useLibrary';
import { useLibraryCollections, useLibraryFamilies } from '../hooks/useLibraryFamiliesAndCollections';
import { useSubscription, useUsage } from '../domains/billing';
import { usePageBreadcrumb } from '../contexts/PageBreadcrumbContext';
import { LibraryItem, LibraryItemType, LibraryItemSource } from '../types';
import AddFromWordPressModal from '../components/library/AddFromWordPressModal';
import UploadLibraryModal from '../components/library/UploadLibraryModal';
import AddRemoteUrlModal from '../components/library/AddRemoteUrlModal';
import AddLibrarySourceModal, { AddLibrarySourcePayload } from '../components/library/AddLibrarySourceModal';
import LibraryPluginDetailView from '../components/library/LibraryPluginDetailView';
import LibraryFamiliesPanel from '../components/library/LibraryFamiliesPanel';
import LibraryCollectionsPanel from '../components/library/LibraryCollectionsPanel';
import LibraryPageFiltersPanel from '../components/library/LibraryPageFiltersPanel';
import LibraryBulkInstallModal, { BulkInstallEntry } from '../components/library/LibraryBulkInstallModal';
import LibraryBulkUpdateModal, { LibraryBulkUpdatePluginRow } from '../components/library/LibraryBulkUpdateModal';
import { ORANGE_ACTION_GRADIENT, iconButtonOnLightSurfaceSx } from '../theme/detailPageStyles';
import {
  libraryContentPaperSx,
  libraryListMainPaperSx,
  libraryListMainTabsSx,
  libraryListPageGridSx,
  libraryListSidebarSx,
} from '../theme/libraryLayout';
import { contentPageShellFlexSx } from '../theme/contentPaper';
import { ROUTE_PATHS } from '../config/routePaths';
import {
  getPluginGroups,
  getPluginSlug,
  getItemsForGrouping,
  getThemeGroupKey,
  pluginDefaultIsBehindWpOrg,
  getLibraryItemSlug,
  buildMembershipDeleteWarningLines,
  isLastLibraryRowForSlugAndType,
  willDeleteRemoveLastSlugTypeRow,
} from '../domains/library';
import { useLibraryWpDefaultSync } from '../hooks/useLibraryWpDefaultSync';

const LIBRARY_MAIN_TABS = [
  { value: 0, label: 'Library Items', icon: 'inventory_2' },
  { value: 1, label: 'Item Families', icon: 'groups' },
  { value: 2, label: 'Collections', icon: 'folder' },
];

const LIBRARY_ORANGE = '#ea580c';

const LIBRARY_PAPER_HEADERS: Record<number, { title: string; subtitle: string }> = {
  0: { title: 'Library items', subtitle: 'Plugins, themes, and sources.' },
  1: { title: 'Item families', subtitle: 'Group related slugs for installs.' },
  2: { title: 'Collections', subtitle: 'Bundles for batch install on sites.' },
};

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  const el = document.createElement('div');
  el.innerHTML = text;
  return el.textContent || el.innerText || text;
}

function collectAllItemTags(pluginGroups: { items: LibraryItem[] }[], themeItems: LibraryItem[]): string[] {
  const s = new Set<string>();
  pluginGroups.forEach((g) =>
    g.items.forEach((i) =>
      (i.tags ?? []).forEach((t) => {
        const x = String(t).trim();
        if (x) s.add(x);
      }),
    ),
  );
  themeItems.forEach((i) =>
    (i.tags ?? []).forEach((t) => {
      const x = String(t).trim();
      if (x) s.add(x);
    }),
  );
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

function tagsForGroup(group: { items: LibraryItem[] }): string[] {
  const s = new Set<string>();
  group.items.forEach((i) =>
    (i.tags ?? []).forEach((t) => {
      const x = String(t).trim();
      if (x) s.add(x);
    }),
  );
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

function tagsForThemeItem(item: LibraryItem): string[] {
  return (item.tags ?? [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function groupMatchesSelectedSources(items: LibraryItem[], selected: LibraryItemSource[]): boolean {
  if (selected.length === 0) return true;
  const sources = new Set(items.map((i) => i.source));
  return selected.some((s) => sources.has(s));
}

type UnifiedRow =
  | { rowKind: 'plugin'; group: { slug: string; displayName: string; items: LibraryItem[] } }
  | { rowKind: 'theme'; item: LibraryItem };

type SortKey = 'name' | 'type' | 'tags' | 'version' | 'author';

function getUnifiedSortValue(row: UnifiedRow, key: SortKey): string {
  if (row.rowKind === 'plugin') {
    const g = row.group;
    const first = g.items[0];
    switch (key) {
      case 'name':
        return decodeHtmlEntities(g.displayName);
      case 'type':
        return 'plugin';
      case 'tags':
        return tagsForGroup(g).join(', ');
      case 'version':
        return g.items.length > 1 ? `${g.items.length} versions` : `${first.version ?? ''}`;
      case 'author':
        return first.author || '';
      default:
        return '';
    }
  }
  const item = row.item;
  switch (key) {
    case 'name':
      return decodeHtmlEntities(item.name);
    case 'type':
      return 'theme';
    case 'tags':
      return tagsForThemeItem(item).join(', ');
    case 'version':
      return item.version ?? '';
    case 'author':
      return item.author || '';
    default:
      return '';
  }
}

function compareUnifiedRows(a: UnifiedRow, b: UnifiedRow, key: SortKey, dir: 'asc' | 'desc'): number {
  const va = getUnifiedSortValue(a, key);
  const vb = getUnifiedSortValue(b, key);
  const c = va.localeCompare(vb, undefined, { sensitivity: 'base' });
  return dir === 'asc' ? c : -c;
}

const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [addSourceModalOpen, setAddSourceModalOpen] = useState(false);
  const [addWpModalOpen, setAddWpModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [addRemoteModalOpen, setAddRemoteModalOpen] = useState(false);
  const [addRemoteInitialPluginName, setAddRemoteInitialPluginName] = useState<string | undefined>(undefined);
  const [prefillPluginContext, setPrefillPluginContext] = useState<{ slug: string; name: string } | null>(null);
  const [mainTab, setMainTab] = useState(0);
  const [selectedPluginSlug, setSelectedPluginSlug] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [includePlugins, setIncludePlugins] = useState(true);
  const [includeThemes, setIncludeThemes] = useState(true);
  const [selectedSources, setSelectedSources] = useState<LibraryItemSource[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkInstallOpen, setBulkInstallOpen] = useState(false);
  const [bulkInstallEntries, setBulkInstallEntries] = useState<BulkInstallEntry[]>([]);
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [bulkUpdatePlugins, setBulkUpdatePlugins] = useState<LibraryBulkUpdatePluginRow[]>([]);

  const [searchParams, setSearchParams] = useSearchParams();

  const tagFromUrl = searchParams.get('tag');
  useEffect(() => {
    if (tagFromUrl) {
      setTagFilter(tagFromUrl);
      setTagInput('');
    }
  }, [tagFromUrl]);

  const clearPrefillPluginContext = () => setPrefillPluginContext(null);

  const handleAddSourceChoice = (payload: AddLibrarySourcePayload) => {
    if (payload.mode === 'direct') {
      clearPrefillPluginContext();
      if (payload.source === 'wordpress.org') setAddWpModalOpen(true);
      else if (payload.source === 'library_upload') setUploadModalOpen(true);
      else if (payload.source === 'remote_url') {
        setAddRemoteInitialPluginName(undefined);
        setAddRemoteModalOpen(true);
      }
    } else {
      const { pluginName, pluginSlug, source } = payload;
      setPrefillPluginContext({ slug: pluginSlug, name: pluginName });
      if (source === 'wordpress.org') setAddWpModalOpen(true);
      else if (source === 'library_upload') setUploadModalOpen(true);
      else if (source === 'remote_url') {
        setAddRemoteInitialPluginName(pluginName);
        setAddRemoteModalOpen(true);
      }
    }
  };

  const { setBreadcrumbTitle, setBreadcrumbConfig } = usePageBreadcrumb();
  const { data: libraryItems = [], isLoading, isError, error } = useLibraryItems();

  const { data: families = [] } = useLibraryFamilies();
  const { data: collections = [] } = useLibraryCollections();
  const deleteMutation = useDeleteLibraryItem();
  const mergeMutation = useMergeLibraryPluginItems();
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsage();

  useEffect(() => {
    const plugin = searchParams.get('plugin');
    const tab = searchParams.get('tab');
    const collection = searchParams.get('collection');
    if (tab === '0' || tab === '1' || tab === '2') {
      setMainTab(Number(tab));
    }
    if (collection) {
      setMainTab(2);
    }
    if (plugin) {
      setSelectedPluginSlug(plugin);
      setMainTab(0);
    }
    if (plugin || tab === '0' || tab === '1' || tab === '2' || collection) {
      const next = new URLSearchParams(searchParams);
      next.delete('plugin');
      next.delete('tab');
      next.delete('collection');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const themeFocus = searchParams.get('themeFocus');
    if (!themeFocus || libraryItems.length === 0) return;
    const item = libraryItems.find((i) => i.$id === themeFocus);
    const next = new URLSearchParams(searchParams);
    next.delete('themeFocus');
    if (!item) {
      setSearchParams(next, { replace: true });
      return;
    }
    setSelectedPluginSlug(null);
    setMainTab(0);
    setIncludePlugins(false);
    setIncludeThemes(true);
    setListSearch(decodeHtmlEntities(item.name));
    setSearchParams(next, { replace: true });
  }, [searchParams, libraryItems, setSearchParams]);

  const libraryLimit = subscription?.libraryLimit ?? 5;
  const libraryUsed = usage?.libraryUsed ?? libraryItems.length;

  const pluginItems = libraryItems.filter((i) => i.type === LibraryItemType.Plugin);
  const pluginGroups = useMemo(() => getPluginGroups(pluginItems), [pluginItems]);
  const { wpBySlug } = useLibraryWpDefaultSync(pluginGroups);
  const themeItems = libraryItems.filter((i) => i.type === LibraryItemType.Theme);

  const allItemTags = useMemo(() => collectAllItemTags(pluginGroups, themeItems), [pluginGroups, themeItems]);

  const filteredPluginGroups = useMemo(() => {
    let groups = [...pluginGroups];
    const q = listSearch.trim().toLowerCase();
    if (q) {
      groups = groups.filter((g) => {
        const name = decodeHtmlEntities(g.displayName).toLowerCase();
        const slug = g.slug.toLowerCase();
        const tagHit = tagsForGroup(g).some((t) => t.toLowerCase().includes(q));
        return name.includes(q) || slug.includes(q) || tagHit;
      });
    }
    if (tagFilter) {
      groups = groups.filter((g) =>
        g.items.some((i) => (i.tags ?? []).some((t) => String(t).trim() === tagFilter)),
      );
    }
    groups = groups.filter((g) => groupMatchesSelectedSources(g.items, selectedSources));
    return groups;
  }, [pluginGroups, listSearch, tagFilter, selectedSources]);

  const filteredThemeItems = useMemo(() => {
    let list = [...themeItems];
    const q = listSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        const name = decodeHtmlEntities(item.name).toLowerCase();
        const slug = getThemeGroupKey(item).toLowerCase();
        const tagHit = tagsForThemeItem(item).some((t) => t.toLowerCase().includes(q));
        return name.includes(q) || slug.includes(q) || tagHit;
      });
    }
    if (tagFilter) {
      list = list.filter((i) => (i.tags ?? []).some((t) => String(t).trim() === tagFilter));
    }
    list = list.filter((i) => groupMatchesSelectedSources(getItemsForGrouping(i, libraryItems), selectedSources));
    return list;
  }, [themeItems, libraryItems, listSearch, tagFilter, selectedSources]);

  const unifiedRows: UnifiedRow[] = useMemo(() => {
    const rows: UnifiedRow[] = [];
    if (includePlugins) {
      filteredPluginGroups.forEach((group) => rows.push({ rowKind: 'plugin', group }));
    }
    if (includeThemes) {
      filteredThemeItems.forEach((item) => rows.push({ rowKind: 'theme', item }));
    }
    return [...rows].sort((a, b) => compareUnifiedRows(a, b, sortKey, sortDir));
  }, [filteredPluginGroups, filteredThemeItems, includePlugins, includeThemes, sortKey, sortDir]);

  const visibleKeys = useMemo(
    () =>
      unifiedRows.map((r) =>
        r.rowKind === 'plugin' ? `plugin:${r.group.slug}` : `theme:${r.item.$id}`,
      ),
    [unifiedRows],
  );

  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((k) => selectedKeys.has(k));
  const someVisibleSelected = visibleKeys.some((k) => selectedKeys.has(k));

  const toggleSelectAll = () => {
    setSelectedKeys((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        visibleKeys.forEach((k) => next.delete(k));
        return next;
      }
      const next = new Set(prev);
      visibleKeys.forEach((k) => next.add(k));
      return next;
    });
  };

  const toggleRowKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedPluginSlugsForMerge = useMemo(() => {
    return [...selectedKeys]
      .filter((k) => k.startsWith('plugin:'))
      .map((k) => k.slice('plugin:'.length));
  }, [selectedKeys]);

  const handleMergeSelectedPlugins = () => {
    if (selectedPluginSlugsForMerge.length < 2) return;
    const slugs = selectedPluginSlugsForMerge;
    const groups = slugs
      .map((s) => pluginGroups.find((g) => g.slug.toLowerCase() === s.toLowerCase()))
      .filter(Boolean) as { slug: string; displayName: string; items: LibraryItem[] }[];
    const allItems = groups.flatMap((g) => g.items);
    if (allItems.length === 0) return;
    const official = allItems.find((i) => i.source === LibraryItemSource.Official);
    const baseItem = official ?? allItems[0];
    const canonicalSlug = (official?.wpSlug ?? getPluginSlug(baseItem)).toLowerCase();
    const canonicalName = decodeHtmlEntities(official?.name ?? groups[0].displayName);
    if (
      !window.confirm(
        `Merge ${slugs.length} plugins into one library plugin (“${canonicalName}”, slug ${canonicalSlug})? All selected versions will use this slug.`,
      )
    ) {
      return;
    }
    mergeMutation.mutate(
      { itemIds: allItems.map((i) => i.$id), wpSlug: canonicalSlug, name: canonicalName },
      {
        onSuccess: () => setSelectedKeys(new Set()),
      },
    );
  };

  const handleDeleteItem = (item: LibraryItem) => {
    const base = `Remove "${decodeHtmlEntities(item.name)}" from your library?`;
    let msg = base;
    if (isLastLibraryRowForSlugAndType(item, libraryItems)) {
      const lines = buildMembershipDeleteWarningLines(
        getLibraryItemSlug(item),
        item.type,
        families,
        collections,
      );
      if (lines.length) {
        msg = `${base}\n\nThis is the last library row for this slug and type. It is still listed in:\n${lines.join('\n')}\n\nContinue?`;
      }
    }
    if (window.confirm(msg)) {
      deleteMutation.mutate(item.$id);
    }
  };

  const handleDeletePlugin = (items: LibraryItem[], displayName: string) => {
    if (items.length === 0) return;
    const slug = getLibraryItemSlug(items[0]);
    const type = items[0].type;
    let msg = `Remove "${decodeHtmlEntities(displayName)}" and all its versions from your library?`;
    if (willDeleteRemoveLastSlugTypeRow(items, slug, type, libraryItems)) {
      const lines = buildMembershipDeleteWarningLines(slug, type, families, collections);
      if (lines.length) {
        msg += `\n\nThis slug is referenced in:\n${lines.join('\n')}\n\nContinue?`;
      }
    }
    if (!window.confirm(msg)) return;
    items.forEach((item) => deleteMutation.mutate(item.$id));
  };

  const handleDeleteSelected = () => {
    const pluginSlugs = [...selectedKeys]
      .filter((k) => k.startsWith('plugin:'))
      .map((k) => k.slice('plugin:'.length));
    const themeIds = [...selectedKeys].filter((k) => k.startsWith('theme:')).map((k) => k.slice('theme:'.length));
    if (pluginSlugs.length === 0 && themeIds.length === 0) return;

    const itemsToDelete: LibraryItem[] = [];
    for (const slug of pluginSlugs) {
      const g = pluginGroups.find((x) => x.slug.toLowerCase() === slug.toLowerCase());
      if (g) for (const item of g.items) itemsToDelete.push(item);
    }
    for (const id of themeIds) {
      const item = libraryItems.find((i) => i.$id === id && i.type === LibraryItemType.Theme);
      if (item) itemsToDelete.push(item);
    }
    if (itemsToDelete.length === 0) return;

    const seenSlugType = new Set<string>();
    const membershipBlocks: string[] = [];
    for (const item of itemsToDelete) {
      const sk = `${getLibraryItemSlug(item)}:${item.type}`;
      if (seenSlugType.has(sk)) continue;
      seenSlugType.add(sk);
      const subset = itemsToDelete.filter(
        (i) => getLibraryItemSlug(i) === getLibraryItemSlug(item) && i.type === item.type,
      );
      if (!willDeleteRemoveLastSlugTypeRow(subset, getLibraryItemSlug(item), item.type, libraryItems)) continue;
      const lines = buildMembershipDeleteWarningLines(
        getLibraryItemSlug(item),
        item.type,
        families,
        collections,
      );
      if (lines.length) {
        membershipBlocks.push(`${getLibraryItemSlug(item)}: ${lines.join('; ')}`);
      }
    }

    let msg = `Remove ${pluginSlugs.length} plugin group(s) and ${themeIds.length} theme row(s) from your library?`;
    if (membershipBlocks.length) {
      msg += `\n\nSome selections fully remove a slug that is still referenced in:\n${membershipBlocks.join('\n')}\n\nContinue?`;
    }
    if (!window.confirm(msg)) return;
    for (const slug of pluginSlugs) {
      const g = pluginGroups.find((x) => x.slug.toLowerCase() === slug.toLowerCase());
      if (g) g.items.forEach((item) => deleteMutation.mutate(item.$id));
    }
    for (const id of themeIds) {
      deleteMutation.mutate(id);
    }
    setSelectedKeys(new Set());
  };

  const handleInstallSelected = () => {
    const entries: BulkInstallEntry[] = [];
    for (const key of selectedKeys) {
      if (key.startsWith('plugin:')) {
        const slug = key.slice('plugin:'.length);
        const g = pluginGroups.find((x) => x.slug.toLowerCase() === slug.toLowerCase());
        if (g) entries.push({ kind: 'plugin', slug: g.slug, displayName: g.displayName, items: g.items });
      } else if (key.startsWith('theme:')) {
        const id = key.slice('theme:'.length);
        const item = libraryItems.find((i) => i.$id === id && i.type === LibraryItemType.Theme);
        if (item) entries.push({ kind: 'theme', item, displayName: item.name });
      }
    }
    if (entries.length === 0) return;
    setBulkInstallEntries(entries);
    setBulkInstallOpen(true);
  };

  const handleUpdateSelected = () => {
    const plugins: LibraryBulkUpdatePluginRow[] = [];
    for (const key of selectedKeys) {
      if (!key.startsWith('plugin:')) continue;
      const slug = key.slice('plugin:'.length);
      const g = pluginGroups.find((x) => x.slug.toLowerCase() === slug.toLowerCase());
      if (g) plugins.push({ slug: g.slug, displayName: g.displayName, items: g.items });
    }
    if (plugins.length === 0) return;
    setBulkUpdatePlugins(plugins);
    setBulkUpdateOpen(true);
  };

  const openUploadForBulkSlug = (slug: string) => {
    setBulkUpdateOpen(false);
    setPrefillPluginContext({ slug, name: slug });
    setUploadModalOpen(true);
  };

  const openAddWpForBulkSlug = (slug: string, displayName: string) => {
    setBulkUpdateOpen(false);
    setPrefillPluginContext({ slug, name: displayName });
    setAddWpModalOpen(true);
  };

  const selectedPluginItems = useMemo(
    () =>
      selectedPluginSlug
        ? libraryItems.filter(
            (i) =>
              i.type === LibraryItemType.Plugin &&
              (i.wpSlug?.toLowerCase() === selectedPluginSlug.toLowerCase() ||
                getPluginSlug(i) === selectedPluginSlug.toLowerCase()),
          )
        : [],
    [selectedPluginSlug, libraryItems],
  );

  useEffect(() => {
    if (selectedPluginSlug) {
      const name =
        selectedPluginItems.length > 0
          ? decodeHtmlEntities(selectedPluginItems[0]?.name || selectedPluginSlug)
          : selectedPluginSlug;
      setBreadcrumbTitle(name);
      return () => setBreadcrumbTitle(null);
    }
    setBreadcrumbConfig({
      pageName: 'Library',
      pageHref: ROUTE_PATHS.LIBRARY,
      tabs: LIBRARY_MAIN_TABS.map((t) => ({
        label: t.label,
        icon: t.icon,
        href: `${ROUTE_PATHS.LIBRARY}?tab=${t.value}`,
      })),
      activeTabIndex: mainTab,
    });
    return () => setBreadcrumbConfig(null);
  }, [selectedPluginSlug, selectedPluginItems, mainTab, setBreadcrumbTitle, setBreadcrumbConfig]);

  const addLibraryTab = includeThemes && !includePlugins ? 1 : 0;

  const handleSortColumn = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortHeaderSortedProp = (key: SortKey): 'none' | 'asce' | 'desc' => {
    if (sortKey !== key) return 'none';
    return sortDir === 'asc' ? 'asce' : 'desc';
  };

  const toggleSourceFilter = (s: LibraryItemSource) => {
    setSelectedSources((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  if (selectedPluginSlug && selectedPluginItems.length > 0) {
    return (
      <>
        <AddLibrarySourceModal
          open={addSourceModalOpen}
          onClose={() => setAddSourceModalOpen(false)}
          tab={0}
          onChooseSource={handleAddSourceChoice}
          disabled={libraryUsed >= libraryLimit}
          existingPluginSlug={selectedPluginSlug ?? undefined}
          existingPluginName={selectedPluginItems[0]?.name}
        />
        <AddFromWordPressModal
          open={addWpModalOpen}
          onClose={() => {
            setAddWpModalOpen(false);
            clearPrefillPluginContext();
          }}
          prefillPluginSlug={prefillPluginContext?.slug}
          prefillPluginName={prefillPluginContext?.name}
          initialSearchTerm={prefillPluginContext?.name}
        />
        <UploadLibraryModal
          open={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            clearPrefillPluginContext();
          }}
          prefillPluginSlug={prefillPluginContext?.slug}
        />
        <AddRemoteUrlModal
          open={addRemoteModalOpen}
          onClose={() => {
            setAddRemoteModalOpen(false);
            setAddRemoteInitialPluginName(undefined);
            clearPrefillPluginContext();
          }}
          existingPluginSlug={selectedPluginSlug ?? undefined}
          existingPluginName={selectedPluginItems[0]?.name}
          initialPluginName={addRemoteInitialPluginName}
        />
        <SoftBox sx={{ ...contentPageShellFlexSx, backgroundColor: 'transparent' }}>
          <LibraryPluginDetailView
            pluginSlug={selectedPluginSlug}
            libraryItems={selectedPluginItems}
            onBack={() => setSelectedPluginSlug(null)}
          />
        </SoftBox>
        <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
      </>
    );
  }

  return (
    <>
      <AddLibrarySourceModal
        open={addSourceModalOpen}
        onClose={() => setAddSourceModalOpen(false)}
        tab={addLibraryTab}
        onChooseSource={handleAddSourceChoice}
        disabled={libraryUsed >= libraryLimit}
      />
      <AddFromWordPressModal
        open={addWpModalOpen}
        onClose={() => {
          setAddWpModalOpen(false);
          clearPrefillPluginContext();
        }}
        prefillPluginSlug={prefillPluginContext?.slug}
        prefillPluginName={prefillPluginContext?.name}
        initialSearchTerm={prefillPluginContext?.name}
      />
      <UploadLibraryModal
        open={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          clearPrefillPluginContext();
        }}
        initialType={addLibraryTab === 1 ? LibraryItemType.Theme : undefined}
        prefillPluginSlug={prefillPluginContext?.slug}
      />
      <AddRemoteUrlModal
        open={addRemoteModalOpen}
        onClose={() => {
          setAddRemoteModalOpen(false);
          setAddRemoteInitialPluginName(undefined);
          clearPrefillPluginContext();
        }}
        initialPluginName={addRemoteInitialPluginName}
      />

      <LibraryBulkInstallModal open={bulkInstallOpen} onClose={() => setBulkInstallOpen(false)} entries={bulkInstallEntries} />
      <LibraryBulkUpdateModal
        open={bulkUpdateOpen}
        onClose={() => setBulkUpdateOpen(false)}
        plugins={bulkUpdatePlugins}
        onRequestUploadZip={openUploadForBulkSlug}
        onRequestAddFromWordPress={openAddWpForBulkSlug}
      />

      <SoftBox sx={contentPageShellFlexSx}>
        <SoftBox sx={{ ...libraryListPageGridSx, flex: 1, minHeight: 0 }}>
          <SoftBox sx={libraryListMainTabsSx}>
            <TabNavList
              variant="library"
              items={LIBRARY_MAIN_TABS}
              value={mainTab}
              onChange={(_, v) => setMainTab(v)}
            />
          </SoftBox>

          <SoftBox
            sx={{
              ...libraryListMainPaperSx,
              position: 'relative',
              ...libraryContentPaperSx,
              overflow: 'hidden',
            }}
          >
            {isLoading && (
              <SoftBox p={6} textAlign="center" sx={{ flexShrink: 0 }}>
                <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }}>sync</Icon>
                <SoftTypography variant="button" color="secondary">
                  Loading library...
                </SoftTypography>
              </SoftBox>
            )}

            {isError && (
              <SoftBox p={4} sx={{ flexShrink: 0 }}>
                <SoftTypography variant="button" color="error">
                  {error?.message || 'Error loading library.'}
                </SoftTypography>
              </SoftBox>
            )}

            {!isLoading && !isError && (
              <SoftBox
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  overflow: 'hidden',
                  px: { xs: 2.5, lg: 3.5 },
                  pb: 2.5,
                  pt: { xs: 2.5, lg: 3 },
                }}
              >
                <SoftBox sx={{ flexShrink: 0, pb: 2, mb: 0.5 }}>
                  <SoftBox
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 2,
                      flexWrap: 'wrap',
                      rowGap: 1.5,
                    }}
                  >
                    <SoftBox sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 1.5, minWidth: 0 }}>
                      <SoftTypography
                        variant="h6"
                        fontWeight="bold"
                        sx={{ lineHeight: 1.3, color: LIBRARY_ORANGE }}
                      >
                        {LIBRARY_PAPER_HEADERS[mainTab]?.title ?? 'Library'}
                      </SoftTypography>
                      <SoftTypography
                        variant="body2"
                        sx={{ fontSize: '0.8125rem', lineHeight: 1.4, color: 'text.secondary' }}
                      >
                        {LIBRARY_PAPER_HEADERS[mainTab]?.subtitle ?? ''}
                      </SoftTypography>
                    </SoftBox>
                    <SoftBox sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                      {(mainTab === 1 || mainTab === 2) && (
                        <TextField
                          size="small"
                          placeholder="Search…"
                          value={listSearch}
                          onChange={(e) => setListSearch(e.target.value)}
                          sx={{
                            width: { xs: '100%', sm: 280 },
                            maxWidth: 400,
                            '& .MuiOutlinedInput-root': { borderRadius: 2 },
                          }}
                          InputProps={{ 'aria-label': 'Search' }}
                        />
                      )}
                      {mainTab === 0 && (
                        <SoftButton
                          onClick={() => setAddSourceModalOpen(true)}
                          disabled={libraryUsed >= libraryLimit}
                          aria-label="Add to library"
                          sx={{
                            px: 2.5,
                            py: 1.25,
                            color: '#fff !important',
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: 2,
                            background: ORANGE_ACTION_GRADIENT,
                            boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                            '&:hover': {
                              boxShadow: '0 6px 20px rgba(234, 88, 12, 0.45)',
                              filter: 'brightness(1.03)',
                            },
                            '&.Mui-disabled': {
                              background: 'grey.300',
                              color: 'grey.500 !important',
                              boxShadow: 'none',
                            },
                          }}
                        >
                          + Add New
                        </SoftButton>
                      )}
                    </SoftBox>
                  </SoftBox>
                  {mainTab === 0 && libraryUsed >= libraryLimit && (
                    <SoftTypography variant="caption" color="warning" display="block" sx={{ mt: 1 }}>
                      Library limit reached. Upgrade your plan to add more items.
                    </SoftTypography>
                  )}
                </SoftBox>

                <SoftBox sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', minWidth: 0 }}>
                  <TabNavPanel value={mainTab} index={0}>
                  <SoftBox
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                      overflow: 'hidden',
                      gap: 0,
                    }}
                  >
                    {pluginItems.length === 0 && themeItems.length === 0 ? (
                      <SoftBox p={6} textAlign="center">
                        <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }}>inventory_2</Icon>
                        <SoftTypography variant="h6" fontWeight="medium" mb={1}>
                          No items yet
                        </SoftTypography>
                        <SoftTypography variant="button" color="secondary" mb={2} display="block">
                          Use &quot;+ Add New&quot; to add plugins or upload themes.
                        </SoftTypography>
                      </SoftBox>
                    ) : unifiedRows.length === 0 ? (
                      <SoftBox p={4} textAlign="center">
                        <SoftTypography variant="button" color="secondary">
                          No items match your filters.
                        </SoftTypography>
                      </SoftBox>
                    ) : (
                      <ScrollableTableWrapper flexFill sx={{ flex: 1, minHeight: 0 }}>
                        <Table
                          stickyHeader
                          sx={{
                            tableLayout: 'fixed',
                            width: '100%',
                            '& thead th': {
                              position: 'sticky',
                              top: 0,
                              zIndex: 2,
                              backgroundColor: 'background.paper',
                              borderBottom: '1px solid rgba(0,0,0,0.08)',
                            },
                            '& tbody td:nth-of-type(2)': {
                              paddingLeft: (theme) => theme.spacing(2),
                            },
                            '& thead th:last-of-type': { paddingRight: (theme) => theme.spacing(4) },
                            '& tbody td:last-of-type': { paddingRight: (theme) => theme.spacing(4) },
                          }}
                        >
                          <SoftBox component="thead">
                            <TableRow>
                              <DataTableHeadCell width="48px" pl={2} color="#4F5482" align="center">
                                <Checkbox
                                  size="small"
                                  checked={allVisibleSelected}
                                  indeterminate={someVisibleSelected && !allVisibleSelected}
                                  onChange={toggleSelectAll}
                                  inputProps={{ 'aria-label': 'Select all rows' }}
                                />
                              </DataTableHeadCell>
                              <DataTableHeadCell
                                width="9%"
                                pl={undefined}
                                color="#4F5482"
                                sorted={sortHeaderSortedProp('type')}
                                onClick={() => handleSortColumn('type')}
                              >
                                Type
                              </DataTableHeadCell>
                              <DataTableHeadCell
                                width="30%"
                                pl={undefined}
                                color="#4F5482"
                                sorted={sortHeaderSortedProp('name')}
                                onClick={() => handleSortColumn('name')}
                              >
                                Name
                              </DataTableHeadCell>
                              <DataTableHeadCell
                                width="18%"
                                pl={undefined}
                                color="#4F5482"
                                sorted={sortHeaderSortedProp('tags')}
                                onClick={() => handleSortColumn('tags')}
                              >
                                Tags
                              </DataTableHeadCell>
                              <DataTableHeadCell
                                width="11%"
                                pl={undefined}
                                color="#4F5482"
                                sorted={sortHeaderSortedProp('version')}
                                onClick={() => handleSortColumn('version')}
                              >
                                Version
                              </DataTableHeadCell>
                              <DataTableHeadCell
                                width="22%"
                                pl={undefined}
                                color="#4F5482"
                                sorted={sortHeaderSortedProp('author')}
                                onClick={() => handleSortColumn('author')}
                              >
                                Author
                              </DataTableHeadCell>
                              <DataTableHeadCell width="8%" align="right" pl={undefined} color="#4F5482">
                                Actions
                              </DataTableHeadCell>
                            </TableRow>
                          </SoftBox>
                          <TableBody>
                            {unifiedRows.map((row) => {
                              if (row.rowKind === 'plugin') {
                                const { group } = row;
                                const firstItem = group.items[0];
                                const versionLabel =
                                  group.items.length > 1 ? `${group.items.length} versions` : firstItem.version;
                                const wp = wpBySlug.get(group.slug.toLowerCase()) ?? null;
                                const versionBehind = pluginDefaultIsBehindWpOrg(group.items, wp);
                                const gTags = tagsForGroup(group);
                                const rowKey = `plugin:${group.slug}`;
                                return (
                                  <TableRow
                                    key={rowKey}
                                    sx={{
                                      cursor: 'pointer',
                                      '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                    onClick={() => setSelectedPluginSlug(group.slug)}
                                  >
                                    <DataTableBodyCell align="center">
                                      <SoftBox onClick={(e: React.MouseEvent) => e.stopPropagation()} display="inline-flex" justifyContent="center">
                                        <Checkbox
                                          size="small"
                                          checked={selectedKeys.has(rowKey)}
                                          onChange={() => toggleRowKey(rowKey)}
                                          inputProps={{ 'aria-label': `Select ${decodeHtmlEntities(group.displayName)}` }}
                                        />
                                      </SoftBox>
                                    </DataTableBodyCell>
                                    <DataTableBodyCell>
                                      <SoftTypography variant="caption" color="secondary">
                                        Plugin
                                      </SoftTypography>
                                    </DataTableBodyCell>
                                    <DataTableBodyCell contain>
                                      <SoftTypography
                                        variant="button"
                                        fontWeight="medium"
                                        title={decodeHtmlEntities(group.displayName)}
                                        sx={{
                                          display: 'block',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {decodeHtmlEntities(group.displayName)}
                                      </SoftTypography>
                                    </DataTableBodyCell>
                                    <DataTableBodyCell contain>
                                      <SoftBox display="flex" flexWrap="wrap" gap={0.5} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                        {gTags.length === 0 ? (
                                          <SoftTypography variant="caption" color="secondary">
                                            —
                                          </SoftTypography>
                                        ) : (
                                          gTags.map((t) => (
                                            <Chip
                                              key={t}
                                              component={Link}
                                              to={`${ROUTE_PATHS.LIBRARY}?tag=${encodeURIComponent(t)}`}
                                              size="small"
                                              label={t}
                                              variant="outlined"
                                              sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' } }}
                                              clickable
                                            />
                                          ))
                                        )}
                                      </SoftBox>
                                    </DataTableBodyCell>
                                    <DataTableBodyCell>
                                      <SoftBox display="inline-flex" alignItems="center" gap={0.5} component="span">
                                        <SoftTypography variant="caption">{versionLabel}</SoftTypography>
                                        {versionBehind ? (
                                          <Tooltip title="Library default is older than the latest WordPress.org release. Pinning latest and updating default…">
                                            <Icon
                                              sx={{ fontSize: 18, color: 'warning.main', verticalAlign: 'middle' }}
                                              aria-hidden
                                            >
                                              warning
                                            </Icon>
                                          </Tooltip>
                                        ) : null}
                                      </SoftBox>
                                    </DataTableBodyCell>
                                    <DataTableBodyCell>
                                      <SoftTypography
                                        variant="caption"
                                        color="secondary"
                                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 1 }}
                                        title={firstItem.author}
                                      >
                                        {firstItem.author || '-'}
                                      </SoftTypography>
                                    </DataTableBodyCell>
                                    <DataTableBodyCell align="right">
                                      <SoftBox component="span" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                        <Tooltip title="Remove plugin and all versions from library">
                                          <IconButton
                                            size="small"
                                            onClick={() => handleDeletePlugin(group.items, group.displayName)}
                                            disabled={deleteMutation.isPending}
                                            sx={iconButtonOnLightSurfaceSx}
                                            aria-label={`Remove ${decodeHtmlEntities(group.displayName)}`}
                                          >
                                            <Icon sx={{ fontSize: 18 }}>delete</Icon>
                                          </IconButton>
                                        </Tooltip>
                                      </SoftBox>
                                    </DataTableBodyCell>
                                  </TableRow>
                                );
                              }
                              const { item } = row;
                              const rowKey = `theme:${item.$id}`;
                              return (
                                <TableRow
                                  key={rowKey}
                                  sx={{
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'action.hover' },
                                  }}
                                  onClick={() =>
                                    navigate(`${ROUTE_PATHS.LIBRARY}?themeFocus=${encodeURIComponent(item.$id)}`)
                                  }
                                >
                                  <DataTableBodyCell align="center">
                                    <SoftBox
                                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                      display="inline-flex"
                                      justifyContent="center"
                                    >
                                      <Checkbox
                                        size="small"
                                        checked={selectedKeys.has(rowKey)}
                                        onChange={() => toggleRowKey(rowKey)}
                                        inputProps={{ 'aria-label': `Select ${decodeHtmlEntities(item.name)}` }}
                                      />
                                    </SoftBox>
                                  </DataTableBodyCell>
                                  <DataTableBodyCell>
                                    <SoftTypography variant="caption" color="secondary">
                                      Theme
                                    </SoftTypography>
                                  </DataTableBodyCell>
                                  <DataTableBodyCell contain>
                                    <SoftTypography
                                      variant="button"
                                      fontWeight="medium"
                                      title={decodeHtmlEntities(item.name)}
                                      sx={{
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {decodeHtmlEntities(item.name)}
                                    </SoftTypography>
                                  </DataTableBodyCell>
                                  <DataTableBodyCell contain>
                                    <SoftBox display="flex" flexWrap="wrap" gap={0.5} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                      {tagsForThemeItem(item).length === 0 ? (
                                        <SoftTypography variant="caption" color="secondary">
                                          —
                                        </SoftTypography>
                                      ) : (
                                        tagsForThemeItem(item).map((t) => (
                                          <Chip
                                            key={t}
                                            component={Link}
                                            to={`${ROUTE_PATHS.LIBRARY}?tag=${encodeURIComponent(t)}`}
                                            size="small"
                                            label={t}
                                            variant="outlined"
                                            sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' } }}
                                            clickable
                                          />
                                        ))
                                      )}
                                    </SoftBox>
                                  </DataTableBodyCell>
                                  <DataTableBodyCell>
                                    <SoftTypography variant="caption">{item.version}</SoftTypography>
                                  </DataTableBodyCell>
                                  <DataTableBodyCell>
                                    <SoftTypography
                                      variant="caption"
                                      color="secondary"
                                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 1 }}
                                      title={item.author}
                                    >
                                      {item.author || '-'}
                                    </SoftTypography>
                                  </DataTableBodyCell>
                                  <DataTableBodyCell align="right">
                                    <SoftBox component="span" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                      <Tooltip title="Remove from library">
                                        <IconButton
                                          size="small"
                                          onClick={() => handleDeleteItem(item)}
                                          disabled={deleteMutation.isPending}
                                          sx={iconButtonOnLightSurfaceSx}
                                          aria-label={`Remove ${decodeHtmlEntities(item.name)}`}
                                        >
                                          <Icon sx={{ fontSize: 18 }}>delete</Icon>
                                        </IconButton>
                                      </Tooltip>
                                    </SoftBox>
                                  </DataTableBodyCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </ScrollableTableWrapper>
                    )}
                    {!isLoading && !isError && (
                      <SoftBox sx={{ flexShrink: 0, pt: 2.5, pb: 1, width: '100%' }}>
                        <TextField
                          variant="outlined"
                          hiddenLabel
                          size="small"
                          placeholder="Search…"
                          value={listSearch}
                          fullWidth
                          onChange={(e) => setListSearch(e.target.value)}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          InputProps={{ 'aria-label': 'Search library' }}
                        />
                      </SoftBox>
                    )}
                  </SoftBox>
                </TabNavPanel>

                <TabNavPanel value={mainTab} index={1}>
                  <LibraryFamiliesPanel searchQuery={listSearch} />
                </TabNavPanel>
                <TabNavPanel value={mainTab} index={2}>
                  <LibraryCollectionsPanel searchQuery={listSearch} />
                </TabNavPanel>
              </SoftBox>
            </SoftBox>
            )}

          </SoftBox>

          <SoftBox sx={libraryListSidebarSx}>
            <LibraryPageFiltersPanel
              mainTab={mainTab}
              tagInput={tagInput}
              onTagInputChange={setTagInput}
              tagFilter={tagFilter}
              onTagFilterChange={setTagFilter}
              includePlugins={includePlugins}
              includeThemes={includeThemes}
              onIncludePluginsChange={setIncludePlugins}
              onIncludeThemesChange={setIncludeThemes}
              selectedSources={selectedSources}
              onToggleSource={toggleSourceFilter}
              allPluginTags={allItemTags}
              selectedCount={selectedKeys.size}
              onDeleteSelected={handleDeleteSelected}
              onInstallSelected={handleInstallSelected}
              onUpdateSelected={handleUpdateSelected}
              onMergeSelected={handleMergeSelectedPlugins}
              disableDelete={selectedKeys.size === 0}
              disableInstall={selectedKeys.size === 0}
              disableUpdate={
                selectedKeys.size === 0 || ![...selectedKeys].some((k) => k.startsWith('plugin:'))
              }
              disableMerge={selectedPluginSlugsForMerge.length < 2 || mergeMutation.isPending}
              deletePending={deleteMutation.isPending}
            />
          </SoftBox>
        </SoftBox>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default LibraryPage;
