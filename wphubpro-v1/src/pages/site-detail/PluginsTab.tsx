import React, { useState, useMemo } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import ScrollableTableWrapper from 'components/ScrollableTableWrapper';
import TableRow from '@mui/material/TableRow';
import DataTableHeadCell from 'examples/Tables/DataTable/DataTableHeadCell';
import DataTableBodyCell from 'examples/Tables/DataTable/DataTableBodyCell';
import Card from '@mui/material/Card';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Select from '@mui/material/Select';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import { usePlugins, useTogglePlugin, useUpdatePlugin, useDeletePlugin, useUpdateBridgeFromZip } from '../../hooks/useWordPress';
import { useSite } from '../../domains/sites';
import { useLatestBridge, enrichPluginsWithBridgeUpdate, isBridgePlugin } from '../../hooks/useLatestBridge';
import { iconButtonOnLightSurfaceSx } from '../../theme/detailPageStyles';
import { contentPaperSurfaceSx } from '../../theme/contentPaper';
import { WordPressPlugin } from '../../types';
import PluginDetailView from './PluginDetailView';

function slugFromPlugin(pluginFile: string): string {
  if (!pluginFile || !pluginFile.includes('/')) return '';
  return pluginFile.split('/')[0];
}

const infoGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';
const orangeGradient = 'linear-gradient(310deg, #ea580c, #fb923c)';

type PluginFilter = 'all' | 'updates' | 'active' | 'inactive';

interface PluginsTabProps {
  siteId: string;
}

