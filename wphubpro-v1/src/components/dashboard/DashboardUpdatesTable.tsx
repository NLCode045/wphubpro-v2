/**
 * Dashboard Updates tab — same table chrome as Sites tab (DataTable head/body cells + expandable rows).
 */
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import Icon from '@mui/material/Icon';
import Tooltip from '@mui/material/Tooltip';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import DataTableHeadCell from 'examples/Tables/DataTable/DataTableHeadCell';
import DataTableBodyCell from 'examples/Tables/DataTable/DataTableBodyCell';
import colors from 'assets/theme/base/colors';
import borders from 'assets/theme/base/borders';
import ScrollableBox from '../ui/ScrollableBox';
import { Site } from '../../types';
import { getSitePendingUpdates, useManageTheme, useUpdatePlugin } from '../../hooks/useWordPress';
import { iconButtonOnLightSurfaceSx } from '../../theme/detailPageStyles';
import { DASHBOARD_TABLE_HEADER_COLOR, dashboardTabTableCardSx } from './dashboardTabTableConstants';

/** Fixed width for expand/collapse column (px). IconButton defaults would otherwise force ~40px+ padding. */
const EXPAND_COL_WIDTH_PX = 48;

interface DashboardUpdatesTableProps {
  sites: Site[];
}

const DashboardUpdatesTable: React.FC<DashboardUpdatesTableProps> = ({ sites }) => {
  const navigate = useNavigate();
  const updatePlugin = useUpdatePlugin();
  const manageTheme = useManageTheme(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; siteId: string } | null>(null);
  const [bulkSiteId, setBulkSiteId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = sites.filter((s) => s.enabled !== false);
    const mapped = list
      .map((site) => ({ site, ...getSitePendingUpdates(site) }))
      .filter((row) => row.pluginUpdateCount + row.themeUpdateCount > 0);
    mapped.sort((a, b) => {
      const pendingA = a.pluginUpdateCount + a.themeUpdateCount;
      const pendingB = b.pluginUpdateCount + b.themeUpdateCount;
      if (pendingB !== pendingA) return pendingB - pendingA;
      return (a.site.siteName || a.site.siteUrl).localeCompare(b.site.siteName || b.site.siteUrl);
    });
    return mapped;
  }, [sites]);

  const closeMenu = () => setMenuAnchor(null);

  const runUpdateAllPlugins = async (site: Site) => {
    const { pluginsNeedingUpdate } = getSitePendingUpdates(site);
    if (pluginsNeedingUpdate.length === 0) return;
    setBulkSiteId(site.$id);
    try {
      for (const p of pluginsNeedingUpdate) {
        await updatePlugin.mutateAsync({
          siteId: site.$id,
          pluginFile: p.plugin,
          pluginName: p.name,
        });
      }
    } finally {
      setBulkSiteId(null);
    }
  };

  const runUpdateAllThemes = async (site: Site) => {
    const { themesNeedingUpdate } = getSitePendingUpdates(site);
    if (themesNeedingUpdate.length === 0) return;
    setBulkSiteId(site.$id);
    try {
      for (const t of themesNeedingUpdate) {
        await manageTheme.mutateAsync({
          siteId: site.$id,
          themeSlug: t.stylesheet,
          action: 'update',
          themeName: t.name,
        });
      }
    } finally {
      setBulkSiteId(null);
    }
  };

  const runUpdateAll = async (site: Site) => {
    await runUpdateAllPlugins(site);
    await runUpdateAllThemes(site);
  };

  const mutationsBusy = updatePlugin.isPending || manageTheme.isPending;
  const busy = bulkSiteId !== null || mutationsBusy;

  return (
    <Card sx={dashboardTabTableCardSx}>
      <SoftBox sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {rows.length === 0 ? (
          <>
            <SoftBox p={2} mb={2} borderBottom="1px solid" borderColor="grey-200" display="flex" justifyContent="space-between" alignItems="center">
              <SoftTypography variant="h6" fontWeight="bold" sx={{ color: DASHBOARD_TABLE_HEADER_COLOR }}>
                Updates
              </SoftTypography>
              <Link to="/sites" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <SoftTypography variant="button" fontWeight="bold" sx={{ color: DASHBOARD_TABLE_HEADER_COLOR }}>
                  All sites
                </SoftTypography>
                <Icon sx={{ fontSize: 18, color: DASHBOARD_TABLE_HEADER_COLOR }}>arrow_forward</Icon>
              </Link>
            </SoftBox>
            <SoftBox pt={0} pr={2} pb={2} pl={1}>
              <SoftBox py={3} textAlign="center">
                <SoftTypography variant="caption" color="secondary">
                  No sites with pending updates.
                </SoftTypography>
              </SoftBox>
            </SoftBox>
          </>
        ) : (
          <ScrollableBox fill showArrows={false} sx={{ flex: 1, minHeight: 0 }}>
            <SoftBox p={2} mb={2} borderBottom="1px solid" borderColor="grey-200" display="flex" justifyContent="space-between" alignItems="center">
              <SoftTypography variant="h6" fontWeight="bold" sx={{ color: DASHBOARD_TABLE_HEADER_COLOR }}>
                Updates
              </SoftTypography>
              <Link to="/sites" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <SoftTypography variant="button" fontWeight="bold" sx={{ color: DASHBOARD_TABLE_HEADER_COLOR }}>
                  All sites
                </SoftTypography>
                <Icon sx={{ fontSize: 18, color: DASHBOARD_TABLE_HEADER_COLOR }}>arrow_forward</Icon>
              </Link>
            </SoftBox>
            <SoftBox pt={0} pr={2} pb={0} pl={1}>
              <TableContainer sx={{ boxShadow: 'none' }}>
                <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: EXPAND_COL_WIDTH_PX, minWidth: EXPAND_COL_WIDTH_PX, maxWidth: EXPAND_COL_WIDTH_PX }} />
                    <col />
                    <col />
                    <col />
                    <col />
                  </colgroup>
                  <SoftBox component="thead" sx={{ '& tr th': { pt: 2 } }}>
                    <TableRow>
                      <SoftBox
                        component="th"
                        sx={{
                          width: EXPAND_COL_WIDTH_PX,
                          minWidth: EXPAND_COL_WIDTH_PX,
                          maxWidth: EXPAND_COL_WIDTH_PX,
                          boxSizing: 'border-box',
                          verticalAlign: 'middle',
                          borderBottom: `${borders.borderWidth[1]} solid ${colors.light.main}`,
                          py: 1.5,
                          px: 0.5,
                          overflow: 'hidden',
                        }}
                      />
                      <DataTableHeadCell width="34%" pl={undefined} sorted={false as any} color={DASHBOARD_TABLE_HEADER_COLOR}>
                        Site
                      </DataTableHeadCell>
                      <DataTableHeadCell width="22%" pl={undefined} sorted={false as any} color={DASHBOARD_TABLE_HEADER_COLOR} align="center">
                        Plugin updates
                      </DataTableHeadCell>
                      <DataTableHeadCell width="22%" pl={undefined} sorted={false as any} color={DASHBOARD_TABLE_HEADER_COLOR} align="center">
                        Theme updates
                      </DataTableHeadCell>
                      <DataTableHeadCell width="22%" pl={undefined} sorted={false as any} color={DASHBOARD_TABLE_HEADER_COLOR} align="right">
                        Actions
                      </DataTableHeadCell>
                    </TableRow>
                  </SoftBox>
                  <TableBody>
                    {rows.map(({ site, pluginUpdateCount, themeUpdateCount, pluginsNeedingUpdate, themesNeedingUpdate }) => {
                      const isOpen = expandedId === site.$id;
                      const connected = site.status === 'connected';
                      return (
                        <React.Fragment key={site.$id}>
                          <TableRow
                            hover
                            onClick={() => setExpandedId((id) => (id === site.$id ? null : site.$id))}
                            sx={{ cursor: 'pointer' }}
                          >
                            <SoftBox
                              component="td"
                              sx={{
                                width: EXPAND_COL_WIDTH_PX,
                                minWidth: EXPAND_COL_WIDTH_PX,
                                maxWidth: EXPAND_COL_WIDTH_PX,
                                boxSizing: 'border-box',
                                verticalAlign: 'middle',
                                textAlign: 'center',
                                borderBottom: `${borders.borderWidth[1]} solid ${colors.light.main}`,
                                py: 2,
                                px: 0.5,
                                overflow: 'hidden',
                              }}
                            >
                              <IconButton
                                size="small"
                                aria-label={isOpen ? 'Collapse' : 'Expand'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedId((id) => (id === site.$id ? null : site.$id));
                                }}
                                sx={{
                                  p: 0.5,
                                  minWidth: 32,
                                  width: 32,
                                  height: 32,
                                  maxWidth: 32,
                                  boxSizing: 'border-box',
                                }}
                              >
                                <Icon sx={{ fontSize: 20, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                  expand_more
                                </Icon>
                              </IconButton>
                            </SoftBox>
                            <DataTableBodyCell>
                              <SoftTypography variant="button" fontWeight="medium" sx={{ color: DASHBOARD_TABLE_HEADER_COLOR }}>
                                {site.siteName || site.siteUrl}
                              </SoftTypography>
                              {!connected && (
                                <SoftTypography variant="caption" color="secondary" display="block">
                                  Disconnected
                                </SoftTypography>
                              )}
                            </DataTableBodyCell>
                            <DataTableBodyCell align="center">{connected ? pluginUpdateCount : '—'}</DataTableBodyCell>
                            <DataTableBodyCell align="center">{connected ? themeUpdateCount : '—'}</DataTableBodyCell>
                            <DataTableBodyCell align="right">
                              <SoftBox
                                onClick={(e) => e.stopPropagation()}
                                display="inline-flex"
                                alignItems="center"
                                justifyContent="flex-end"
                                gap={0.5}
                              >
                                <Tooltip title="Open site details" placement="top">
                                  <span>
                                    <IconButton
                                      size="small"
                                      aria-label="Open site details"
                                      onClick={() => navigate(`/sites/${site.$id}`)}
                                      sx={iconButtonOnLightSurfaceSx}
                                    >
                                      <Icon sx={{ fontSize: 18 }}>arrow_forward</Icon>
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Update actions" placement="top">
                                  <span>
                                    <IconButton
                                      size="small"
                                      aria-label="Site update actions"
                                      disabled={!connected || busy}
                                      onClick={(e) => setMenuAnchor({ el: e.currentTarget, siteId: site.$id })}
                                      sx={iconButtonOnLightSurfaceSx}
                                    >
                                      <Icon sx={{ fontSize: 18 }}>more_vert</Icon>
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </SoftBox>
                            </DataTableBodyCell>
                          </TableRow>
                          <TableRow>
                            <SoftBox
                              component="td"
                              colSpan={5}
                              sx={{
                                borderBottom: isOpen ? `${borders.borderWidth[1]} solid ${colors.light.main}` : undefined,
                                borderTop: 'none',
                                p: 0,
                              }}
                            >
                              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                <SoftBox px={3} py={2} sx={{ bgcolor: 'action.hover' }}>
                                  {!connected ? (
                                    <SoftTypography variant="caption" color="secondary">
                                      Connect the site to view and install updates.
                                    </SoftTypography>
                                  ) : (
                                    <SoftBox display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
                                      {pluginsNeedingUpdate.length > 0 && (
                                        <SoftBox flex={1}>
                                          <SoftTypography variant="caption" fontWeight="bold" color="secondary" display="block" sx={{ mb: 1 }}>
                                            Plugins
                                          </SoftTypography>
                                          <SoftBox component="ul" sx={{ m: 0, pl: 2 }}>
                                            {pluginsNeedingUpdate.map((p) => (
                                              <li key={p.plugin}>
                                                <SoftTypography variant="caption" component="span">
                                                  {p.name}{' '}
                                                  <Box component="span" sx={{ opacity: 0.8 }}>
                                                    ({p.version} →{' '}
                                                    {typeof p.update === 'object' && p.update && 'new_version' in p.update
                                                      ? (p.update as { new_version?: string }).new_version
                                                      : String(p.update)}
                                                    )
                                                  </Box>
                                                </SoftTypography>
                                              </li>
                                            ))}
                                          </SoftBox>
                                        </SoftBox>
                                      )}
                                      {themesNeedingUpdate.length > 0 && (
                                        <SoftBox flex={1}>
                                          <SoftTypography variant="caption" fontWeight="bold" color="secondary" display="block" sx={{ mb: 1 }}>
                                            Themes
                                          </SoftTypography>
                                          <SoftBox component="ul" sx={{ m: 0, pl: 2 }}>
                                            {themesNeedingUpdate.map((t) => (
                                              <li key={t.stylesheet}>
                                                <SoftTypography variant="caption" component="span">
                                                  {t.name}{' '}
                                                  <Box component="span" sx={{ opacity: 0.8 }}>
                                                    ({t.version})
                                                  </Box>
                                                </SoftTypography>
                                              </li>
                                            ))}
                                          </SoftBox>
                                        </SoftBox>
                                      )}
                                    </SoftBox>
                                  )}
                                </SoftBox>
                              </Collapse>
                            </SoftBox>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </SoftBox>
          </ScrollableBox>
        )}
      </SoftBox>

      <Menu anchorEl={menuAnchor?.el} open={Boolean(menuAnchor)} onClose={closeMenu} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        {menuAnchor &&
          (() => {
            const site = rows.find((r) => r.site.$id === menuAnchor.siteId)?.site;
            if (!site) return null;
            const pending = getSitePendingUpdates(site);
            const siteConnected = site.status === 'connected';
            const canRun = siteConnected && !busy;
            return (
              <>
                <MenuItem
                  disabled={!canRun || pending.pluginUpdateCount + pending.themeUpdateCount === 0}
                  onClick={() => {
                    closeMenu();
                    void runUpdateAll(site);
                  }}
                >
                  Update all
                </MenuItem>
                <MenuItem
                  disabled={!canRun || pending.pluginUpdateCount === 0}
                  onClick={() => {
                    closeMenu();
                    void runUpdateAllPlugins(site);
                  }}
                >
                  Update all plugins
                </MenuItem>
                <MenuItem
                  disabled={!canRun || pending.themeUpdateCount === 0}
                  onClick={() => {
                    closeMenu();
                    void runUpdateAllThemes(site);
                  }}
                >
                  Update all themes
                </MenuItem>
              </>
            );
          })()}
      </Menu>
    </Card>
  );
};

export default DashboardUpdatesTable;
