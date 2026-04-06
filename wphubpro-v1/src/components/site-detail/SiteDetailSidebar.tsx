/**
 * Site Detail Sidebar - Site Details card (name, URL, technical info, actions)
 * Tab navigation is rendered at the top of the page as a horizontal menu.
 */
import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';

import SoftBox from 'components/SoftBox';
import { iconButtonOnBlueGradientSmSx } from '../../theme/detailPageStyles';
import SoftTypography from 'components/SoftTypography';
import { StatusIcon, HealthScoreBadge, formatHeartbeatForCard } from '../sites/SitesTableCells';
import { useCheckSiteHealth, useUpdateSite, useReconnectSite } from '../../domains/sites';
import type { Site } from '../../types';

/** Parse wp_meta from site (synced by bridge). */
function parseWpMeta(site: Site): { wp_version?: string; php_version?: string; [key: string]: unknown } | null {
  const raw = site.wpMeta;
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

const infoGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';
const orangeGradient = 'linear-gradient(310deg, #ea580c, #fb923c)';

const HEARTBEAT_INTERVAL_MS = 60_000; // 1 minute

/** Progress 0–100% until next heartbeat (fills over 60s). Resets to 0 when heartbeatAt updates (new heartbeat received). */
function useHeartbeatProgress(heartbeatAt: string | undefined): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!heartbeatAt) {
      setProgress(0);
      return;
    }
    const update = () => {
      const elapsed = Date.now() - new Date(heartbeatAt).getTime();
      const p = Math.min(100, (elapsed / HEARTBEAT_INTERVAL_MS) * 100);
      setProgress(p);
    };
    update(); // Reset immediately when heartbeatAt changes (new heartbeat)
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [heartbeatAt]);
  return progress;
}

interface SiteDetailSidebarProps {
  site: Site;
  onEdit: () => void;
  onRemove: () => void;
}

