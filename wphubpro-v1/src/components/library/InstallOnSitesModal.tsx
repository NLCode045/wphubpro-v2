/**
 * Modal to select sites and bulk-install a library plugin with per-site or bulk version selection.
 * Optional family blocks install additional plugins/themes on the same sites (ordered after primary).
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
  useInstallPluginVersion,
  useInstallPluginFromZipUrl,
  useInstallThemeFromZipUrl,
} from '../../hooks/useWordPress';
import { FamilyInstallBlock, InstallVersionInfo, InstallVersionOption, Site } from '../../types';
import { SiteCell, StatusIcon, HealthScoreBadge, formatHeartbeatRelative } from '../sites/SitesTableCells';

export type { InstallVersionInfo, InstallVersionOption };

interface InstallOnSitesModalProps {
  open: boolean;
  onClose: () => void;
  pluginSlug: string;
  displayName: string;
  /** When bulk + per-site selects are empty, this version is installed (library default). */
  defaultInstallInfo: InstallVersionInfo | null;
  /** All versions the user can pick (bulk + per row). */
  versionOptions: InstallVersionOption[];
  /** Pre-select bulk dropdown when opening from a specific version row. */
  initialBulkVersionKey?: string | null;
  /** Related library items (main + pro, etc.) — optional second stage per site. */
  familyBlocks?: FamilyInstallBlock[];
}

const defaultPluginFile = (slug: string) => `${slug}/${slug}.php`;

/** Non-empty sentinel — value="" triggers InputBase onEmpty/FormControl update loop */
const EMPTY_KEY = '__use_default__';

/** True if this version can be installed via wp-proxy (WP.org version or remote zip). */
export function installLibraryVersionInfoIsRunnable(info: InstallVersionInfo | null): info is InstallVersionInfo {
  if (!info) return false;
  if (info.source === 'local') return false;
  if (info.source === 'remote') return !!info.remoteUrl;
  if (info.source === 'official') {
    return !!info.version && info.version !== 'latest';
  }
  return false;
}

function resolveInfoForSite(
  siteId: string,
  bulkKey: string,
  perSite: Record<string, string>,
  defaultInstallInfo: InstallVersionInfo | null,
  optionByKey: Map<string, InstallVersionInfo>,
): InstallVersionInfo | null {
  const rowKey = perSite[siteId];
  if (rowKey && rowKey !== EMPTY_KEY) {
    return optionByKey.get(rowKey) ?? null;
  }
  if (bulkKey && bulkKey !== EMPTY_KEY) {
    return optionByKey.get(bulkKey) ?? null;
  }
  return defaultInstallInfo;
}

function resolveFamilyPluginInfo(
  bulkKey: string,
  defaultInstallInfo: InstallVersionInfo | null,
  optionByKey: Map<string, InstallVersionInfo>,
): InstallVersionInfo | null {
  if (bulkKey && bulkKey !== EMPTY_KEY) {
    return optionByKey.get(bulkKey) ?? null;
  }
  return defaultInstallInfo;
}