const PluginsTab: React.FC<PluginsTabProps> = ({ siteId }) => {
  const { data: site } = useSite(siteId);
  const [selectedPluginSlug, setSelectedPluginSlug] = useState<string | null>(null);
  const { data: plugins, isLoading, isError, error, refetch } = usePlugins(siteId, { enabled: site?.enabled });
  const togglePluginMutation = useTogglePlugin(siteId);
  const updatePluginMutation = useUpdatePlugin(siteId);
  const updateBridgeFromZipMutation = useUpdateBridgeFromZip(siteId);
  const deletePluginMutation = useDeletePlugin(siteId);
  const [filter, setFilter] = useState<PluginFilter>('all');

  const handleToggle = (plugin: WordPressPlugin) => {
    togglePluginMutation.mutate({ pluginSlug: plugin.plugin, status: plugin.status, pluginName: plugin.name });
  };

  const handleUpdate = (plugin: WordPressPlugin) => {
    updatePluginMutation.mutate({ pluginFile: plugin.plugin, pluginName: plugin.name });
  };

  const handleDelete = (plugin: WordPressPlugin) => {
    if (window.confirm(`Are you sure you want to remove "${plugin.name}"?`)) {
      deletePluginMutation.mutate({ pluginFile: plugin.plugin, pluginName: plugin.name });
    }
  };

  const handleRowClick = (plugin: WordPressPlugin) => {
    const slug = slugFromPlugin(plugin.plugin);
    if (slug) setSelectedPluginSlug(slug);
  };

  const { data: latestBridge } = useLatestBridge();
  const allPlugins = useMemo(
    () => enrichPluginsWithBridgeUpdate(plugins ?? [], latestBridge),
    [plugins, latestBridge]
  );
  const handleUpdateBridge = (plugin: WordPressPlugin) => {
    if (latestBridge?.downloadUrl) {
      updateBridgeFromZipMutation.mutate({ zipUrl: latestBridge.downloadUrl, pluginFile: plugin.plugin });
    }
  };
  const anyPending =
    togglePluginMutation.isPending ||
    updatePluginMutation.isPending ||
    updateBridgeFromZipMutation.isPending ||
    deletePluginMutation.isPending;
  const filteredPlugins = (() => {
    switch (filter) {
      case 'updates':
        return allPlugins.filter((p) => p.update != null && p.update !== '');
      case 'active':
        return allPlugins.filter((p) => p.status === 'active');
      case 'inactive':
        return allPlugins.filter((p) => p.status === 'inactive');
      default:
        return allPlugins;
    }
  })();

  if (isLoading) {
    return (
      <SoftBox display="flex" justifyContent="center" alignItems="center" p={6}>
        <Icon sx={{ fontSize: 40, color: 'grey.400', mr: 2 }}>sync</Icon>
        <SoftTypography variant="button" color="secondary">Loading plugins...</SoftTypography>
      </SoftBox>
    );
  }

  if (isError) {
    const apiUrl = site ? `${String(site.siteUrl).replace(/\/$/, '')}/wp-json/wphubpro/v1/plugins` : 'unknown';
    return (
      <Card sx={contentPaperSurfaceSx}>
        <SoftBox p={3}>
          <SoftTypography variant="caption" color="secondary" mb={2} display="block">API: {apiUrl}</SoftTypography>
          <SoftBox display="flex" alignItems="flex-start" gap={2}>
            <Icon color="error" sx={{ mt: 0.5 }}>error</Icon>
            <SoftBox flex={1}>
              <SoftTypography variant="h6" fontWeight="medium" color="error" mb={1}>Error loading plugins</SoftTypography>
              <SoftTypography variant="caption" color="secondary" mb={2}>{error?.message || String(error)}</SoftTypography>
              <SoftButton variant="outlined" color="info" size="small" onClick={() => refetch()}>Try again</SoftButton>
            </SoftBox>
          </SoftBox>
        </SoftBox>
      </Card>
    );
  }

  const selectedPlugin = selectedPluginSlug
    ? allPlugins.find((p) => slugFromPlugin(p.plugin) === selectedPluginSlug) ?? null
    : null;

  return (
    <Card sx={contentPaperSurfaceSx}>
      {selectedPlugin ? (
        <SoftBox p={3}>
          <PluginDetailView
            siteId={siteId}
            plugin={selectedPlugin}
            pluginSlug={selectedPluginSlug!}
            onBack={() => setSelectedPluginSlug(null)}
          />
        </SoftBox>
      ) : (
        <>
          <SoftBox p={2} borderBottom="1px solid" borderColor="grey-200" display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <SoftTypography variant="caption" color="secondary">
              API: {site ? `${String(site.siteUrl).replace(/\/$/, '')}/wp-json/wphubpro/v1/plugins` : '-'}
            </SoftTypography>
            <Select
              size="small"
              sx={{ minWidth: 160 }}
              value={filter}
              onChange={(e) => setFilter(e.target.value as PluginFilter)}
              inputProps={{ 'aria-label': 'Filter plugins' }}
            >
              <MenuItem value="all">All plugins</MenuItem>
              <MenuItem value="updates">Show Updates</MenuItem>
              <MenuItem value="active">Show Active</MenuItem>
              <MenuItem value="inactive">Show Inactive</MenuItem>
            </Select>
          </SoftBox>
          <ScrollableTableWrapper maxHeight="55vh">
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
            '& tbody td:first-of-type': {
              paddingLeft: (theme) => theme.spacing(5),
              paddingRight: (theme) => theme.spacing(3),
            },
            '& thead th:last-of-type': { paddingRight: (theme) => theme.spacing(4) },
            '& tbody td:last-of-type': { paddingRight: (theme) => theme.spacing(4) },
          }}
        >
          <SoftBox component="thead">
            <TableRow>
              {/* Column widths total 100%: 50 + 20 + 20 + 10 */}
              <DataTableHeadCell width="50%" pl={5} color="#4F5482">Plugin</DataTableHeadCell>
              <DataTableHeadCell width="20%" pl={undefined} color="#4F5482">Status</DataTableHeadCell>
              <DataTableHeadCell width="20%" pl={undefined} color="#4F5482">Version</DataTableHeadCell>
              <DataTableHeadCell width="10%" align="right" pl={undefined} color="#4F5482" sorted="none">Actions</DataTableHeadCell>
            </TableRow>
          </SoftBox>
          <TableBody>
            {filteredPlugins.map((plugin) => (
              <TableRow
                key={plugin.plugin}
                onClick={() => handleRowClick(plugin)}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <DataTableBodyCell><SoftTypography variant="button" fontWeight="medium">{plugin.name}</SoftTypography></DataTableBodyCell>
                <DataTableBodyCell>
                  <SoftBox
                    component="button"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(plugin);
                    }}
                    disabled={togglePluginMutation.isPending && togglePluginMutation.variables?.pluginSlug === plugin.plugin}
                    sx={{
                      display: 'inline-block',
                      width: 90,
                      textAlign: 'center',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      border: 'none',
                      cursor: anyPending ? 'not-allowed' : 'pointer',
                      opacity: togglePluginMutation.isPending && togglePluginMutation.variables?.pluginSlug === plugin.plugin ? 0.7 : 1,
                      background: plugin.status === 'active' ? orangeGradient : infoGradient,
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      '&:hover:not(:disabled)': { filter: 'brightness(1.1)' },
                    }}
                  >
                    {plugin.status === 'active' ? 'Deactivate' : 'Activate'}
                  </SoftBox>
                </DataTableBodyCell>
                <DataTableBodyCell>
                  <SoftBox display="flex" alignItems="center" gap={0.5} onClick={(e) => e.stopPropagation()}>
                    <SoftTypography variant="caption">{plugin.version}</SoftTypography>
                    {plugin.update != null && plugin.update !== '' && isBridgePlugin(plugin.plugin) && latestBridge?.downloadUrl && (
                      <Tooltip title={`Update Bridge to v${plugin.update}`} placement="top">
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateBridge(plugin)}
                          disabled={updateBridgeFromZipMutation.isPending}
                          sx={iconButtonOnLightSurfaceSx}
                          aria-label={`Update ${plugin.name}`}
                        >
                          <Icon sx={{ fontSize: 18 }}>sync</Icon>
                        </IconButton>
                      </Tooltip>
                    )}
                    {plugin.update != null && plugin.update !== '' && !isBridgePlugin(plugin.plugin) && (
                      <Tooltip title={`Update to ${plugin.update}`} placement="top">
                        <IconButton
                          size="small"
                          onClick={() => handleUpdate(plugin)}
                          disabled={updatePluginMutation.isPending && updatePluginMutation.variables?.pluginFile === plugin.plugin}
                          sx={iconButtonOnLightSurfaceSx}
                          aria-label={`Update ${plugin.name}`}
                        >
                          <Icon sx={{ fontSize: 18 }}>sync</Icon>
                        </IconButton>
                      </Tooltip>
                    )}
                  </SoftBox>
                </DataTableBodyCell>
                <DataTableBodyCell align="right">
                  <SoftBox
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-end"
                    gap={0.5}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip title="Remove plugin" placement="top">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(plugin)}
                        disabled={deletePluginMutation.isPending && deletePluginMutation.variables?.pluginFile === plugin.plugin}
                        sx={iconButtonOnLightSurfaceSx}
                        aria-label={`Remove ${plugin.name}`}
                      >
                        <Icon sx={{ fontSize: 18 }}>delete</Icon>
                      </IconButton>
                    </Tooltip>
                  </SoftBox>
                </DataTableBodyCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollableTableWrapper>
        </>
      )}
    </Card>
  );
};

export default PluginsTab;