function parseSiteMeta(site: Site): Record<string, unknown> {
  if (!site.metaData) return {};
  try {
    const parsed = JSON.parse(site.metaData);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}


const SiteDetailSidebar: React.FC<SiteDetailSidebarProps> = ({
  site,
  onEdit,
  onRemove,
}) => {
  const checkHealth = useCheckSiteHealth(site.$id);
  const updateSite = useUpdateSite();
  const reconnect = useReconnectSite(site.$id);
  const wpMeta = parseWpMeta(site);
  const connStatus = site.connectionStatus;
  const showReconnect = connStatus?.status === 'disconnected';
  const heartbeatProgress = useHeartbeatProgress(
    connStatus?.status === 'connected' ? connStatus?.heartbeatUpdatedAt : undefined
  );
  const handleToggleEnabled = () => {
    const meta = parseSiteMeta(site);
    meta.enabled = !(site.enabled !== false);
    updateSite.mutate({ siteId: site.$id, metaData: JSON.stringify(meta) });
  };
  const siteName = site.siteName || 'Unnamed site';
  const siteUrl = site.siteUrl || '';
  const fullUrl = siteUrl && !siteUrl.startsWith('http') ? `https://${siteUrl}` : siteUrl;

  return (
    <SoftBox display="flex" flexDirection="column" gap={2} sx={{ alignSelf: 'flex-start' }}>
      {/* Site Details Card - sticky on scroll */}
      <Card sx={{
        position: 'sticky',
        top: 8,
        zIndex: 1,
        background: infoGradient,
        color: 'white',
        boxShadow: '6px 6px 14px rgba(0,0,0,0.25), -3px -3px 8px rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.2)',
        '& .MuiTypography-root, & .MuiBadge-root': { color: 'white !important' },
      }}>
        <SoftBox p={2} sx={{ color: 'white', '& .MuiTypography-root': { color: 'white !important' } }}>
          <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <SoftBox flex={1} minWidth={0} display="flex" alignItems="center" gap={0.5}>
              <SoftTypography variant="h6" fontWeight="bold" color="white">
                {siteName}
              </SoftTypography>
              <Tooltip title={site.enabled !== false ? 'Site on – turn off' : 'Site off – turn on'} placement="top">
                <Switch
                  checked={site.enabled !== false}
                  onChange={handleToggleEnabled}
                  size="small"
                  sx={{
                    width: 34,
                    height: 14,
                    padding: 0,
                    '& .MuiSwitch-switchBase': {
                      padding: 0,
                      top: '50%',
                      transform: 'translate(2px, -50%)',
                      '&.Mui-checked': {
                        transform: 'translate(20px, -50%)',
                        '& + .MuiSwitch-track': {
                          background: orangeGradient,
                          opacity: 1,
                          boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.2)',
                        },
                      },
                    },
                    '& .MuiSwitch-track': {
                      width: 34,
                      height: 14,
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.3)',
                      opacity: 1,
                      border: '1.5px solid rgba(255,255,255,0.5)',
                      boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.2), 2px 2px 4px rgba(0,0,0,0.1)',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      borderColor: 'rgba(255,255,255,0.6)',
                    },
                    '& .MuiSwitch-thumb': {
                      width: 12,
                      height: 12,
                      background: 'white',
                      top: '50%',
                      boxShadow: '4px 4px 8px rgba(0,0,0,0.25), -2px -2px 4px rgba(255,255,255,0.5)',
                      border: '1px solid rgba(0,0,0,0.08)',
                    },
                  }}
                />
              </Tooltip>
            </SoftBox>
            <SoftBox display="flex" alignItems="center" gap={0.5} flexShrink={0} ml={1}>
              <Tooltip title="Edit" placement="top">
                <IconButton size="small" onClick={onEdit} sx={iconButtonOnBlueGradientSmSx}>
                  <Icon sx={{ fontSize: 14 }}>edit</Icon>
                </IconButton>
              </Tooltip>
              <Tooltip title="Remove" placement="top">
                <IconButton size="small" onClick={onRemove} sx={iconButtonOnBlueGradientSmSx}>
                  <Icon sx={{ fontSize: 14 }}>delete</Icon>
                </IconButton>
              </Tooltip>
            </SoftBox>
          </SoftBox>
          {siteUrl && (
            <a
              href={fullUrl}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none', color: 'white' }}
            >
              <SoftTypography
                variant="caption"
                color="white"
                sx={{ display: 'block', wordBreak: 'break-all', '&:hover': { textDecoration: 'underline' } }}
              >
                {siteUrl}
              </SoftTypography>
            </a>
          )}

          {/* Technical details */}
          <SoftBox mt={2} pt={2} borderTop="1px solid rgba(255,255,255,0.3)">
            <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <SoftTypography variant="caption" fontWeight="bold" color="white">
                Technical details
              </SoftTypography>
              <SoftBox display="flex" flexDirection="column" alignItems="center">
                <SoftTypography variant="caption" color="white" sx={{ mb: 0.5 }}>
                  Health Score
                </SoftTypography>
                <HealthScoreBadge site={site} size={56} />
              </SoftBox>
            </SoftBox>

            <SoftBox display="flex" alignItems="flex-start" gap={1} mb={1.5} flexWrap="wrap">
              <Tooltip
                title={
                  site.enabled === false
                    ? 'Enable site to check connection'
                    : showReconnect
                      ? 'Opnieuw verbinden'
                      : connStatus?.status === 'connected' && connStatus?.heartbeatUpdatedAt
                        ? heartbeatProgress >= 100
                          ? 'Waiting for heartbeat…'
                          : `Next heartbeat in ${Math.round(((100 - heartbeatProgress) / 100) * 60)}s`
                        : site.status === 'connected'
                          ? 'Verbonden – klik om te controleren'
                          : 'Losgekoppeld – klik om te controleren'
                }
                placement="top"
              >
                <SoftBox
                  component="button"
                  type="button"
                  onClick={() => {
                    if (site.enabled === false) return;
                    if (showReconnect) reconnect.mutate();
                    else checkHealth.mutate();
                  }}
                  disabled={(showReconnect ? reconnect.isPending : checkHealth.isPending) || site.enabled === false}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    width: 36,
                    height: 36,
                    border: 'none',
                    borderRadius: '50%',
                    cursor: site.enabled === false ? 'default' : 'pointer',
                    opacity: (showReconnect ? reconnect.isPending : checkHealth.isPending) || site.enabled === false ? 0.7 : 1,
                    pointerEvents: site.enabled === false ? 'none' : undefined,
                    background: 'white',
                    boxShadow: '4px 4px 10px rgba(0,0,0,0.2), -2px -2px 6px rgba(255,255,255,0.3)',
                    transition: 'box-shadow 0.2s ease',
                    '&:hover': site.enabled !== false && !reconnect.isPending && !checkHealth.isPending
                      ? { boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.15)' }
                      : undefined,
                    '&:active': site.enabled !== false && !reconnect.isPending && !checkHealth.isPending
                      ? { boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.2)' }
                      : undefined,
                  }}
                >
                  {connStatus?.status === 'connected' && connStatus?.heartbeatUpdatedAt ? (
                    <>
                      <svg
                        width={36}
                        height={36}
                        style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
                      >
                        <defs>
                          <linearGradient id="progressOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ea580c" />
                            <stop offset="100%" stopColor="#fb923c" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx={18}
                          cy={18}
                          r={14}
                          fill="none"
                          stroke="url(#progressOrange)"
                          strokeWidth={4}
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 14}
                          strokeDashoffset={2 * Math.PI * 14 * (1 - heartbeatProgress / 100)}
                        />
                      </svg>
                      <SoftBox
                        sx={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'white',
                          padding: '5px',
                          boxSizing: 'border-box',
                          '& .MuiSvgIcon-root': {
                            fontSize: '0.85rem !important',
                            background: orangeGradient,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent !important',
                          },
                        }}
                      >
                        <StatusIcon value={site.status} />
                      </SoftBox>
                    </>
                  ) : (
                    <SoftBox
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'white',
                        padding: '5px',
                        boxSizing: 'border-box',
                        '& .MuiSvgIcon-root': {
                          fontSize: '1rem !important',
                          background: orangeGradient,
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          color: 'transparent !important',
                        },
                      }}
                    >
                      <StatusIcon value={site.status} />
                    </SoftBox>
                  )}
                </SoftBox>
              </Tooltip>
              <SoftBox flex={1} minWidth={0}>
                {connStatus?.status === 'connected' ? (
                  <Tooltip title={connStatus?.heartbeatUpdatedAt ? new Date(connStatus.heartbeatUpdatedAt).toLocaleString('nl-NL') : ''} placement="top">
                    <SoftBox>
                      <SoftTypography variant="caption" color="white" component="span" sx={{ display: 'block' }}>
                        WPHub is connected to your site.
                      </SoftTypography>
                      <SoftTypography variant="caption" color="white" component="span" sx={{ display: 'block', mb: 0.5 }}>
                        Last received heartbeat {formatHeartbeatForCard(connStatus?.heartbeatUpdatedAt)}.
                      </SoftTypography>
                    </SoftBox>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip title={(connStatus?.heartbeatUpdatedAt || (site as any).heartbeatUpdatedAt) ? new Date(connStatus?.heartbeatUpdatedAt || (site as any).heartbeatUpdatedAt).toLocaleString('nl-NL') : ''} placement="top">
                      <SoftBox>
                        <SoftTypography variant="caption" color="white" component="span" sx={{ display: 'block' }}>
                          WPHub Pro could not connect to your site.
                        </SoftTypography>
                        <SoftTypography variant="caption" color="white" component="span" sx={{ display: 'block', mb: 0.5 }}>
                          Last received heartbeat {formatHeartbeatForCard(connStatus?.heartbeatUpdatedAt || (site as any).heartbeatUpdatedAt)}.
                        </SoftTypography>
                      </SoftBox>
                    </Tooltip>
                    <Tooltip title="Click the connection button to trigger a manual check" placement="top">
                      <SoftBox display="flex" alignItems="center" gap={0.5} mt={0.5} sx={{ opacity: 0.9 }}>
                        <Icon sx={{ fontSize: 14, color: 'white !important' }}>info</Icon>
                        <SoftTypography variant="caption" color="white">Poke your site manually</SoftTypography>
                      </SoftBox>
                    </Tooltip>
                  </>
                )}
              </SoftBox>
            </SoftBox>

            <Grid container spacing={1}>
              <Grid item xs={6}>
                <SoftTypography variant="caption" color="white">WordPress</SoftTypography>
                <SoftTypography variant="button" display="block" color="white">{wpMeta?.wp_version || (site as any).wpVersion || site.wpVersion || '—'}</SoftTypography>
              </Grid>
              <Grid item xs={6}>
                <SoftTypography variant="caption" color="white">PHP</SoftTypography>
                <SoftTypography variant="button" display="block" color="white">{wpMeta?.php_version || (site as any).phpVersion || site.phpVersion || '—'}</SoftTypography>
              </Grid>
              <Grid item xs={6}>
                <SoftTypography variant="caption" color="white">Disk space</SoftTypography>
                <SoftTypography variant="button" display="block" color="white">—</SoftTypography>
              </Grid>
              <Grid item xs={6}>
                <SoftTypography variant="caption" color="white">Memory limit</SoftTypography>
                <SoftTypography variant="button" display="block" color="white">—</SoftTypography>
              </Grid>
            </Grid>
          </SoftBox>
        </SoftBox>
      </Card>
    </SoftBox>
  );
};

export default SiteDetailSidebar;
