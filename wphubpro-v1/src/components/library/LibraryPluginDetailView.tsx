/**
 * Library plugin detail view – same layout as site PluginDetailView.
 * Left: title, description. Right: version, latest, author.
 * Second row: Site management (left), Plugin management (right).
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Tooltip from '@mui/material/Tooltip';
import Select from '@mui/material/Select';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Icon from '@mui/material/Icon';
import Checkbox from '@mui/material/Checkbox';
import Card from '@mui/material/Card';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import DataTable from 'examples/Tables/DataTable';
import TabNavList, { TabNavPanel, TabNavItem } from 'components/ui/TabNavList';

import { getWpPluginInfo, WpPluginInfo } from '../../services/wordpress';
import {
  useDeleteLibraryItem,
  useUploadLocalItem,
  usePatchLibraryItem,
  useSetLibraryPluginDefaultItem,
} from '../../hooks/useLibrary';
import { useToast } from '../../contexts/ToastContext';
import AddRemoteUrlModal from './AddRemoteUrlModal';
import InstallOnSitesModal, { installLibraryVersionInfoIsRunnable } from './InstallOnSitesModal';
import PinVersionsFromWpModal from './PinVersionsFromWpModal';
import AddPluginVersionModal from './AddPluginVersionModal';
import LibraryPluginSidebar from './LibraryPluginSidebar';
import LibraryPluginTagsCard from './LibraryPluginTagsCard';
import AddPluginToCollectionModal from './AddPluginToCollectionModal';
import { useSites } from '../../domains/sites';
import {
  useDeletePlugin,
  useUpdatePlugin,
  useInstallPluginVersion,
  useInstallPluginFromZipUrl,
  useTogglePlugin,
} from '../../hooks/useWordPress';
import {
  FamilyInstallBlock,
  InstallVersionInfo,
  LibraryItem,
  LibraryItemSource,
  LibraryItemType,
} from '../../types';
import { useLibraryItems } from '../../hooks/useLibrary';
import {
  orderedFamilySlugsForInstall,
  useLibraryFamilies,
  useLibraryCollections,
} from '../../hooks/useLibraryFamiliesAndCollections';
import {
  filterFamiliesContainingSlug,
  filterCollectionsContainingSlug,
  buildMembershipDeleteWarningLines,
  isLastLibraryRowForSlugAndType,
  getLibraryItemSlug,
} from '../../domains/library';
import {
  buildInstallVersionOptionsForPluginItems,
  pickDefaultVersionStringForPluginItems,
  resolveDefaultInstallInfoForPlugin,
  getLibraryZipHttpsUrl,
} from '../../domains/library';
import { useQueries } from '@tanstack/react-query';
import { iconButtonOnLightSurfaceSx } from '../../theme/detailPageStyles';
import { libraryMagicTabStripWrapperSx } from '../../theme/libraryLayout';
import { ROUTE_PATHS } from '../../config/routePaths';

const infoGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';
/** Version column – label only (no icon background box) */
function VersionTableSiteStyle({ versionLabel }: { versionLabel: string }) {
  return (
    <SoftTypography variant="button" fontWeight="medium">
      {versionLabel}
    </SoftTypography>
  );
}

/** Flat circular actions – no neumorphic shadow / dark edge (unlike sites ActionIconButton) */
function LibraryVersionsActionButton({
  icon,
  title,
  onClick,
  disabled = false,
}: {
  icon: string;
  title: string;
  color?: 'info' | 'error' | 'success';
  onClick?: () => void;
  disabled?: boolean;
}) {
  const bg = infoGradient;
  return (
    <Tooltip title={title} placement="top">
      <span style={{ display: 'inline-flex' }}>
        <SoftBox
          component={onClick && !disabled ? 'button' : 'span'}
          {...(onClick && !disabled ? { type: 'button' as const } : {})}
          onClick={disabled ? undefined : onClick}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            minWidth: 32,
            minHeight: 32,
            p: 0,
            borderRadius: '50%',
            background: disabled ? 'grey.400' : bg,
            color: 'white',
            border: 'none',
            boxShadow: 'none',
            outline: 'none',
            cursor: disabled ? 'default' : onClick ? 'pointer' : 'default',
            opacity: disabled ? 0.55 : 1,
            pointerEvents: disabled ? 'none' : undefined,
            '&:hover': onClick && !disabled ? { opacity: 0.9, boxShadow: 'none' } : undefined,
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
          }}
        >
          <Icon sx={{ fontSize: 18, color: 'white !important' }}>{icon}</Icon>
        </SoftBox>
      </span>
    </Tooltip>
  );
}

type LibraryVersionRow = {
  rowId: string;
  kind: 'official' | 'local' | 'remote';
  versionLabel: string;
  item: LibraryItem | null;
  detailsText: string;
  remoteUrl?: string;
};

type SitePluginManagementRow = {
  rowKey: string;
  siteId: string;
  siteName: string;
  pluginFile: string;
  installedVersion: string;
  pluginActive: boolean;
};

function parsePluginsMeta(
  meta: string | undefined,
): { plugin: string; version: string; active: boolean }[] {
  if (!meta || typeof meta !== 'string') return [];
  try {
    const arr = JSON.parse(meta);
    if (!Array.isArray(arr)) return [];
    return arr.map((p: any) => ({
      plugin: p.file ?? p.plugin ?? '',
      version: p.version ?? '',
      active:
        p.active === true ||
        p.active === 1 ||
        String(p.status || '').toLowerCase() === 'active',
    }));
  } catch {
    return [];
  }
}

function slugFromPluginFile(pluginFile: string): string {
  if (!pluginFile || !pluginFile.includes('/')) return '';
  return pluginFile.split('/')[0];
}

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  const el = document.createElement('div');
  el.innerHTML = text;
  return el.textContent || el.innerText || text;
}