const InstallOnSitesModal: React.FC<InstallOnSitesModalProps> = ({
  open,
  onClose,
  pluginSlug,
  displayName,
  defaultInstallInfo,
  versionOptions,
  initialBulkVersionKey = null,
  familyBlocks = [],
}) => {
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());
  const [bulkVersionKey, setBulkVersionKey] = useState<string>(EMPTY_KEY);
  const [perSiteVersionKey, setPerSiteVersionKey] = useState<Record<string, string>>({});
  const [familyIncluded, setFamilyIncluded] = useState<Set<string>>(new Set());
  const [familyBulkKey, setFamilyBulkKey] = useState<Record<string, string>>({});

  const { data: sites = [] } = useSites();
  const installVersionMutation = useInstallPluginVersion(undefined);
  const installFromZipMutation = useInstallPluginFromZipUrl(undefined);
  const installThemeZipMutation = useInstallThemeFromZipUrl(undefined);

  const connectedSites = sites.filter((s) => s.status === 'connected');
  const pluginFile = defaultPluginFile(pluginSlug);

  const optionByKey = useMemo(() => {
    const m = new Map<string, InstallVersionInfo>();
    versionOptions.forEach((o) => m.set(o.key, o.info));
    return m;
  }, [versionOptions]);

  const familyOptionMaps = useMemo(() => {
    const maps = new Map<string, Map<string, InstallVersionInfo>>();
    for (const b of familyBlocks) {
      if (b.kind !== 'plugin') continue;
      const m = new Map<string, InstallVersionInfo>();
      b.versionOptions.forEach((o) => m.set(o.key, o.info));
      maps.set(b.blockId, m);
    }
    return maps;
  }, [familyBlocks]);

  const familyBlocksKey = familyBlocks.map((b) => `${b.blockId}:${b.kind}`).join('|');

  useEffect(() => {
    if (!open) return;
    setSelectedSiteIds(new Set());
    setBulkVersionKey(initialBulkVersionKey && optionByKey.has(initialBulkVersionKey) ? initialBulkVersionKey : EMPTY_KEY);
    setPerSiteVersionKey({});
    if (familyBlocks.length > 0) {
      setFamilyIncluded(new Set(familyBlocks.map((b) => b.blockId)));
      const fk: Record<string, string> = {};
      familyBlocks.forEach((b) => {
        if (b.kind === 'plugin') fk[b.blockId] = EMPTY_KEY;
      });
      setFamilyBulkKey(fk);
    } else {
      setFamilyIncluded(new Set());
      setFamilyBulkKey({});
    }
  }, [open, initialBulkVersionKey, optionByKey, familyBlocksKey]);

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
      if (prev.size === connectedSites.length && connectedSites.length > 0) {
        return new Set();
      }
      return new Set(connectedSites.map((s) => s.$id));
    });
  }, [connectedSites]);

  const setPerSite = useCallback((siteId: string, key: string) => {
    setPerSiteVersionKey((prev) => ({ ...prev, [siteId]: key }));
  }, []);

  const toggleFamilyMember = useCallback((blockId: string) => {
    setFamilyIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }, []);

  const handleInstall = async () => {
    if (selectedSiteIds.size === 0) return;
    const toInstall = connectedSites.filter((s) => selectedSiteIds.has(s.$id));

    for (const site of toInstall) {
      const siteDisplayName = site.siteName || site.siteUrl || site.$id;

      const info = resolveInfoForSite(site.$id, bulkVersionKey, perSiteVersionKey, defaultInstallInfo, optionByKey);
      if (installLibraryVersionInfoIsRunnable(info)) {
        if (info.source === 'official') {
          await installVersionMutation.mutateAsync({
            siteId: site.$id,
            pluginFile,
            pluginName: displayName,
            version: info.version,
            siteDisplayName,
          });
        } else if (info.source === 'remote' && info.remoteUrl) {
          await installFromZipMutation.mutateAsync({
            siteId: site.$id,
            pluginFile,
            zipUrl: info.remoteUrl,
            pluginName: displayName,
            siteDisplayName,
          });
        }
      }

      for (const block of familyBlocks) {
        if (!familyIncluded.has(block.blockId)) continue;
        if (block.kind === 'plugin') {
          const map = familyOptionMaps.get(block.blockId) ?? new Map();
          const finfo = resolveFamilyPluginInfo(
            familyBulkKey[block.blockId] ?? EMPTY_KEY,
            block.defaultInstallInfo,
            map,
          );
          if (!installLibraryVersionInfoIsRunnable(finfo)) continue;
          const pf = defaultPluginFile(block.pluginSlug);
          if (finfo.source === 'official') {
            await installVersionMutation.mutateAsync({
              siteId: site.$id,
              pluginFile: pf,
              pluginName: block.displayName,
              version: finfo.version,
              siteDisplayName,
            });
          } else if (finfo.source === 'remote' && finfo.remoteUrl) {
            await installFromZipMutation.mutateAsync({
              siteId: site.$id,
              pluginFile: pf,
              zipUrl: finfo.remoteUrl,
              pluginName: block.displayName,
              siteDisplayName,
            });
          }
        } else if (block.kind === 'theme' && block.zipUrl) {
          await installThemeZipMutation.mutateAsync({
            siteId: site.$id,
            zipUrl: block.zipUrl,
            themeName: block.displayName,
            siteDisplayName,
          });
        }
      }
    }

    setSelectedSiteIds(new Set());
    onClose();
  };

  const primaryResolvable = useMemo(() => {
    if (selectedSiteIds.size === 0) return false;
    return connectedSites.some((s) => {
      if (!selectedSiteIds.has(s.$id)) return false;
      const info = resolveInfoForSite(s.$id, bulkVersionKey, perSiteVersionKey, defaultInstallInfo, optionByKey);
      return installLibraryVersionInfoIsRunnable(info);
    });
  }, [
    selectedSiteIds,
    connectedSites,
    bulkVersionKey,
    perSiteVersionKey,
    defaultInstallInfo,
    optionByKey,
  ]);

  const familyResolvable = useMemo(() => {
    for (const block of familyBlocks) {
      if (!familyIncluded.has(block.blockId)) continue;
      if (block.kind === 'plugin') {
        const map = familyOptionMaps.get(block.blockId) ?? new Map();
        const finfo = resolveFamilyPluginInfo(
          familyBulkKey[block.blockId] ?? EMPTY_KEY,
          block.defaultInstallInfo,
          map,
        );
        if (!installLibraryVersionInfoIsRunnable(finfo)) return false;
      } else if (!block.zipUrl) {
        return false;
      }
    }
    return true;
  }, [familyBlocks, familyIncluded, familyBulkKey, familyOptionMaps]);

  const anyResolvable = primaryResolvable && familyResolvable;

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
            checked={
              connectedSites.length > 0 && selectedSiteIds.size === connectedSites.length
            }
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
        Cell: ({ value, row }: { value: [string, { url: string }]; row: { original: { siteId: string } } }) => (
          <SoftBox
            onClick={() => toggleSite(row.original.siteId)}
            sx={{ cursor: 'pointer' }}
          >
            <SiteCell value={value} siteId={row.original.siteId} linkToDetails={false} />
          </SoftBox>
        ),
      },
      {
        Header: 'Status',
        accessor: 'status',
        width: '18%',
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
        width: '14%',
        disableSortBy: true,
        Cell: ({ row }: { row: { original: { siteData: Site } } }) => (
          <HealthScoreBadge site={row.original.siteData} />
        ),
      },
      {
        Header: 'Version for this site',
        accessor: 'versionPick',
        width: '26%',
        disableSortBy: true,
        Cell: ({ row }: { row: { original: { siteId: string } } }) => {
          const sid = row.original.siteId;
          const v = perSiteVersionKey[sid] ?? EMPTY_KEY;
          return (
            <Select
              size="small"
              fullWidth
              value={v}
              onChange={(e) => setPerSite(sid, e.target.value as string)}
              sx={{ minWidth: 120, fontSize: '0.8rem' }}
            >
              <MenuItem value={EMPTY_KEY}>
                <SoftTypography variant="caption" color="secondary">
                  Use bulk / default
                </SoftTypography>
              </MenuItem>
              {versionOptions.map((o) => (
                <MenuItem key={o.key} value={o.key}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          );
        },
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
      versionPick: site.$id,
    }));

    return { columns, rows };
  }, [
    connectedSites,
    selectedSiteIds,
    perSiteVersionKey,
    versionOptions,
    toggleAll,
    toggleSite,
    setPerSite,
  ]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Install {displayName} on sites</DialogTitle>
      <DialogContent>
        {connectedSites.length === 0 ? (
          <SoftTypography variant="caption" color="secondary">
            No connected sites. Add a site first.
          </SoftTypography>
        ) : (
          <>
            <SoftTypography variant="caption" color="secondary" display="block" sx={{ mb: 1.5 }}>
              Choose a version for all selected sites below, or leave as default to use the library default. Each row can
              override with its own version.
            </SoftTypography>
            <SoftTypography variant="caption" color="secondary" id="install-bulk-version-label" display="block" sx={{ mb: 0.5 }}>
              Version for all selected sites
            </SoftTypography>
            {/* No FormControl: value can be '' — FormControl + InputBase onEmpty loops. */}
            <Select
              size="small"
              fullWidth
              sx={{ mb: 2, maxWidth: 420 }}
              value={bulkVersionKey}
              onChange={(e) => setBulkVersionKey(e.target.value as string)}
              inputProps={{ 'aria-labelledby': 'install-bulk-version-label' }}
            >
              <MenuItem value={EMPTY_KEY}>
                <SoftTypography variant="caption">
                  Default
                  {defaultInstallInfo && installLibraryVersionInfoIsRunnable(defaultInstallInfo) ? ' (library)' : ''}
                </SoftTypography>
              </MenuItem>
              {versionOptions.map((o) => (
                <MenuItem key={o.key} value={o.key}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>

            {familyBlocks.length > 0 && (
              <SoftBox sx={{ mb: 2, p: 2, borderRadius: 1, bgcolor: 'grey.100' }}>
                <SoftTypography variant="button" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                  Family — also install on the same sites
                </SoftTypography>
                <SoftTypography variant="caption" color="secondary" display="block" sx={{ mb: 1.5 }}>
                  These items are grouped in your library. Uncheck to skip. Order follows your family definition.
                </SoftTypography>
                {familyBlocks.map((block) => (
                  <SoftBox
                    key={block.blockId}
                    display="flex"
                    flexWrap="wrap"
                    alignItems="center"
                    gap={2}
                    sx={{ mb: 1.5 }}
                  >
                    <SoftBox display="flex" alignItems="center" gap={1}>
                      <Checkbox
                        size="small"
                        checked={familyIncluded.has(block.blockId)}
                        onChange={() => toggleFamilyMember(block.blockId)}
                      />
                      <SoftTypography variant="caption" fontWeight="medium">
                        {block.displayName}
                      </SoftTypography>
                    </SoftBox>
                    {block.kind === 'plugin' && familyIncluded.has(block.blockId) && (
                      <Select
                        size="small"
                        sx={{ minWidth: 260 }}
                        value={familyBulkKey[block.blockId] ?? EMPTY_KEY}
                        onChange={(e) =>
                          setFamilyBulkKey((prev) => ({ ...prev, [block.blockId]: e.target.value as string }))
                        }
                        inputProps={{ 'aria-label': `Version for ${block.displayName}` }}
                      >
                        <MenuItem value={EMPTY_KEY}>
                          <SoftTypography variant="caption">
                            Default
                            {block.defaultInstallInfo &&
                            installLibraryVersionInfoIsRunnable(block.defaultInstallInfo)
                              ? ' (library)'
                              : ''}
                          </SoftTypography>
                        </MenuItem>
                        {block.versionOptions.map((o) => (
                          <MenuItem key={o.key} value={o.key}>
                            {o.label}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                    {block.kind === 'theme' && familyIncluded.has(block.blockId) && !block.zipUrl && (
                      <SoftTypography variant="caption" color="warning.main">
                        No HTTPS zip URL (add remote URL or set LIBRARY_ZIP_PUBLIC_BASE_URL for S3).
                      </SoftTypography>
                    )}
                  </SoftBox>
                ))}
              </SoftBox>
            )}

            <SoftBox pt={1} pr={2} pb={2} pl={1}>
              <DataTable
                table={sitesTable}
                entriesPerPage={{ defaultValue: 10, entries: [5, 10, 15, 25] }}
                canSearch
                headerColor="#4F5482"
                showTotalEntries
              />
            </SoftBox>
            {(!defaultInstallInfo || !installLibraryVersionInfoIsRunnable(defaultInstallInfo)) &&
              bulkVersionKey === EMPTY_KEY && (
              <SoftTypography variant="caption" display="block" sx={{ mt: 1, color: 'warning.main' }}>
                No runnable library default (e.g. only local ZIP, or WordPress.org still on “latest” without a resolved
                version). Pick a concrete version above or per row.
              </SoftTypography>
            )}
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
          disabled={selectedSiteIds.size === 0 || !anyResolvable || isPending}
          startIcon={<Icon sx={{ fontSize: 18 }}>download</Icon>}
        >
          {isPending ? 'Installing…' : `Install on ${selectedSiteIds.size} site(s)`}
        </SoftButton>
      </DialogActions>
    </Dialog>
  );
};

export default InstallOnSitesModal;
