/**
 * Install an entire library collection on selected sites (ordered members, version default or manual per item).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Icon from '@mui/material/Icon';
import Tooltip from '@mui/material/Tooltip';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import DataTable from 'examples/Tables/DataTable';

import { useSites } from '../../domains/sites';
import {
  buildInstallVersionOptionsForPluginItems,
  filterLibraryItemsBySlugAndType,
  getLibraryZipHttpsUrl,
  pickDefaultVersionStringForPluginItems,
  resolveDefaultInstallInfoForPlugin,
} from '../../domains/library';
import { useLibraryItems } from '../../hooks/useLibrary';
import {
  useInstallPluginVersion,
  useInstallPluginFromZipUrl,
  useInstallThemeFromZipUrl,
} from '../../hooks/useWordPress';
import { getWpPluginInfo } from '../../services/wordpress';
import { useQueries } from '@tanstack/react-query';
import {
  InstallVersionInfo,
  InstallVersionOption,
  LibraryCollection,
  LibraryCollectionMember,
  LibraryItemSource,
  LibraryItemType,
  Site,
} from '../../types';
import { SiteCell, StatusIcon, HealthScoreBadge, formatHeartbeatRelative } from '../sites/SitesTableCells';
import { installLibraryVersionInfoIsRunnable } from './InstallOnSitesModal';

/** Non-empty sentinel — value="" triggers InputBase onEmpty/FormControl update loop */
const EMPTY_KEY = '__use_default__';

function memberKey(m: LibraryCollectionMember): string {
  return `${m.slug}::${m.type}`;
}

const defaultPluginFile = (slug: string) => `${slug}/${slug}.php`;

interface InstallCollectionOnSitesModalProps {
  open: boolean;
  onClose: () => void;
  collection: LibraryCollection | null;
}

type RowResolved = {
  key: string;
  slug: string;
  type: LibraryItemType;
  displayName: string;
  kind: 'plugin' | 'theme';
  versionOptions: InstallVersionOption[];
  defaultInstallInfo: InstallVersionInfo | null;
  zipUrl: string | null;
};