function groupPluginSlug(item: LibraryItem): string {
  if (item.wpSlug) return item.wpSlug.toLowerCase();
  return item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function siteVersionSelectMapsEqual(
  prev: Record<string, string>,
  next: Record<string, string>,
): boolean {
  const nk = Object.keys(next);
  if (Object.keys(prev).length !== nk.length) return false;
  for (const k of nk) {
    if (prev[k] !== next[k]) return false;
  }
  return true;
}

/** Select `value` when installed site version is not in the library dropdown (shown as “change to:”) */
const SITE_CHANGE_VERSION_PLACEHOLDER = '__wphub_change_to__';

/** Unique MenuItem values — duplicate `value` across WP/local/remote breaks MUI Select (onEmpty → infinite setState). */
const CVK_WP = 'wphub|wp|';
const CVK_LO = 'wphub|lo|';
const CVK_RE = 'wphub|re|';

function changeVersionMenuKeyWp(v: string): string {
  return `${CVK_WP}${v}`;
}
function changeVersionMenuKeyLocal(itemId: string): string {
  return `${CVK_LO}${itemId}`;
}
function changeVersionMenuKeyRemote(itemId: string): string {
  return `${CVK_RE}${itemId}`;
}

function resolveVersionFromChangeMenuKey(
  key: string,
  localItems: LibraryItem[],
  remoteItems: LibraryItem[],
): string {
  if (key === SITE_CHANGE_VERSION_PLACEHOLDER) return SITE_CHANGE_VERSION_PLACEHOLDER;
  if (key.startsWith(CVK_WP)) return key.slice(CVK_WP.length);
  if (key.startsWith(CVK_LO)) {
    const id = key.slice(CVK_LO.length);
    return localItems.find((i) => i.$id === id)?.version ?? SITE_CHANGE_VERSION_PLACEHOLDER;
  }
  if (key.startsWith(CVK_RE)) {
    const id = key.slice(CVK_RE.length);
    return remoteItems.find((i) => i.$id === id)?.version ?? SITE_CHANGE_VERSION_PLACEHOLDER;
  }
  return SITE_CHANGE_VERSION_PLACEHOLDER;
}

function defaultChangeVersionMenuKeyForInstalled(
  installedVersion: string,
  wpVersionList: string[],
  localItems: LibraryItem[],
  remoteItems: LibraryItem[],
): string {
  if (wpVersionList.includes(installedVersion)) return changeVersionMenuKeyWp(installedVersion);
  const lo = localItems.find((i) => i.version === installedVersion);
  if (lo) return changeVersionMenuKeyLocal(lo.$id);
  const re = remoteItems.find((i) => i.version === installedVersion);
  if (re) return changeVersionMenuKeyRemote(re.$id);
  return SITE_CHANGE_VERSION_PLACEHOLDER;
}

const PLUGIN_DETAIL_MANAGEMENT_TABS: TabNavItem[] = [
  { value: 0, label: 'Plugin management', icon: 'extension' },
  { value: 1, label: 'Site management', icon: 'public' },
];

interface LibraryPluginDetailViewProps {
  pluginSlug: string;
  libraryItems: LibraryItem[];
  onBack: () => void;
}

const LibraryPluginDetailView: React.FC<LibraryPluginDetailViewProps> = ({
  pluginSlug,
  libraryItems,
  onBack,
}) => {
  const [wpInfo, setWpInfo] = useState<WpPluginInfo | null>(null);
  const [wpInfoLoading, setWpInfoLoading] = useState(false);
  const [defaultVersion, setDefaultVersion] = useState<string>('');
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());
  const [siteVersionSelect, setSiteVersionSelect] = useState<Record<string, string>>({});
  const [managementTab, setManagementTab] = useState(0); // 0 = Plugin management (default), 1 = Site management
  const [addRemoteModalOpen, setAddRemoteModalOpen] = useState(false);
  const [pinVersionsModalOpen, setPinVersionsModalOpen] = useState(false);
  const [addVersionModalOpen, setAddVersionModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [installInitialBulkKey, setInstallInitialBulkKey] = useState<string | null>(null);
  const [siteBulkAction, setSiteBulkAction] = useState<
    '' | 'uninstall' | 'update' | 'activate' | 'deactivate'
  >('');
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  const [addToCollectionModalOpen, setAddToCollectionModalOpen] = useState(false);

  const { data: sites = [] } = useSites();
  const { data: allLibraryItems = [] } = useLibraryItems();
  const { data: families = [] } = useLibraryFamilies();
  const { data: collections = [] } = useLibraryCollections();
  const { toast } = useToast();

  const familiesForThisPlugin = useMemo(
    () => filterFamiliesContainingSlug(families, pluginSlug),
    [families, pluginSlug],
  );
  const collectionsForThisPlugin = useMemo(
    () => filterCollectionsContainingSlug(collections, pluginSlug, LibraryItemType.Plugin),
    [collections, pluginSlug],
  );

  const familyMemberSlugs = useMemo(() => {
    const related = filterFamiliesContainingSlug(families, pluginSlug);
    const set = new Set<string>();
    for (const fam of related) {
      orderedFamilySlugsForInstall(fam, pluginSlug)
        .slice(1)
        .forEach((s) => set.add(s));
    }
    return Array.from(set);
  }, [families, pluginSlug]);

  const memberWpQueries = useQueries({
    queries: familyMemberSlugs.map((slug) => ({
      queryKey: ['wpPluginInfo', slug],
      queryFn: () => getWpPluginInfo(slug),
      staleTime: 1000 * 60 * 10,
    })),
  });

  const familyInstallBlocks = useMemo((): FamilyInstallBlock[] => {
    const blocks: FamilyInstallBlock[] = [];
    const seen = new Set<string>();
    const related = filterFamiliesContainingSlug(families, pluginSlug);
    for (const fam of related) {
      const ordered = orderedFamilySlugsForInstall(fam, pluginSlug).slice(1);
      for (const slug of ordered) {
        if (seen.has(slug)) continue;
        seen.add(slug);
        const items = allLibraryItems.filter((i) => {
          if (i.type === LibraryItemType.Plugin) {
            return groupPluginSlug(i) === slug;
          }
          if (i.type === LibraryItemType.Theme) {
            return (i.wpSlug ?? groupPluginSlug(i)) === slug;
          }
          return false;
        });
        if (items.length === 0) continue;
        const displayName =
          items.find((i) => i.source === LibraryItemSource.Official)?.name ?? items[0].name;
        const idx = familyMemberSlugs.indexOf(slug);
        const mi = idx >= 0 ? memberWpQueries[idx]?.data ?? null : null;
        const wpVersionList = mi?.versions
          ? Object.keys(mi.versions).filter((v) => v !== 'trunk')
          : [];
        if (items[0].type === LibraryItemType.Plugin) {
          const versionOptions = buildInstallVersionOptionsForPluginItems(items, mi?.version);
          const dvs = pickDefaultVersionStringForPluginItems(items, mi, wpVersionList);
          const defaultInstallInfo = resolveDefaultInstallInfoForPlugin(items, dvs, mi, wpVersionList);
          blocks.push({
            kind: 'plugin',
            blockId: slug,
            pluginSlug: slug,
            displayName,
            versionOptions,
            defaultInstallInfo,
          });
        } else {
          const zipUrl = getLibraryZipHttpsUrl(items[0]);
          blocks.push({
            kind: 'theme',
            blockId: slug,
            displayName,
            zipUrl,
          });
        }
      }
    }
    return blocks;
  }, [
    families,
    pluginSlug,
    allLibraryItems,
    familyMemberSlugs,
    memberWpQueries.map((q) => q.dataUpdatedAt).join(','),
    memberWpQueries.map((q) => q.data?.version).join(','),
  ]);
  const deleteLibraryMutation = useDeleteLibraryItem();
  const patchLibraryMutation = usePatchLibraryItem();
  const setLibraryDefaultMutation = useSetLibraryPluginDefaultItem();
  const uploadMutation = useUploadLocalItem();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const deletePluginMutation = useDeletePlugin(undefined);
  const updatePluginMutation = useUpdatePlugin(undefined);
  const installVersionMutation = useInstallPluginVersion(undefined);
  const installFromZipMutation = useInstallPluginFromZipUrl(undefined);
  const togglePluginMutation = useTogglePlugin(undefined);

  const officialItems = libraryItems.filter((i) => i.source === LibraryItemSource.Official);
  const officialItem = officialItems[0];
  const localItems = libraryItems.filter((i) => i.source === LibraryItemSource.Local);
  const remoteItems = libraryItems.filter((i) => i.source === LibraryItemSource.Remote);
  const displayName = officialItem?.name ?? localItems[0]?.name ?? remoteItems[0]?.name ?? pluginSlug;
  const displayAuthor = officialItem?.author ?? localItems[0]?.author ?? wpInfo?.author ?? '';
  const authorUrl = wpInfo?.authorUri ?? wpInfo?.homepage;

  const latestKnownVersion = useMemo(() => {
    const wpLatest = wpInfo?.version ?? '';
    const localVersions = localItems.map((i) => i.version);
    const remoteVersions = remoteItems.map((i) => i.version);
    const officialPinned = officialItems
      .filter((i) => i.version && i.version !== 'latest')
      .map((i) => i.version);
    const all = [wpLatest, ...localVersions, ...remoteVersions, ...officialPinned].filter(Boolean);
    if (all.length === 0) return '-';
    return all.sort((a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] ?? 0;
        const y = pb[i] ?? 0;
        if (x !== y) return y - x;
      }
      return 0;
    })[0];
  }, [wpInfo?.version, localItems, remoteItems, officialItems]);

  const currentLibraryVersion = officialItems.length > 0
    ? officialItems.length > 1
      ? `${officialItems.length} WordPress.org pins`
      : officialItems[0].version === 'latest'
        ? 'From WordPress.org (choose at install)'
        : officialItems[0].version
    : localItems[0]?.version ?? remoteItems[0]?.version ?? '-';

  const mergedLibraryTags = useMemo(() => {
    const next = new Set<string>();
    libraryItems.forEach((i) =>
      (i.tags ?? []).forEach((t) => {
        const x = String(t).trim();
        if (x) next.add(x);
      }),
    );
    return Array.from(next).sort((a, b) => a.localeCompare(b));
  }, [libraryItems]);

  useEffect(() => {
    if (!pluginSlug) return;
    setWpInfoLoading(true);
    setWpInfo(null);
    getWpPluginInfo(pluginSlug)
      .then(setWpInfo)
      .catch(() => setWpInfo(null))
      .finally(() => setWpInfoLoading(false));
  }, [pluginSlug]);

  const wpVersionList = wpInfo?.versions
    ? Object.keys(wpInfo.versions)
        .filter((v) => v !== 'trunk')
        .sort((a, b) => {
          const pa = a.split('.').map(Number);
          const pb = b.split('.').map(Number);
          for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const x = pa[i] ?? 0;
            const y = pb[i] ?? 0;
            if (x !== y) return y - x;
          }
          return 0;
        })
    : [];

  const availableVersions = useMemo(() => {
    const localVersions = localItems.map((i) => i.version);
    const remoteVersions = remoteItems.map((i) => i.version);
    const base =
      officialItems.length > 0 ? [...wpVersionList, ...localVersions, ...remoteVersions] : [...localVersions, ...remoteVersions];
    return [...new Set(base)];
  }, [wpVersionList, localItems, remoteItems, officialItems.length]);

  /** Versions listed in Site management “Change version” dropdown (WP.org list + library) */
  const selectableVersionsForSites = useMemo(() => {
    const set = new Set<string>();
    wpVersionList.forEach((v) => set.add(v));
    for (const item of libraryItems) {
      if (item.source === LibraryItemSource.Local || item.source === LibraryItemSource.Remote) {
        set.add(item.version);
      }
    }
    return set;
  }, [wpVersionList, libraryItems]);

  /**
   * Exact MenuItem `value`s for “Change version” Select (unique per source; no duplicate version strings).
   */
  const changeVersionMenuItemKeys = useMemo(() => {
    const set = new Set<string>();
    set.add(SITE_CHANGE_VERSION_PLACEHOLDER);
    wpVersionList.forEach((v) => set.add(changeVersionMenuKeyWp(v)));
    localItems.forEach((i) => set.add(changeVersionMenuKeyLocal(i.$id)));
    remoteItems.forEach((i) => set.add(changeVersionMenuKeyRemote(i.$id)));
    return set;
  }, [wpVersionList, localItems, remoteItems]);

  useEffect(() => {
    const isValid = defaultVersion && availableVersions.includes(defaultVersion);
    if (isValid) return; // Keep user selection
    const picked = pickDefaultVersionStringForPluginItems(libraryItems, wpInfo, wpVersionList);
    if (picked) setDefaultVersion(picked);
  }, [libraryItems, localItems, remoteItems, wpInfo, wpVersionList, availableVersions, defaultVersion]);

  const sitesWithPlugin = useMemo(() => {
    return sites
      .filter((s) => s.status === 'connected')
      .map((site) => {
        const plugins = parsePluginsMeta(site.pluginsMeta);
        const match = plugins.find((p) => slugFromPluginFile(p.plugin) === pluginSlug);
        return match
          ? {
              site,
              pluginFile: match.plugin,
              installedVersion: match.version,
              pluginActive: match.active,
            }
          : null;
      })
      .filter(Boolean) as {
      site: { $id: string; siteName?: string };
      pluginFile: string;
      installedVersion: string;
      pluginActive: boolean;
    }[];
  }, [sites, pluginSlug]);

  useEffect(() => {
    setSiteVersionSelect((prev) => {
      const next: Record<string, string> = {};
      sitesWithPlugin.forEach(({ site, installedVersion }) => {
        const id = site.$id;
        const defaultKey = defaultChangeVersionMenuKeyForInstalled(
          installedVersion,
          wpVersionList,
          localItems,
          remoteItems,
        );
        const p = prev[id];
        if (
          p !== undefined &&
          p !== SITE_CHANGE_VERSION_PLACEHOLDER &&
          changeVersionMenuItemKeys.has(p)
        ) {
          next[id] = p;
        } else {
          next[id] = defaultKey;
        }
      });
      return siteVersionSelectMapsEqual(prev, next) ? prev : next;
    });
  }, [sitesWithPlugin, changeVersionMenuItemKeys, pluginSlug, wpVersionList, localItems, remoteItems]);

  const descriptionText = (officialItem?.description ?? wpInfo?.description ?? '')
    ? String(officialItem?.description ?? wpInfo?.description)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

  const toggleSiteSelection = (siteId: string) => {
    setSelectedSiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  };

  const toggleAllSites = () => {
    if (selectedSiteIds.size === sitesWithPlugin.length) {
      setSelectedSiteIds(new Set());
    } else {
      setSelectedSiteIds(new Set(sitesWithPlugin.map((s) => s.site.$id)));
    }
  };

  const handleUninstall = (siteId: string, pluginFile: string) => {
    if (window.confirm(`Uninstall from this site?`)) {
      deletePluginMutation.mutate({
        siteId,
        pluginFile,
        pluginName: displayName,
      });
    }
  };

  const executeSiteBulkAction = () => {
    if (!siteBulkAction || selectedSiteIds.size === 0) return;
    const targets = sitesWithPlugin.filter((s) => selectedSiteIds.has(s.site.$id));
    const actionLabel =
      siteBulkAction === 'uninstall'
        ? 'Uninstall'
        : siteBulkAction === 'update'
          ? 'Update'
          : siteBulkAction === 'activate'
            ? 'Activate'
            : 'Deactivate';
    if (!window.confirm(`${actionLabel} this plugin on ${targets.length} selected site(s)?`)) return;

    if (siteBulkAction === 'uninstall') {
      targets.forEach(({ site, pluginFile }) => {
        deletePluginMutation.mutate({
          siteId: site.$id,
          pluginFile,
          pluginName: displayName,
        });
      });
    } else if (siteBulkAction === 'update') {
      targets.forEach(({ site, pluginFile }) => {
        updatePluginMutation.mutate({
          siteId: site.$id,
          pluginFile,
          pluginName: displayName,
        });
      });
    } else if (siteBulkAction === 'activate') {
      targets
        .filter((t) => !t.pluginActive)
        .forEach(({ site, pluginFile }) => {
          togglePluginMutation.mutate({
            siteId: site.$id,
            pluginSlug: pluginFile,
            status: 'inactive',
            pluginName: displayName,
          });
        });
    } else if (siteBulkAction === 'deactivate') {
      targets
        .filter((t) => t.pluginActive)
        .forEach(({ site, pluginFile }) => {
          togglePluginMutation.mutate({
            siteId: site.$id,
            pluginSlug: pluginFile,
            status: 'active',
            pluginName: displayName,
          });
        });
    }
    setSelectedSiteIds(new Set());
    setSiteBulkAction('');
  };

  const handleUpdate = (siteId: string, pluginFile: string) => {
    updatePluginMutation.mutate({
      siteId,
      pluginFile,
      pluginName: displayName,
    });
  };

  const handleInstallVersion = (siteId: string, pluginFile: string, version: string, siteDisplayName?: string) => {
    installVersionMutation.mutate({
      siteId,
      pluginFile,
      version,
      pluginName: displayName,
      siteDisplayName,
    });
  };

  const handleSavePluginTags = async (tags: string[]) => {
    const normalized = [...new Set(tags.map((t) => t.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
    try {
      await Promise.all(
        libraryItems.map((item) =>
          patchLibraryMutation.mutateAsync({ itemId: item.$id, tags: normalized }),
        ),
      );
      toast({ title: 'Saved', description: 'Tags updated for this plugin.', variant: 'success' });
    } catch {
      /* patchLibraryMutation onError */
    }
  };

  const installVersionOptions = useMemo(
    () => buildInstallVersionOptionsForPluginItems(libraryItems, wpInfo?.version),
    [libraryItems, wpInfo?.version],
  );

  const handleDeleteUploadedVersion = (item: LibraryItem) => {
    const isOfficial = item.source === LibraryItemSource.Official;
    const isRemote = item.source === LibraryItemSource.Remote;
    if (!isOfficial && !isRemote && !item.s3Path) return;
    let msg = isOfficial
      ? `Remove WordPress.org pin ${item.version === 'latest' ? '(latest)' : item.version}?`
      : isRemote
        ? `Remove remote version ${item.version}?`
        : `Delete uploaded version ${item.version}? This will remove files from storage.`;
    if (isLastLibraryRowForSlugAndType(item, allLibraryItems)) {
      const lines = buildMembershipDeleteWarningLines(
        getLibraryItemSlug(item),
        item.type,
        families,
        collections,
      );
      if (lines.length) {
        msg += `\n\nThis is the last library row for this slug and type. It is still listed in:\n${lines.join('\n')}\n\nContinue?`;
      }
    }
    if (!window.confirm(msg)) return;
    deleteLibraryMutation.mutate(item.$id);
  };

  const handleRemoveFromLibrary = async () => {
    const lines = buildMembershipDeleteWarningLines(
      pluginSlug,
      LibraryItemType.Plugin,
      families,
      collections,
    );
    let msg = `Remove "${displayName}" completely from your library?`;
    if (lines.length) {
      msg += `\n\nThis slug is referenced in:\n${lines.join('\n')}\n\nContinue?`;
    }
    if (!window.confirm(msg)) return;
    for (const item of libraryItems) {
      await deleteLibraryMutation.mutateAsync(item.$id);
    }
    onBack();
  };

  const getDefaultVersionInfo = (): InstallVersionInfo | null =>
    resolveDefaultInstallInfoForPlugin(libraryItems, defaultVersion, wpInfo, wpVersionList);

  const hasRunnableInstallOption = useMemo(() => {
    if (installVersionOptions.some((o) => installLibraryVersionInfoIsRunnable(o.info))) return true;
    return installLibraryVersionInfoIsRunnable(
      resolveDefaultInstallInfoForPlugin(libraryItems, defaultVersion, wpInfo, wpVersionList),
    );
  }, [installVersionOptions, defaultVersion, libraryItems, wpInfo, wpVersionList]);

  const openInstallModal = React.useCallback((initialBulkVersionKey?: string | null) => {
    setInstallInitialBulkKey(initialBulkVersionKey ?? null);
    setInstallModalOpen(true);
  }, []);

  const versionRows = useMemo((): LibraryVersionRow[] => {
    const rows: LibraryVersionRow[] = [];
    officialItems.forEach((item) => {
      const versionLabel = item.version === 'latest' ? (wpInfo?.version ?? 'latest') : item.version;
      rows.push({
        rowId: `official-${item.$id}`,
        kind: 'official',
        versionLabel,
        item,
        detailsText: 'Pinned version',
      });
    });
    localItems.forEach((item) => {
      rows.push({
        rowId: `local-${item.$id}`,
        kind: 'local',
        versionLabel: item.version,
        item,
        detailsText: 'Local ZIP',
      });
    });
    remoteItems.forEach((item) => {
      rows.push({
        rowId: `remote-${item.$id}`,
        kind: 'remote',
        versionLabel: item.version,
        item,
        detailsText: item.remoteUrl
          ? item.remoteUrl.length > 35
            ? `${item.remoteUrl.slice(0, 35)}…`
            : item.remoteUrl
          : '—',
        remoteUrl: item.remoteUrl,
      });
    });
    return rows;
  }, [officialItems, localItems, remoteItems, wpInfo?.version]);

  const versionsTable = useMemo(() => {
    const explicitDefaultItem = libraryItems.find((i) => i.isDefault === true);
    const columns = [
      {
        Header: 'Default',
        accessor: 'rowId',
        id: 'defaultCheckbox',
        width: '10%',
        disableSortBy: true,
        Cell: ({ row }: { row: { original: LibraryVersionRow & { _actions: string } } }) => {
          const r = row.original;
          if (r.kind === 'official' && r.item) {
            const official = r.item;
            const resolved = official.version === 'latest' ? wpInfo?.version : official.version;
            const checked =
              explicitDefaultItem != null
                ? explicitDefaultItem.$id === official.$id
                : defaultVersion === resolved;
            return (
              <Checkbox
                size="small"
                checked={!!checked}
                disabled={setLibraryDefaultMutation.isPending}
                onChange={() => {
                  const v = official.version === 'latest' ? wpInfo?.version : official.version;
                  if (v) setDefaultVersion(v);
                  setLibraryDefaultMutation.mutate({
                    defaultItemId: official.$id,
                    itemIds: libraryItems.map((i) => i.$id),
                  });
                }}
              />
            );
          }
          if (r.item) {
            const checked =
              explicitDefaultItem != null
                ? explicitDefaultItem.$id === r.item.$id
                : defaultVersion === r.item.version;
            return (
              <Checkbox
                size="small"
                checked={!!checked}
                disabled={setLibraryDefaultMutation.isPending}
                onChange={() => {
                  setDefaultVersion(r.item!.version);
                  setLibraryDefaultMutation.mutate({
                    defaultItemId: r.item!.$id,
                    itemIds: libraryItems.map((i) => i.$id),
                  });
                }}
              />
            );
          }
          return null;
        },
      },
      {
        Header: 'Version',
        accessor: 'versionLabel',
        width: '40%',
        disableSortBy: true,
        Cell: ({ row }: { row: { original: LibraryVersionRow } }) => (
          <VersionTableSiteStyle versionLabel={row.original.versionLabel} />
        ),
      },
      {
        Header: 'Source',
        accessor: 'kind',
        width: '18%',
        disableSortBy: true,
        Cell: ({ row }: { row: { original: LibraryVersionRow } }) => {
          const k = row.original.kind;
          if (k === 'official') {
            return (
              <SoftBox
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  background: infoGradient,
                  color: '#fff',
                  fontSize: '0.7rem',
                }}
              >
                <Icon sx={{ fontSize: 14 }}>cloud_download</Icon>
                WordPress.org
              </SoftBox>
            );
          }
          if (k === 'local') {
            return (
              <SoftBox
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: 'grey.200',
                  fontSize: '0.7rem',
                }}
              >
                <Icon sx={{ fontSize: 14 }}>folder</Icon>
                Uploaded
              </SoftBox>
            );
          }
          return (
            <SoftBox
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'grey.200',
                fontSize: '0.7rem',
              }}
            >
              <Icon sx={{ fontSize: 14 }}>link</Icon>
              Remote
            </SoftBox>
          );
        },
      },
      {
        Header: 'Details',
        accessor: 'detailsText',
        width: '22%',
        disableSortBy: true,
        Cell: ({ row }: { row: { original: LibraryVersionRow } }) => {
          const r = row.original;
          return (
            <Tooltip title={r.remoteUrl ?? ''} disableHoverListener={!r.remoteUrl}>
              <SoftTypography
                variant="caption"
                color="secondary"
                sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}
              >
                {r.detailsText}
              </SoftTypography>
            </Tooltip>
          );
        },
      },
      {
        Header: 'Actions',
        accessor: '_actions',
        id: 'actions',
        width: '12%',
        align: 'right' as const,
        disableSortBy: true,
        Cell: ({ row }: { row: { original: LibraryVersionRow } }) => {
          const r = row.original;
          if (r.kind === 'official' && r.item) {
            return (
              <SoftBox display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                <LibraryVersionsActionButton
                  icon="download"
                  title="Install this version on sites"
                  color="success"
                  onClick={() => openInstallModal(`official-${r.item!.$id}`)}
                />
                <LibraryVersionsActionButton
                  icon="delete"
                  title="Remove this WordPress.org pin"
                  color="error"
                  onClick={() => handleDeleteUploadedVersion(r.item!)}
                  disabled={deleteLibraryMutation.isPending}
                />
              </SoftBox>
            );
          }
          if (r.kind === 'local' && r.item) {
            return (
              <SoftBox display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                <LibraryVersionsActionButton icon="download" title="Install from library (coming soon)" disabled />
                <LibraryVersionsActionButton
                  icon="delete"
                  title="Delete this version"
                  color="error"
                  onClick={() => handleDeleteUploadedVersion(r.item!)}
                  disabled={deleteLibraryMutation.isPending}
                />
              </SoftBox>
            );
          }
          if (r.kind === 'remote' && r.item) {
            return (
              <SoftBox display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                <LibraryVersionsActionButton
                  icon="download"
                  title="Install this version on sites"
                  color="success"
                  onClick={() => r.item && openInstallModal(`remote-${r.item.$id}`)}
                  disabled={!r.item?.remoteUrl}
                />
                <LibraryVersionsActionButton
                  icon="delete"
                  title="Delete this version"
                  color="error"
                  onClick={() => handleDeleteUploadedVersion(r.item!)}
                  disabled={deleteLibraryMutation.isPending}
                />
              </SoftBox>
            );
          }
          return null;
        },
      },
    ];

    const rows = versionRows.map((vr) => ({
      ...vr,
      _actions: vr.rowId,
    }));

    return { columns, rows };
  }, [
    versionRows,
    defaultVersion,
    wpInfo?.version,
    libraryItems,
    deleteLibraryMutation.isPending,
    setLibraryDefaultMutation,
    openInstallModal,
    handleDeleteUploadedVersion,
  ]);

  const sitePluginRows = useMemo(
    (): SitePluginManagementRow[] =>
      sitesWithPlugin.map(({ site, pluginFile, installedVersion, pluginActive }) => ({
        rowKey: site.$id,
        siteId: site.$id,
        siteName: site.siteName ?? site.$id,
        pluginFile,
        installedVersion,
        pluginActive,
      })),
    [sitesWithPlugin],
  );

  const sitesManagementTable = useMemo(() => {
    const nSites = sitesWithPlugin.length;
    const allSitesSelected = nSites > 0 && selectedSiteIds.size === nSites;
    const someSitesSelected = selectedSiteIds.size > 0 && !allSitesSelected;

    const columns = [
      {
        Header: () => (
          <SoftBox display="inline-flex" alignItems="center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              size="small"
              indeterminate={someSitesSelected}
              checked={allSitesSelected}
              onChange={toggleAllSites}
              disabled={nSites === 0}
              inputProps={{ 'aria-label': allSitesSelected ? 'Deselect all sites' : 'Select all sites' }}
            />
          </SoftBox>
        ),
        accessor: 'rowKey',
        id: 'selectCol',
        width: '10%',
        disableSortBy: true,
        Cell: ({ row }: { row: { original: SitePluginManagementRow & { _actions: string } } }) => {
          const r = row.original;
          return (
            <SoftBox onClick={(e) => e.stopPropagation()} display="inline-flex">
              <Checkbox
                size="small"
                checked={selectedSiteIds.has(r.siteId)}
                onChange={() => toggleSiteSelection(r.siteId)}
              />
            </SoftBox>
          );
        },
      },
      {
        Header: 'Site',
        accessor: 'siteName',
        width: '36%',
        disableSortBy: true,
        Cell: ({ row }: { row: { original: SitePluginManagementRow } }) => (
          <SoftBox component="span" onClick={(e) => e.stopPropagation()}>
            <Link to={`/sites/${row.original.siteId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <SoftTypography variant="button" fontWeight="medium" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                {row.original.siteName}
              </SoftTypography>
            </Link>
          </SoftBox>
        ),
      },
      {
        Header: 'Version',
        accessor: 'installedVersion',
        width: '18%',
        disableSortBy: true,
      },
      {
        Header: 'Change version',
        accessor: 'siteId',
        id: 'changeVersion',
        width: '26%',
        disableSortBy: true,
        Cell: ({ row }: { row: { original: SitePluginManagementRow } }) => {
          const r = row.original;
          const rawSelected =
            siteVersionSelect[r.siteId] ??
            defaultChangeVersionMenuKeyForInstalled(
              r.installedVersion,
              wpVersionList,
              localItems,
              remoteItems,
            );
          const selectedMenuKey = changeVersionMenuItemKeys.has(rawSelected)
            ? rawSelected
            : SITE_CHANGE_VERSION_PLACEHOLDER;
          const selectedVer = resolveVersionFromChangeMenuKey(
            selectedMenuKey,
            localItems,
            remoteItems,
          );
          const selectedLocalItem = selectedMenuKey.startsWith(CVK_LO)
            ? localItems.find((x) => x.$id === selectedMenuKey.slice(CVK_LO.length))
            : undefined;
          const selectedRemoteItem = selectedMenuKey.startsWith(CVK_RE)
            ? remoteItems.find((x) => x.$id === selectedMenuKey.slice(CVK_RE.length))
            : undefined;
          const hasConcreteTarget =
            selectedVer &&
            selectedVer !== SITE_CHANGE_VERSION_PLACEHOLDER &&
            selectableVersionsForSites.has(selectedVer);
          const canInstallWp =
            hasConcreteTarget &&
            selectedVer !== r.installedVersion &&
            wpVersionList.includes(selectedVer);
          const canInstallLocal =
            hasConcreteTarget &&
            selectedVer !== r.installedVersion &&
            !!selectedLocalItem;
          const canInstallRemote =
            hasConcreteTarget &&
            selectedVer !== r.installedVersion &&
            !!selectedRemoteItem?.remoteUrl;
          const resetSelectAfterAction = () => {
            setSiteVersionSelect((p) => ({
              ...p,
              [r.siteId]: defaultChangeVersionMenuKeyForInstalled(
                r.installedVersion,
                wpVersionList,
                localItems,
                remoteItems,
              ),
            }));
          };
          return (
            <SoftBox display="flex" flexWrap="wrap" alignItems="center" gap={0.5}>
              <Select
                size="small"
                value={selectedMenuKey}
                onChange={(e) =>
                  setSiteVersionSelect((p) => ({ ...p, [r.siteId]: e.target.value as string }))
                }
                displayEmpty
                renderValue={(k) => {
                  if (k === SITE_CHANGE_VERSION_PLACEHOLDER) return 'change to:';
                  const v = resolveVersionFromChangeMenuKey(k, localItems, remoteItems);
                  if (v === SITE_CHANGE_VERSION_PLACEHOLDER) return 'change to:';
                  if (k.startsWith(CVK_WP)) return v;
                  if (k.startsWith(CVK_LO)) return `${v} (local)`;
                  if (k.startsWith(CVK_RE)) return `${v} (remote)`;
                  return v;
                }}
                sx={{
                  minWidth: 120,
                  color: 'text.primary',
                  '& .MuiOutlinedInput-root': { color: 'text.primary' },
                  '& .MuiSelect-select': {
                    color: 'text.primary',
                  },
                  '& .MuiSelect-icon': {
                    color: 'text.secondary',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      '& .MuiMenuItem-root': { color: 'text.primary' },
                      '& .MuiMenuItem-root.Mui-selected': {
                        color: 'text.primary',
                        bgcolor: 'action.selected',
                      },
                    },
                  },
                }}
              >
                <MenuItem value={SITE_CHANGE_VERSION_PLACEHOLDER}>
                  change to:
                </MenuItem>
                {wpVersionList.map((v) => {
                  const mk = changeVersionMenuKeyWp(v);
                  return (
                    <MenuItem key={mk} value={mk}>
                      {v}
                    </MenuItem>
                  );
                })}
                {localItems.map((item) => {
                  const mk = changeVersionMenuKeyLocal(item.$id);
                  return (
                    <MenuItem key={mk} value={mk}>
                      {item.version} (local)
                    </MenuItem>
                  );
                })}
                {remoteItems.map((item) => {
                  const mk = changeVersionMenuKeyRemote(item.$id);
                  return (
                    <MenuItem key={mk} value={mk}>
                      {item.version} (remote)
                    </MenuItem>
                  );
                })}
              </Select>
              {canInstallWp && (
                <SoftButton
                  size="small"
                  variant="text"
                  color="info"
                  onClick={() => {
                    handleInstallVersion(r.siteId, r.pluginFile, selectedVer!, r.siteName);
                    resetSelectAfterAction();
                  }}
                  disabled={installVersionMutation.isPending}
                >
                  Install
                </SoftButton>
              )}
              {canInstallLocal && (
                <Tooltip title="Install from library requires backend support">
                  <span>
                    <SoftButton size="small" variant="text" color="info" disabled>
                      Install (soon)
                    </SoftButton>
                  </span>
                </Tooltip>
              )}
              {canInstallRemote && selectedRemoteItem?.remoteUrl && (
                <SoftButton
                  size="small"
                  variant="text"
                  color="info"
                  onClick={() => {
                    installFromZipMutation.mutate({
                      siteId: r.siteId,
                      pluginFile: r.pluginFile,
                      zipUrl: selectedRemoteItem.remoteUrl!,
                      pluginName: displayName,
                      siteDisplayName: r.siteName,
                    });
                    resetSelectAfterAction();
                  }}
                  disabled={installFromZipMutation.isPending}
                >
                  Install
                </SoftButton>
              )}
            </SoftBox>
          );
        },
      },
      {
        Header: 'Actions',
        accessor: '_actions',
        id: 'siteActions',
        width: '12%',
        align: 'right' as const,
        disableSortBy: true,
        Cell: ({ row }: { row: { original: SitePluginManagementRow } }) => {
          const r = row.original;
          return (
            <SoftBox display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
              <LibraryVersionsActionButton
                icon="delete"
                title="Uninstall"
                color="error"
                onClick={() => handleUninstall(r.siteId, r.pluginFile)}
              />
              <LibraryVersionsActionButton
                icon="system_update"
                title="Update from WordPress.org"
                color="success"
                onClick={() => handleUpdate(r.siteId, r.pluginFile)}
                disabled={!wpInfo?.version || wpInfoLoading}
              />
            </SoftBox>
          );
        },
      },
    ];

    const rows = sitePluginRows.map((r) => ({
      ...r,
      _actions: r.rowKey,
    }));

    return { columns, rows };
  }, [
    sitePluginRows,
    siteVersionSelect,
    selectedSiteIds,
    selectableVersionsForSites,
    changeVersionMenuItemKeys,
    wpVersionList,
    localItems,
    remoteItems,
    displayName,
    wpInfo?.version,
    wpInfoLoading,
    toggleSiteSelection,
    toggleAllSites,
    sitesWithPlugin.length,
    handleInstallVersion,
    handleUninstall,
    handleUpdate,
    installVersionMutation.isPending,
    installFromZipMutation.isPending,
  ]);

  return (
    <SoftBox sx={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', px: 3, pb: 2 }}>
      <SoftBox display="flex" alignItems="center" mb={2} flexShrink={0}>
        <SoftButton variant="text" size="small" onClick={onBack}>
          <Icon sx={{ mr: 0.5 }}>arrow_back</Icon> Back to library
        </SoftButton>
      </SoftBox>

      <InstallOnSitesModal
        open={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        pluginSlug={pluginSlug}
        displayName={displayName}
        defaultInstallInfo={getDefaultVersionInfo()}
        versionOptions={installVersionOptions}
        initialBulkVersionKey={installInitialBulkKey}
        familyBlocks={familyInstallBlocks}
      />

      <PinVersionsFromWpModal
        open={pinVersionsModalOpen}
        onClose={() => setPinVersionsModalOpen(false)}
        pluginSlug={pluginSlug}
        displayName={displayName}
      />
      <AddRemoteUrlModal
        open={addRemoteModalOpen}
        onClose={() => setAddRemoteModalOpen(false)}
        existingPluginSlug={pluginSlug}
        existingPluginName={displayName}
      />

      <SoftBox
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'grid',
          columnGap: { xs: 0, lg: 3 },
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 8fr) minmax(0, 4fr)' },
          gridTemplateRows: { xs: 'auto auto minmax(0, 1fr)', lg: 'auto minmax(0, 1fr)' },
          gridTemplateAreas: {
            xs: '"tabs" "card" "sidebar"',
            lg: '"tabs tabGap" "card sidebar"',
          },
        }}
      >
        <SoftBox sx={{ gridArea: 'tabs', ...libraryMagicTabStripWrapperSx }}>
          <TabNavList
            variant="library"
            items={PLUGIN_DETAIL_MANAGEMENT_TABS}
            value={managementTab}
            onChange={(_, v) => setManagementTab(v)}
          />
        </SoftBox>
        <SoftBox sx={{ gridArea: 'tabGap', display: { xs: 'none', lg: 'block' } }} />
        {/* Left column: white card — tabs only above this column */}
        <SoftBox sx={{ gridArea: 'card', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', minWidth: 0 }}>
          <Card sx={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', bgcolor: 'background.paper', boxShadow: 1 }}>
            <SoftBox sx={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <SoftBox
              sx={{
                flex: '1 1 0%',
                minHeight: 0,
                height: 0,
                overflow: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                px: 3,
                pb: 3,
              }}
            >
              <TabNavPanel value={managementTab} index={0}>
                {/* Plugin management: Versions table + WP.org pin section */}
                <SoftBox display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={0.5}>
                  <SoftTypography variant="button" color="secondary" fontWeight="bold">
                    Versions
                  </SoftTypography>
                  <SoftButton
                    variant="text"
                    color="info"
                    size="small"
                    startIcon={<Icon sx={{ fontSize: 22 }}>add_circle</Icon>}
                    onClick={() => setAddVersionModalOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={addVersionModalOpen}
                    sx={{ fontWeight: 600, flexShrink: 0 }}
                  >
                    Add version
                  </SoftButton>
                </SoftBox>
                <SoftTypography variant="caption" color="secondary" display="block" mb={1}>
                  Pinned (WordPress.org), uploaded, and remote versions. Check a version to set as default.
                </SoftTypography>

                <AddPluginVersionModal
                  open={addVersionModalOpen}
                  onClose={() => setAddVersionModalOpen(false)}
                  pluginDisplayName={decodeHtmlEntities(displayName)}
                  onPinFromWordPressOrg={() => setPinVersionsModalOpen(true)}
                  onUploadZip={() => uploadInputRef.current?.click()}
                  onRemoteUrl={() => setAddRemoteModalOpen(true)}
                />
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".zip"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && (f.name.endsWith('.zip') || f.name.endsWith('.ZIP'))) {
                      uploadMutation.mutate(
                        { file: f, type: LibraryItemType.Plugin, wpSlug: pluginSlug },
                        { onSettled: () => { e.target.value = ''; } }
                      );
                    }
                  }}
                />

                {/* Versions table – same DataTable as /sites list */}
                {libraryItems.length === 0 ? (
                  <SoftBox py={3} textAlign="center" mb={2}>
                    <SoftTypography variant="caption" color="secondary">
                      No versions yet. Use Add version to pin from WordPress.org, upload a ZIP, or add a remote URL.
                    </SoftTypography>
                  </SoftBox>
                ) : (
                  <SoftBox pt={2} pr={2} pb={2} pl={1} sx={{ mb: 2 }}>
                    <DataTable
                      table={versionsTable}
                      entriesPerPage={{ defaultValue: 10, entries: [5, 10, 15, 20, 25] }}
                      canSearch
                      headerColor="#4F5482"
                      showTotalEntries
                    />
                  </SoftBox>
                )}

              </TabNavPanel>

              <TabNavPanel value={managementTab} index={1}>
                {/* Site management – same DataTable layout as plugin versions */}
                <SoftTypography variant="button" color="secondary" fontWeight="bold" gutterBottom>
                  Site management
                </SoftTypography>
                <SoftTypography variant="caption" color="secondary" display="block" mb={1}>
                  Sites where this plugin is installed
                </SoftTypography>
                {sitesWithPlugin.length === 0 ? (
                  <SoftTypography variant="caption" color="secondary">
                    Not installed on any site.
                  </SoftTypography>
                ) : (
                  <>
                    <SoftBox pt={2} pr={2} pb={2} pl={1} sx={{ mb: 1 }}>
                      <DataTable
                        table={sitesManagementTable}
                        entriesPerPage={{ defaultValue: 10, entries: [5, 10, 15, 20, 25] }}
                        canSearch
                        headerColor="#4F5482"
                        showTotalEntries
                      />
                    </SoftBox>
                    <SoftBox display="flex" flexWrap="wrap" gap={1.5} alignItems="center" pl={1} pr={2} pb={2}>
                      <Tooltip
                        title={
                          siteBulkAction
                            ? `Action: ${
                                siteBulkAction === 'uninstall'
                                  ? 'Uninstall'
                                  : siteBulkAction === 'update'
                                    ? 'Update from WordPress.org'
                                    : siteBulkAction === 'activate'
                                      ? 'Activate'
                                      : 'Deactivate'
                              }`
                            : 'Choose bulk action'
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            onClick={(e) => setBulkMenuAnchor(e.currentTarget)}
                            disabled={sitesWithPlugin.length === 0}
                            aria-label="Bulk actions"
                            aria-haspopup="true"
                            aria-expanded={Boolean(bulkMenuAnchor)}
                            sx={iconButtonOnLightSurfaceSx}
                          >
                            <Icon sx={{ fontSize: 18 }}>more_vert</Icon>
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Menu
                        anchorEl={bulkMenuAnchor}
                        open={Boolean(bulkMenuAnchor)}
                        onClose={() => setBulkMenuAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        PaperProps={{
                          sx: { minWidth: 220, zIndex: (t) => t.zIndex.modal },
                        }}
                      >
                        <MenuItem
                          onClick={() => {
                            setSiteBulkAction('uninstall');
                            setBulkMenuAnchor(null);
                          }}
                        >
                          Uninstall plugin
                        </MenuItem>
                        <MenuItem
                          disabled={wpVersionList.length === 0 || wpInfoLoading}
                          onClick={() => {
                            setSiteBulkAction('update');
                            setBulkMenuAnchor(null);
                          }}
                        >
                          Update from WordPress.org
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            setSiteBulkAction('activate');
                            setBulkMenuAnchor(null);
                          }}
                        >
                          Activate plugin
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            setSiteBulkAction('deactivate');
                            setBulkMenuAnchor(null);
                          }}
                        >
                          Deactivate plugin
                        </MenuItem>
                      </Menu>
                      <SoftButton
                        variant="gradient"
                        color="info"
                        size="small"
                        onClick={executeSiteBulkAction}
                        disabled={
                          !siteBulkAction ||
                          selectedSiteIds.size === 0 ||
                          deletePluginMutation.isPending ||
                          updatePluginMutation.isPending ||
                          togglePluginMutation.isPending
                        }
                      >
                        Run on {selectedSiteIds.size} site(s)
                      </SoftButton>
                    </SoftBox>
                  </>
                )}
              </TabNavPanel>
            </SoftBox>
            </SoftBox>
          </Card>
        </SoftBox>

        {/* Right column: plugin info (aligned with white card, not tab row) */}
        <SoftBox sx={{ gridArea: 'sidebar', pr: { lg: 4 }, minHeight: 0 }} display="flex" flexDirection="column" gap={2}>
          <LibraryPluginSidebar
            displayName={displayName}
            descriptionText={descriptionText ? decodeHtmlEntities(descriptionText.slice(0, 1200) + (descriptionText.length > 1200 ? '…' : '')) : 'No description available.'}
            defaultVersion={defaultVersion || currentLibraryVersion}
            latestKnownVersion={wpInfoLoading ? '…' : latestKnownVersion}
            displayAuthor={displayAuthor || '-'}
            authorUrl={authorUrl}
            onRemove={handleRemoveFromLibrary}
            onInstall={() => openInstallModal(null)}
            installDisabled={!hasRunnableInstallOption}
            onAddToCollection={() => setAddToCollectionModalOpen(true)}
          />
          {(familiesForThisPlugin.length > 0 || collectionsForThisPlugin.length > 0) && (
            <Card
              sx={{
                p: 2,
                background: infoGradient,
                color: 'white',
                boxShadow: '6px 6px 14px rgba(0,0,0,0.25), -3px -3px 8px rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                '& .MuiTypography-root': { color: 'white !important' },
              }}
            >
              <SoftTypography variant="button" fontWeight="bold" display="block" mb={1}>
                Membership
              </SoftTypography>
              {familiesForThisPlugin.length > 0 && (
                <SoftBox mb={collectionsForThisPlugin.length ? 1.5 : 0}>
                  <SoftTypography variant="caption" sx={{ opacity: 0.9 }} display="block" mb={0.5}>
                    Item families
                  </SoftTypography>
                  <SoftBox display="flex" flexDirection="column" gap={0.5}>
                    {familiesForThisPlugin.map((f) => (
                      <SoftTypography key={f.$id} variant="caption">
                        <Link
                          to={`${ROUTE_PATHS.LIBRARY_FAMILIES}/${encodeURIComponent(f.$id)}`}
                          style={{ color: 'inherit', textDecoration: 'underline' }}
                        >
                          {f.name?.trim() || f.memberSlugs.join(', ') || 'Untitled family'}
                        </Link>
                      </SoftTypography>
                    ))}
                  </SoftBox>
                </SoftBox>
              )}
              {collectionsForThisPlugin.length > 0 && (
                <SoftBox>
                  <SoftTypography variant="caption" sx={{ opacity: 0.9 }} display="block" mb={0.5}>
                    Collections
                  </SoftTypography>
                  <SoftBox display="flex" flexDirection="column" gap={0.5}>
                    {collectionsForThisPlugin.map((c) => (
                      <SoftTypography key={c.$id} variant="caption">
                        <Link
                          to={`${ROUTE_PATHS.LIBRARY}?tab=2&collection=${encodeURIComponent(c.$id)}`}
                          style={{ color: 'inherit', textDecoration: 'underline' }}
                        >
                          {c.name}
                        </Link>
                      </SoftTypography>
                    ))}
                  </SoftBox>
                </SoftBox>
              )}
            </Card>
          )}
          {libraryItems.length > 0 && (
            <LibraryPluginTagsCard
              tags={mergedLibraryTags}
              onSaveTags={handleSavePluginTags}
              savingTags={patchLibraryMutation.isPending}
            />
          )}
        </SoftBox>
      </SoftBox>

      <AddPluginToCollectionModal
        open={addToCollectionModalOpen}
        onClose={() => setAddToCollectionModalOpen(false)}
        pluginSlug={pluginSlug}
        displayName={displayName}
      />
    </SoftBox>
  );
};

export default LibraryPluginDetailView;
