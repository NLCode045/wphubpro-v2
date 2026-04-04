/**
 * Install multiple library plugins/themes on selected sites (sequential installs).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Checkbox from '@mui/material/Checkbox';
import Icon from '@mui/material/Icon';
import Tooltip from '@mui/material/Tooltip';
import { useQueries } from '@tanstack/react-query';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import DataTable from 'examples/Tables/DataTable';

import { useSites } from '../../domains/sites';
import {
  pickDefaultVersionStringForPluginItems,
  resolveDefaultInstallInfoForPlugin,
  splitPluginItemsBySource,
} from '../../domains/library';
import { getLibraryZipHttpsUrl } from '../../domains/library/libraryZipUrl';
import { getWpPluginInfo, WpPluginInfo } from '../../services/wordpress';
import {
  useInstallPluginFromZipUrl,
  useInstallPluginVersion,
  useInstallThemeFromZipUrl,
} from '../../hooks/useWordPress';
import { InstallVersionInfo, LibraryItem, Site } from '../../types';
import { SiteCell, StatusIcon, HealthScoreBadge, formatHeartbeatRelative } from '../sites/SitesTableCells';
import { installLibraryVersionInfoIsRunnable } from './InstallOnSitesModal';

export type BulkInstallEntry =
  | { kind: 'plugin'; slug: string; displayName: string; items: LibraryItem[] }
  | { kind: 'theme'; item: LibraryItem; displayName: string };

interface LibraryBulkInstallModalProps {
  open: boolean;
  onClose: () => void;
  entries: BulkInstallEntry[];
}

const defaultPluginFile = (slug: string) => `${slug}/${slug}.php`;

function wpVersionListFromInfo(wp: WpPluginInfo | null | undefined): string[] {
  if (!wp?.versions) return [];
  return Object.keys(wp.versions)
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
    });
}

const LibraryBulkInstallModal: React.FC<LibraryBulkInstallModalProps> = ({ open, onClose, entries }) => {
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());
  const { data: sites = [] } = useSites();
  const installVersionMutation = useInstallPluginVersion(undefined);
  const installFromZipMutation = useInstallPluginFromZipUrl(undefined);
  const installThemeZipMutation = useInstallThemeFromZipUrl(undefined);

  const connectedSites = sites.filter((s) => s.status === 'connected');

  const pluginSlugs = useMemo(
    () => entries.filter((e): e is Extract<BulkInstallEntry, { kind: 'plugin' }> => e.kind === 'plugin').map((e) => e.slug),
    [entries],
  );

  const wpQueries = useQueries({
    queries: pluginSlugs.map((slug) => ({
      queryKey: ['wpPluginInfo', slug],
      queryFn: () => getWpPluginInfo(slug),
      enabled: open && pluginSlugs.length > 0,
      staleTime: 1000 * 60 * 10,
    })),
  });

  const wpBySlug = useMemo(() => {
    const m = new Map<string, WpPluginInfo | null>();
    pluginSlugs.forEach((slug, i) => {
      m.set(slug.toLowerCase(), wpQueries[i]?.data ?? null);
    });
    return m;
  }, [pluginSlugs, wpQueries.map((q) => q.dataUpdatedAt).join(','), wpQueries.map((q) => q.data?.version).join(',')]);

  useEffect(() => {
    if (!open) {
      setSelectedSiteIds(new Set());
    }
  }, [open]);

  const toggleSite = useCallback((siteId: string) => {
    setSelectedSiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedSiteIds((prev) => {
      if (prev.size === connectedSites.length && connectedSites.length > 0) return new Set();
      return new Set(connectedSites.map((s) => s.$id));
    });
  }, [connectedSites]);

  const installPluginOnSite = async (
    siteId: string,
    siteDisplayName: string,
    slug: string,
    displayName: string,
    items: LibraryItem[],
  ) => {
    const wpInfo = wpBySlug.get(slug.toLowerCase()) ?? null;
    const wpVersionList = wpVersionListFromInfo(wpInfo);
    const defaultVersionStr = pickDefaultVersionStringForPluginItems(items, wpInfo, wpVersionList);
    const info: InstallVersionInfo | null = resolveDefaultInstallInfoForPlugin(
      items,
      defaultVersionStr,
      wpInfo,
      wpVersionList,
    );
    const pluginFile = defaultPluginFile(slug);
    const { localItems } = splitPluginItemsBySource(items);

    if (installLibraryVersionInfoIsRunnable(info)) {
      if (info.source === 'official') {
        await installVersionMutation.mutateAsync({
          siteId,
          pluginFile,
          pluginName: displayName,
          version: info.version,
          siteDisplayName,
        });
        return;
      }
      if (info.source === 'remote' && info.remoteUrl) {
        await installFromZipMutation.mutateAsync({
          siteId,
          pluginFile,
          zipUrl: info.remoteUrl,
          pluginName: displayName,
          siteDisplayName,
        });
        return;
      }
    }

    if (info?.source === 'local') {
      const localItem = localItems.find((l) => l.version === info.version);
      const zipUrl = localItem ? getLibraryZipHttpsUrl(localItem) : null;
      if (zipUrl) {
        await installFromZipMutation.mutateAsync({
          siteId,
          pluginFile,
          zipUrl,
          pluginName: displayName,
          siteDisplayName,
        });
      }
      return;
    }

    for (const li of localItems) {
      const zipUrl = getLibraryZipHttpsUrl(li);
      if (zipUrl) {
        await installFromZipMutation.mutateAsync({
          siteId,
          pluginFile,
          zipUrl,
          pluginName: displayName,
          siteDisplayName,
        });
        return;
      }
    }
  };

  const installThemeOnSite = async (siteId: string, siteDisplayName: string, item: LibraryItem, displayName: string) => {
    const zipUrl = getLibraryZipHttpsUrl(item);
    if (!zipUrl) return;
    await installThemeZipMutation.mutateAsync({
      siteId,
      zipUrl,
      themeName: displayName,
      siteDisplayName,
    });
  };

  const handleInstall = async () => {
    if (selectedSiteIds.size === 0 || entries.length === 0) return;
    const toRun = connectedSites.filter((s) => selectedSiteIds.has(s.$id));
    for (const site of toRun) {
      const siteDisplayName = site.siteName || site.siteUrl || site.$id;
      for (const entry of entries) {
        if (entry.kind === 'plugin') {
          await installPluginOnSite(site.$id, siteDisplayName, entry.slug, entry.displayName, entry.items);
        } else {
          await installThemeOnSite(site.$id, siteDisplayName, entry.item, entry.displayName);
        }
      }
    }
    setSelectedSiteIds(new Set());
    onClose();
  };

  const canResolveEntry = (entry: BulkInstallEntry): boolean => {
    if (entry.kind === 'theme') {
      return !!getLibraryZipHttpsUrl(entry.item);
    }
    const wpInfo = wpBySlug.get(entry.slug.toLowerCase()) ?? null;
    const wpVersionList = wpVersionListFromInfo(wpInfo);
    const defaultVersionStr = pickDefaultVersionStringForPluginItems(entry.items, wpInfo, wpVersionList);
    const info: InstallVersionInfo | null = resolveDefaultInstallInfoForPlugin(
      entry.items,
      defaultVersionStr,
      wpInfo,
      wpVersionList,
    );
    const infoBeforeRunnable = info;
    const runnable = installLibraryVersionInfoIsRunnable(info);
    if (runnable) return true;
    if (infoBeforeRunnable?.source === 'local') {
      const { localItems } = splitPluginItemsBySource(entry.items);
      const localItem = localItems.find((l) => l.version === infoBeforeRunnable.version);
      if (localItem && getLibraryZipHttpsUrl(localItem)) return true;
    }
    const { localItems } = splitPluginItemsBySource(entry.items);
    return localItems.some((li) => !!getLibraryZipHttpsUrl(li));
  };

  const allResolvable = entries.length > 0 && entries.every(canResolveEntry);
  const wpLoading = wpQueries.some((q) => q.isLoading);

  const isPending =
    installVersionMutation.isPending || installFromZipMutation.isPending || installThemeZipMutation.isPending;

  const sitesTable = useMemo(() => {
    const columns = [
      {
        Header: (
          <Checkbox
            size="small"
            checked={connectedSites.length > 0 && selectedSiteIds.size === connectedSites.length}
            indeterminate={selectedSiteIds.size > 0 && selectedSiteIds.size < connectedSites.length}
            onChange={() => toggleAll()}
            inputProps={{ 'aria-label': 'Select all sites' }}
          />
        ),
        accessor: 'siteId',
        id: 'selectCol',
        width: '48px',
        disableSortBy: true,
        Cell: ({ row }: { row: { original: { siteId: string } } }) => {
          const id = row.original.siteId;
          return (
            <Checkbox
              size="small"
              checked={selectedSiteIds.has(id)}
              onChange={() => toggleSite(id)}
              inputProps={{ 'aria-label': 'Select site' }}
            />
          );
        },
      },
      {
        Header: 'Site',
        accessor: 'site',
        width: '34%',
        Cell: ({
          value,
          row,
        }: {
          value: [string, { url: string }];
          row: { original: { siteId: string } };
        }) => (
          <SoftBox onClick={() => toggleSite(row.original.siteId)} sx={{ cursor: 'pointer' }}>
            <SiteCell value={value} siteId={row.original.siteId} linkToDetails={false} />
          </SoftBox>
        ),
      },
      {
        Header: 'Status',
        accessor: 'status',
        width: '18%',
        disableSortBy: true,
        Cell: ({
          value,
          row,
        }: {
          value: string;
          row: { original: { heartbeatAt: string } };
        }) => (
          <SoftBox display="flex" alignItems="center" gap={1}>
            <StatusIcon value={value as 'connected' | 'disconnected'} />
            <Tooltip title={row.original.heartbeatAt ? new Date(row.original.heartbeatAt).toLocaleString() : ''} placement="top">
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
        width: '14%',
        disableSortBy: true,
        Cell: ({ row }: { row: { original: { siteData: Site } } }) => <HealthScoreBadge site={row.original.siteData} />,
      },
    ];

    const rows = connectedSites.map((site) => ({
      siteId: site.$id,
      site: [site.siteName || site.siteUrl || 'Untitled', { url: site.siteUrl || '-' }] as [string, { url: string }],
      status: site.status,
      heartbeatAt:
        site.connectionStatus?.heartbeatUpdatedAt ?? (site as { heartbeatUpdatedAt?: string }).heartbeatUpdatedAt ?? '',
      health: site.healthStatus,
      siteData: site as Site,
    }));

    return { columns, rows };
  }, [connectedSites, selectedSiteIds, toggleAll, toggleSite]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Install on sites</DialogTitle>
      <DialogContent>
        <SoftTypography variant="caption" color="secondary" display="block" sx={{ mb: 1.5 }}>
          Selected items ({entries.length}):{' '}
          {entries.map((e) => e.displayName).join(', ')}
        </SoftTypography>
        {entries.some((e) => e.kind === 'plugin') && wpLoading ? (
          <SoftTypography variant="caption" color="secondary" display="block" sx={{ mb: 1 }}>
            Loading WordPress.org version data…
          </SoftTypography>
        ) : null}
        {connectedSites.length === 0 ? (
          <SoftTypography variant="caption" color="secondary">
            No connected sites.
          </SoftTypography>
        ) : (
          <SoftBox pt={1} pr={2} pb={2} pl={1}>
            <DataTable
              table={sitesTable}
              entriesPerPage={{ defaultValue: 10, entries: [5, 10, 15, 25] }}
              canSearch
              headerColor="#4F5482"
              showTotalEntries
            />
          </SoftBox>
        )}
        {!allResolvable && entries.length > 0 ? (
          <SoftTypography variant="caption" color="warning" display="block" sx={{ mt: 1 }}>
            Some items cannot be installed automatically (e.g. local ZIP without a public HTTPS URL, or unresolved
            WordPress.org version). Open the item in the library and pick a concrete version, or configure{' '}
            <code>LIBRARY_ZIP_PUBLIC_BASE_URL</code> for S3 uploads.
          </SoftTypography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <SoftButton variant="text" color="secondary" onClick={onClose}>
          Cancel
        </SoftButton>
        <SoftButton
          variant="gradient"
          color="info"
          onClick={handleInstall}
          disabled={selectedSiteIds.size === 0 || !allResolvable || isPending || wpLoading}
          startIcon={<Icon sx={{ fontSize: 18 }}>download</Icon>}
        >
          {isPending ? 'Installing…' : `Install on ${selectedSiteIds.size} site(s)`}
        </SoftButton>
      </DialogActions>
    </Dialog>
  );
};

export default LibraryBulkInstallModal;