const InstallCollectionOnSitesModal: React.FC<InstallCollectionOnSitesModalProps> = ({
  open,
  onClose,
  collection,
}) => {
  const { data: libraryItems = [] } = useLibraryItems();
  const { data: sites = [] } = useSites();
  const installVersionMutation = useInstallPluginVersion(undefined);
  const installFromZipMutation = useInstallPluginFromZipUrl(undefined);
  const installThemeZipMutation = useInstallThemeFromZipUrl(undefined);

  const [included, setIncluded] = useState<Set<string>>(new Set());
  const [versionPickKey, setVersionPickKey] = useState<Record<string, string>>({});
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());

  const connectedSites = sites.filter((s) => s.status === 'connected');

  const members = collection?.items ?? [];
  const pluginSlugsForWp = useMemo(() => {
    const s = new Set<string>();
    members.forEach((m) => {
      if (m.type === LibraryItemType.Plugin) s.add(m.slug);
    });
    return Array.from(s);
  }, [members]);

  const wpQueries = useQueries({
    queries: pluginSlugsForWp.map((slug) => ({
      queryKey: ['wpPluginInfo', slug],
      queryFn: () => getWpPluginInfo(slug),
      enabled: open && pluginSlugsForWp.length > 0,
      staleTime: 1000 * 60 * 10,
    })),
  });

  const wpDataSignature = wpQueries.map((q) => q.dataUpdatedAt).join(',');

  const resolvedRows: RowResolved[] = useMemo(() => {
    if (!collection) return [];
    const rows: RowResolved[] = [];
    for (const m of collection.items) {
      const items = filterLibraryItemsBySlugAndType(libraryItems, m.slug, m.type);
      if (items.length === 0) continue;
      const displayName =
        items.find((i) => i.source === LibraryItemSource.Official)?.name ?? items[0].name;
      if (m.type === LibraryItemType.Plugin) {
        const idx = pluginSlugsForWp.indexOf(m.slug);
        const mi = idx >= 0 ? wpQueries[idx]?.data ?? null : null;
        const wpVersionList = mi?.versions
          ? Object.keys(mi.versions).filter((v) => v !== 'trunk')
          : [];
        const versionOptions = buildInstallVersionOptionsForPluginItems(items, mi?.version);
        const dvs = pickDefaultVersionStringForPluginItems(items, mi, wpVersionList);
        const defaultInstallInfo = resolveDefaultInstallInfoForPlugin(items, dvs, mi, wpVersionList);
        rows.push({
          key: memberKey(m),
          slug: m.slug,
          type: m.type,
          displayName,
          kind: 'plugin',
          versionOptions,
          defaultInstallInfo,
          zipUrl: null,
        });
      } else {
        const zipUrl = getLibraryZipHttpsUrl(items[0]);
        rows.push({
          key: memberKey(m),
          slug: m.slug,
          type: m.type,
          displayName,
          kind: 'theme',
          versionOptions: [],
          defaultInstallInfo: null,
          zipUrl,
        });
      }
    }
    return rows;
  }, [collection, libraryItems, pluginSlugsForWp, wpDataSignature, wpQueries]);

  useEffect(() => {
    if (!open || !collection) return;
    setIncluded(new Set(collection.items.map(memberKey)));
    const vp: Record<string, string> = {};
    for (const m of collection.items) {
      const k = memberKey(m);
      if (m.versionMode === 'manual' && m.manualVersionKey) {
        vp[k] = m.manualVersionKey;
      } else {
        vp[k] = EMPTY_KEY;
      }
    }
    setVersionPickKey(vp);
    setSelectedSiteIds(new Set());
  }, [open, collection?.$id, collection?.items]);

  const optionMaps = useMemo(() => {
    const maps = new Map<string, Map<string, InstallVersionInfo>>();
    resolvedRows.forEach((r) => {
      if (r.kind !== 'plugin') return;
      const m = new Map<string, InstallVersionInfo>();
      r.versionOptions.forEach((o) => m.set(o.key, o.info));
      maps.set(r.key, m);
    });
    return maps;
  }, [resolvedRows]);

  const resolvePluginInfoForMember = (row: RowResolved): InstallVersionInfo | null => {
    if (row.kind !== 'plugin') return null;
    const map = optionMaps.get(row.key) ?? new Map();
    const pick = versionPickKey[row.key] ?? EMPTY_KEY;
    if (pick && pick !== EMPTY_KEY) return map.get(pick) ?? null;
    return row.defaultInstallInfo;
  };

  const allRunnable = useMemo(() => {
    for (const row of resolvedRows) {
      if (!included.has(row.key)) continue;
      if (row.kind === 'plugin') {
        if (!installLibraryVersionInfoIsRunnable(resolvePluginInfoForMember(row))) return false;
      } else if (!row.zipUrl) {
        return false;
      }
    }
    return true;
  }, [resolvedRows, included, versionPickKey, optionMaps]);

  const canInstall = selectedSiteIds.size > 0 && allRunnable && included.size > 0;

  const toggleSite = useCallback((siteId: string) => {
    setSelectedSiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  }, []);

  const toggleAllSites = useCallback(() => {
    setSelectedSiteIds((prev) => {
      if (prev.size === connectedSites.length && connectedSites.length > 0) return new Set();
      return new Set(connectedSites.map((s) => s.$id));
    });
  }, [connectedSites]);

  const handleInstall = async () => {
    if (!collection || selectedSiteIds.size === 0) return;
    const sitesToRun = connectedSites.filter((s) => selectedSiteIds.has(s.$id));
    for (const site of sitesToRun) {
      const siteDisplayName = site.siteName || site.siteUrl || site.$id;
      for (const row of resolvedRows) {
        if (!included.has(row.key)) continue;
        if (row.kind === 'plugin') {
          const info = resolvePluginInfoForMember(row);
          if (!installLibraryVersionInfoIsRunnable(info)) continue;
          const pf = defaultPluginFile(row.slug);
          if (info.source === 'official') {
            await installVersionMutation.mutateAsync({
              siteId: site.$id,
              pluginFile: pf,
              pluginName: row.displayName,
              version: info.version,
              siteDisplayName,
            });
          } else if (info.source === 'remote' && info.remoteUrl) {
            await installFromZipMutation.mutateAsync({
              siteId: site.$id,
              pluginFile: pf,
              zipUrl: info.remoteUrl,
              pluginName: row.displayName,
              siteDisplayName,
            });
          }
        } else if (row.zipUrl) {
          await installThemeZipMutation.mutateAsync({
            siteId: site.$id,
            zipUrl: row.zipUrl,
            themeName: row.displayName,
            siteDisplayName,
          });
        }
      }
    }
    onClose();
  };

  const isPending =
    installVersionMutation.isPending ||
    installFromZipMutation.isPending ||
    installThemeZipMutation.isPending;

  const sitesTable = useMemo(() => {
    const columns = [
      {
        Header: (
          <Checkbox
            size="small"
            checked={connectedSites.length > 0 && selectedSiteIds.size === connectedSites.length}
            indeterminate={selectedSiteIds.size > 0 && selectedSiteIds.size < connectedSites.length}
            onChange={() => toggleAllSites()}
          />
        ),
        accessor: 'siteId',
        id: 'selectCol',
        width: '48px',
        disableSortBy: true,
        Cell: ({ row }: { row: { original: { siteId: string } } }) => (
          <Checkbox
            size="small"
            checked={selectedSiteIds.has(row.original.siteId)}
            onChange={() => toggleSite(row.original.siteId)}
          />
        ),
      },
      {
        Header: 'Site',
        accessor: 'site',
        width: '40%',
        Cell: ({ value, row }: { value: [string, { url: string }]; row: { original: { siteId: string } } }) => (
          <SoftBox onClick={() => toggleSite(row.original.siteId)} sx={{ cursor: 'pointer' }}>
            <SiteCell value={value} siteId={row.original.siteId} linkToDetails={false} />
          </SoftBox>
        ),
      },
      {
        Header: 'Status',
        accessor: 'status',
        width: '22%',
        disableSortBy: true,
        Cell: ({ value, row }: { value: string; row: { original: { heartbeatAt: string } } }) => (
          <SoftBox display="flex" alignItems="center" gap={1}>
            <StatusIcon value={value as 'connected' | 'disconnected'} />
            <Tooltip
              title={row.original.heartbeatAt ? new Date(row.original.heartbeatAt).toLocaleString('nl-NL') : ''}
              placement="top"
            >
              <SoftTypography variant="caption" color="secondary">
                {formatHeartbeatRelative(row.original.heartbeatAt)}
              </SoftTypography>
            </Tooltip>
          </SoftBox>
        ),
      },
      {
        Header: 'Health',
        accessor: 'health',
        width: '38%',
        disableSortBy: true,
        Cell: ({ row }: { row: { original: { siteData: Site } } }) => (
          <HealthScoreBadge site={row.original.siteData} />
        ),
      },
    ];

    const rows = connectedSites.map((site) => ({
      siteId: site.$id,
      site: [site.siteName || site.siteUrl || 'Untitled', { url: site.siteUrl || '-' }] as [string, { url: string }],
      status: site.status,
      heartbeatAt:
        site.connectionStatus?.heartbeatUpdatedAt ??
        (site as { heartbeatUpdatedAt?: string }).heartbeatUpdatedAt ??
        '',
      health: site.healthStatus,
      siteData: site,
    }));

    return { columns, rows };
  }, [connectedSites, selectedSiteIds, toggleAllSites, toggleSite]);

  if (!collection) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Install collection: {collection.name}</DialogTitle>
      <DialogContent>
        {connectedSites.length === 0 ? (
          <SoftTypography variant="caption" color="secondary">
            No connected sites.
          </SoftTypography>
        ) : (
          <>
            <SoftTypography variant="caption" color="secondary" display="block" sx={{ mb: 2 }}>
              Choose which items to include and versions. Installs run in list order for each selected site.
            </SoftTypography>
            {resolvedRows.map((row) => (
              <SoftBox
                key={row.key}
                display="flex"
                flexWrap="wrap"
                alignItems="center"
                gap={2}
                sx={{ mb: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'grey.50' }}
              >
                <Checkbox
                  size="small"
                  checked={included.has(row.key)}
                  onChange={() => {
                    setIncluded((prev) => {
                      const next = new Set(prev);
                      if (next.has(row.key)) next.delete(row.key);
                      else next.add(row.key);
                      return next;
                    });
                  }}
                />
                <SoftTypography variant="caption" fontWeight="bold" sx={{ minWidth: 120 }}>
                  {row.displayName}
                </SoftTypography>
                <SoftTypography variant="caption" color="secondary">
                  {row.type}
                </SoftTypography>
                {row.kind === 'plugin' && included.has(row.key) && (
                  <Select
                    size="small"
                    sx={{ minWidth: 280 }}
                    value={versionPickKey[row.key] ?? EMPTY_KEY}
                    onChange={(e) =>
                      setVersionPickKey((prev) => ({ ...prev, [row.key]: e.target.value as string }))
                    }
                    inputProps={{ 'aria-label': `Version for ${row.displayName}` }}
                  >
                    <MenuItem value={EMPTY_KEY}>
                      <SoftTypography variant="caption">Default (library)</SoftTypography>
                    </MenuItem>
                    {row.versionOptions.map((o) => (
                      <MenuItem key={o.key} value={o.key}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                )}
                {row.kind === 'theme' && included.has(row.key) && !row.zipUrl && (
                  <SoftTypography variant="caption" sx={{ color: 'warning.main' }}>
                    No HTTPS zip URL for this theme.
                  </SoftTypography>
                )}
              </SoftBox>
            ))}

            <SoftBox pt={2}>
              <SoftTypography variant="button" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                Sites
              </SoftTypography>
              <SoftBox pt={1} pr={2} pb={2} pl={1}>
                <DataTable
                  table={sitesTable}
                  entriesPerPage={{ defaultValue: 10, entries: [5, 10, 15, 25] }}
                  canSearch
                  headerColor="#4F5482"
                  showTotalEntries
                />
              </SoftBox>
            </SoftBox>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <SoftButton variant="text" color="secondary" onClick={onClose}>
          Cancel
        </SoftButton>
        <SoftButton
          variant="gradient"
          color="info"
          onClick={handleInstall}
          disabled={!canInstall || isPending}
          startIcon={<Icon sx={{ fontSize: 18 }}>download</Icon>}
        >
          {isPending ? 'Installing…' : 'Install collection'}
        </SoftButton>
      </DialogActions>
    </Dialog>
  );
};

export default InstallCollectionOnSitesModal;
