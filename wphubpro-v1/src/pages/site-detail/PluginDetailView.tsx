/**
 * Plugin detail view – embedded in PluginsTab. Plugin info, actions, version selectors.
 */
import React, { useState, useEffect, useMemo } from 'react';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import {
  useTogglePlugin,
  useUpdatePlugin,
  useDeletePlugin,
  useInstallPluginVersion,
  useInstallPluginFromZipUrl,
  useUpdateBridgeFromZip,
} from '../../hooks/useWordPress';
import { useLibraryItems } from '../../hooks/useLibrary';
import { getWpPluginInfo, WpPluginInfo } from '../../services/wordpress';
import { LibraryItemSource, LibraryItemType } from '../../types';
import { WordPressPlugin } from '../../hooks/useWordPress';
import { useLatestBridge, isBridgePlugin } from '../../hooks/useLatestBridge';
import { iconButtonOnLightSurfaceSx } from '../../theme/detailPageStyles';

const infoGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';
const orangeGradient = 'linear-gradient(310deg, #ea580c, #fb923c)';

interface PluginDetailViewProps {
  siteId: string;
  plugin: WordPressPlugin;
  pluginSlug: string;
  onBack: () => void;
}

const PluginDetailView: React.FC<PluginDetailViewProps> = ({
  siteId,
  plugin,
  pluginSlug,
  onBack,
}) => {
  const togglePluginMutation = useTogglePlugin(siteId);
  const updatePluginMutation = useUpdatePlugin(siteId);
  const updateBridgeFromZipMutation = useUpdateBridgeFromZip(siteId);
  const deletePluginMutation = useDeletePlugin(siteId);
  const installVersionMutation = useInstallPluginVersion(siteId);
  const installFromZipMutation = useInstallPluginFromZipUrl(siteId);

  const { data: libraryItems = [] } = useLibraryItems();
  const { data: latestBridge } = useLatestBridge();
  const [wpInfo, setWpInfo] = useState<WpPluginInfo | null>(null);
  const [wpInfoLoading, setWpInfoLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(plugin.version);
  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState<string>('');

  const libraryVersionsForPlugin = libraryItems.filter(
    (item) =>
      item.type === LibraryItemType.Plugin &&
      (item.source === LibraryItemSource.Local || item.source === LibraryItemSource.Remote) &&
      (item.wpSlug ?? '').toLowerCase() === pluginSlug.toLowerCase()
  );

  const libraryVersionIds = useMemo(
    () => new Set(libraryVersionsForPlugin.map((i) => i.$id)),
    [libraryVersionsForPlugin],
  );

  useEffect(() => {
    if (selectedLibraryItemId && !libraryVersionIds.has(selectedLibraryItemId)) {
      setSelectedLibraryItemId('');
    }
  }, [selectedLibraryItemId, libraryVersionIds]);

  useEffect(() => {
    if (!pluginSlug) return;
    setWpInfoLoading(true);
    setWpInfo(null);
    getWpPluginInfo(pluginSlug)
      .then((info) => {
        setWpInfo(info);
        setSelectedVersion(plugin.version || info?.version || '');
      })
      .catch(() => setWpInfo(null))
      .finally(() => setWpInfoLoading(false));
  }, [pluginSlug, plugin.version]);

  useEffect(() => {
    setSelectedVersion(plugin.version);
  }, [plugin.version]);

  const hasWpVersions = wpInfo?.versions && Object.keys(wpInfo.versions).length > 0;
  const hasLibraryVersions = libraryVersionsForPlugin.length > 0;
  /** Must match a MenuItem $id or MUI Select onEmpty loops (e.g. stale id after library row removed). */
  const effectiveLibraryItemId =
    selectedLibraryItemId && libraryVersionIds.has(selectedLibraryItemId)
      ? selectedLibraryItemId
      : libraryVersionsForPlugin[0]?.$id ?? '';
  const versionList = wpInfo?.versions
    ? Object.keys(wpInfo.versions)
        .filter((v) => v !== 'trunk')
        .sort((a, b) => {
          const partsA = a.split('.').map(Number);
          const partsB = b.split('.').map(Number);
          for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
            const x = partsA[i] ?? 0;
            const y = partsB[i] ?? 0;
            if (x !== y) return y - x;
          }
          return 0;
        })
    : [];
  const isCurrentVersion = selectedVersion === plugin.version;
  const selectedLibraryItem = libraryVersionsForPlugin.find((i) => i.$id === effectiveLibraryItemId);
  const isCurrentLibraryVersion = selectedLibraryItem?.version === plugin.version;
  const isRemoteItem = selectedLibraryItem?.source === LibraryItemSource.Remote && selectedLibraryItem?.remoteUrl;
  const hasUpdate = plugin.update != null && plugin.update !== '';
  const isBridge = isBridgePlugin(plugin.plugin);
  const handleUpdateBridge = () => {
    if (latestBridge?.downloadUrl) {
      updateBridgeFromZipMutation.mutate({ zipUrl: latestBridge.downloadUrl, pluginFile: plugin.plugin });
    }
  };
  const anyPending =
    togglePluginMutation.isPending ||
    updatePluginMutation.isPending ||
    updateBridgeFromZipMutation.isPending ||
    deletePluginMutation.isPending ||
    installVersionMutation.isPending ||
    installFromZipMutation.isPending;

  const isActive = String(plugin.status || '').toLowerCase() === 'active';
  const handleToggle = () =>
    togglePluginMutation.mutate({
      pluginSlug: plugin.plugin,
      status: isActive ? 'active' : 'inactive',
      pluginName: plugin.name,
    });
  const handleUpdate = () =>
    updatePluginMutation.mutate({ pluginFile: plugin.plugin, pluginName: plugin.name });
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove "${plugin.name}"?`)) {
      deletePluginMutation.mutate(
        { pluginFile: plugin.plugin, pluginName: plugin.name },
        { onSuccess: onBack }
      );
    }
  };
  const handleInstallVersion = () => {
    if (selectedVersion && !isCurrentVersion) {
      installVersionMutation.mutate({
        pluginFile: plugin.plugin,
        pluginName: plugin.name,
        version: selectedVersion,
      });
    }
  };

  const descriptionText = wpInfo?.description
    ? String(wpInfo.description)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

  return (
    <SoftBox>
      <SoftButton variant="text" size="small" onClick={onBack} sx={{ mb: 2 }}>
        <Icon sx={{ mr: 0.5 }}>arrow_back</Icon> Back to plugins
      </SoftButton>

      <Grid container spacing={0}>
        {/* Left box: Title + Description + Version dropdowns */}
        <Grid item xs={12} md={7}>
          <SoftBox p={3}>
            <SoftTypography variant="h6" fontWeight="bold" gutterBottom>
              {plugin.name}
            </SoftTypography>
            <SoftTypography variant="caption" sx={{ whiteSpace: 'pre-wrap', display: 'block' }}>
              {descriptionText
                ? descriptionText.slice(0, 1200) + (descriptionText.length > 1200 ? '…' : '')
                : 'No description available.'}
            </SoftTypography>

            {(hasWpVersions || hasLibraryVersions || wpInfoLoading || !wpInfoLoading) && (
              <SoftBox mt={3}>
                {wpInfoLoading && !wpInfo && (
                  <SoftBox display="flex" alignItems="center" gap={1} mb={2}>
                    <CircularProgress size={18} />
                    <SoftTypography variant="caption" color="secondary">
                      Checking WordPress.org…
                    </SoftTypography>
                  </SoftBox>
                )}
                <Grid container spacing={2}>
                  {hasWpVersions && (
                    <Grid item xs={12} sm={6}>
                      <SoftTypography
                        variant="caption"
                        fontWeight="bold"
                        color="secondary"
                        display="block"
                        sx={{ mb: 1 }}
                      >
                        WordPress.org
                      </SoftTypography>
                      {versionList.length > 0 ? (
                        <Select
                          size="small"
                          fullWidth
                          value={
                            versionList.includes(selectedVersion) ? selectedVersion : versionList[0]
                          }
                          onChange={(e) => setSelectedVersion(e.target.value)}
                          disabled={installVersionMutation.isPending || wpInfoLoading}
                          inputProps={{ 'aria-label': 'WordPress.org version' }}
                        >
                          {versionList.map((v) => (
                            <MenuItem key={v} value={v}>
                              {v} {v === plugin.version ? '(current)' : ''}
                            </MenuItem>
                          ))}
                        </Select>
                      ) : (
                        <SoftTypography variant="caption" color="secondary">
                          No release versions listed (only trunk or unavailable).
                        </SoftTypography>
                      )}
                      {!isCurrentVersion && (
                        <SoftButton
                          size="small"
                          color="info"
                          variant="gradient"
                          onClick={handleInstallVersion}
                          disabled={installVersionMutation.isPending}
                          sx={{ mt: 1 }}
                        >
                          {installVersionMutation.isPending ? (
                            <CircularProgress size={18} color="inherit" />
                          ) : (
                            <>Update/Rollback to {selectedVersion}</>
                          )}
                        </SoftButton>
                      )}
                    </Grid>
                  )}
                  {hasLibraryVersions && (
                    <Grid item xs={12} sm={6}>
                      <SoftTypography
                        variant="caption"
                        fontWeight="bold"
                        color="secondary"
                        display="block"
                        sx={{ mb: 1 }}
                      >
                        WPHubPro storage
                      </SoftTypography>
                      <Select
                        size="small"
                        fullWidth
                        value={effectiveLibraryItemId}
                        onChange={(e) => setSelectedLibraryItemId(e.target.value)}
                        inputProps={{ 'aria-label': 'Library version' }}
                      >
                        {libraryVersionsForPlugin.map((item) => (
                          <MenuItem key={item.$id} value={item.$id}>
                            {item.version} {item.version === plugin.version ? '(current)' : ''}
                          </MenuItem>
                        ))}
                      </Select>
                      {selectedLibraryItem && !isCurrentLibraryVersion && isRemoteItem && (
                        <SoftButton
                          size="small"
                          color="info"
                          variant="gradient"
                          onClick={() =>
                            installFromZipMutation.mutate({
                              siteId,
                              pluginFile: plugin.plugin,
                              zipUrl: selectedLibraryItem!.remoteUrl!,
                              pluginName: plugin.name,
                            })
                          }
                          disabled={installFromZipMutation.isPending}
                          sx={{ mt: 1 }}
                        >
                          {installFromZipMutation.isPending ? 'Installing…' : `Install ${selectedLibraryItem.version} from remote`}
                        </SoftButton>
                      )}
                      {selectedLibraryItem && !isCurrentLibraryVersion && !isRemoteItem && (
                        <Tooltip title="Install from WPHubPro storage requires backend support">
                          <span>
                            <SoftButton size="small" color="info" variant="outlined" disabled sx={{ mt: 1 }}>
                              Install (coming soon)
                            </SoftButton>
                          </span>
                        </Tooltip>
                      )}
                    </Grid>
                  )}
                </Grid>
                {!hasWpVersions && !hasLibraryVersions && !wpInfoLoading && (
                  <SoftTypography variant="caption" color="secondary" display="block" sx={{ mt: 1 }}>
                    Not in WordPress.org and no versions in WPHubPro storage.
                  </SoftTypography>
                )}
              </SoftBox>
            )}
          </SoftBox>
        </Grid>

        {/* Right box: Installed plugin data */}
        <Grid item xs={12} md={5}>
          <SoftBox p={3} sx={{ height: '100%' }}>
            <SoftTypography variant="button" color="secondary" fontWeight="bold" gutterBottom>
              Installed plugin
            </SoftTypography>
            <SoftBox display="flex" flexDirection="column" gap={1.5}>
              <SoftBox display="flex" alignItems="center" gap={1}>
                <SoftTypography variant="caption" color="secondary">
                  Status
                </SoftTypography>
                <SoftBox
                  component="button"
                  type="button"
                  onClick={handleToggle}
                  disabled={anyPending}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    border: 'none',
                    cursor: anyPending ? 'not-allowed' : 'pointer',
                    opacity: togglePluginMutation.isPending ? 0.7 : 1,
                    background: isActive ? orangeGradient : infoGradient,
                    color: '#fff',
                    fontSize: (t) => t.typography.caption.fontSize,
                    fontFamily: (t) => t.typography.fontFamily,
                    fontWeight: 600,
                    '&:hover:not(:disabled)': { filter: 'brightness(1.1)' },
                  }}
                >
                  {isActive ? 'Deactivate' : 'Activate'}
                </SoftBox>
              </SoftBox>
              <SoftBox>
                <SoftTypography variant="caption" color="secondary">
                  Installed version
                </SoftTypography>
                <SoftTypography variant="caption" display="block">
                  {plugin.version}
                </SoftTypography>
              </SoftBox>
              {wpInfo?.author && (
                <SoftBox>
                  <SoftTypography variant="caption" color="secondary">
                    Author
                  </SoftTypography>
                  {wpInfo?.authorUri || wpInfo?.homepage ? (
                    <SoftBox
                      component="a"
                      href={wpInfo?.authorUri || wpInfo?.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        fontSize: (t) => t.typography.caption.fontSize,
                        fontFamily: (t) => t.typography.fontFamily,
                        color: 'info.main',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {wpInfo.author}
                    </SoftBox>
                  ) : (
                    <SoftTypography variant="caption" display="block">
                      {wpInfo.author}
                    </SoftTypography>
                  )}
                </SoftBox>
              )}
            </SoftBox>
            <SoftBox sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              {hasUpdate && (
                <SoftBox mb={1.5}>
                  {isBridge && latestBridge?.downloadUrl ? (
                    <SoftButton
                      size="small"
                      color="success"
                      variant="gradient"
                      onClick={handleUpdateBridge}
                      disabled={anyPending}
                      startIcon={
                        updateBridgeFromZipMutation.isPending ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <Icon sx={{ fontSize: 18 }}>system_update</Icon>
                        )
                      }
                    >
                      {updateBridgeFromZipMutation.isPending ? 'Updating…' : `Update to v${plugin.update}`}
                    </SoftButton>
                  ) : !isBridge && (
                    <SoftButton
                      size="small"
                      color="success"
                      variant="gradient"
                      onClick={handleUpdate}
                      disabled={anyPending}
                      startIcon={
                        updatePluginMutation.isPending ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <Icon sx={{ fontSize: 18 }}>system_update</Icon>
                        )
                      }
                    >
                      {updatePluginMutation.isPending ? 'Updating…' : `Update to ${plugin.update}`}
                    </SoftButton>
                  )}
                </SoftBox>
              )}
              <SoftBox display="flex" alignItems="center" gap={1} flexWrap="wrap">
              {hasUpdate && isBridge && latestBridge?.downloadUrl && (
                <Tooltip title={`Update Bridge to v${plugin.update}`}>
                  <IconButton
                    size="medium"
                    onClick={handleUpdateBridge}
                    disabled={anyPending}
                    sx={{ color: 'success.main' }}
                    aria-label="Update Bridge"
                  >
                    <Icon>system_update</Icon>
                  </IconButton>
                </Tooltip>
              )}
              {hasUpdate && !isBridge && (
                  <Tooltip title={`Update to ${plugin.update}`}>
                    <IconButton
                      size="small"
                      onClick={handleUpdate}
                      disabled={anyPending}
                      sx={iconButtonOnLightSurfaceSx}
                      aria-label="Update"
                    >
                      <Icon sx={{ fontSize: 18 }}>system_update</Icon>
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Uninstall">
                <IconButton
                  size="small"
                  onClick={handleDelete}
                  disabled={anyPending}
                  sx={iconButtonOnLightSurfaceSx}
                  aria-label="Uninstall"
                >
                  <Icon sx={{ fontSize: 18 }}>delete</Icon>
                </IconButton>
              </Tooltip>
              </SoftBox>
            </SoftBox>
          </SoftBox>
        </Grid>
      </Grid>
    </SoftBox>
  );
};

export default PluginDetailView;
