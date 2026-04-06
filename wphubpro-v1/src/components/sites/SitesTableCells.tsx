/**
 * Shared table cells for Sites DataTable - used by SitesPage and Dashboard
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftBadge from 'components/SoftBadge';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import { Site } from '../../types';
import { useDeleteSite, useUpdateSite } from '../../domains/sites';
import { getBridgePluginVersionFromSite } from '../../domains/sites/bridgeVersion';
import { iconButtonOnLightSurfaceSx } from '../../theme/detailPageStyles';

function parseSiteMeta(site: Site): Record<string, unknown> {
  if (!site.metaData) return {};
  try {
    const parsed = JSON.parse(site.metaData);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

const infoGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';
const orangeGradient = 'linear-gradient(310deg, #ea580c, #fb923c)';

const neumorphicExtruded = {
  boxShadow: '4px 4px 10px rgba(0,0,0,0.15), -2px -2px 6px rgba(255,255,255,0.4)',
};
const neumorphicPressed = {
  boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.15)',
};

interface SiteCellProps {
  value: [string, { url: string }];
  siteId?: string;
  linkToDetails?: boolean;
}

export const SiteCell: React.FC<SiteCellProps> = ({ value: [name, data], siteId, linkToDetails = false }) => {
  const content = (
    <SoftBox display="flex" alignItems="center">
    <SoftBox
      mx={2}
      display="flex"
      alignItems="center"
      justifyContent="center"
      width="3rem"
      height="3rem"
      borderRadius="md"
      shadow="neumorphic"
      sx={{ background: infoGradient }}
    >
      <Icon sx={{ color: 'white !important' }}>public</Icon>
    </SoftBox>
    <SoftBox>
      {linkToDetails && siteId ? (
        <Link to={`/sites/${siteId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <SoftTypography variant="button" fontWeight="medium" sx={{ '&:hover': { textDecoration: 'underline' } }}>
            {name || 'Untitled'}
          </SoftTypography>
        </Link>
      ) : (
        <SoftTypography variant="button" fontWeight="medium">{name || 'Untitled'}</SoftTypography>
      )}
      {data?.url && (data.url.startsWith('http') ? (
        <a href={data.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit', fontSize: '0.75rem', display: 'block', opacity: 0.7 }} title={data.url}>
          <SoftTypography variant="caption" color="secondary" component="span" sx={{ '&:hover': { textDecoration: 'underline' } }}>{data.url}</SoftTypography>
        </a>
      ) : (
        <SoftTypography variant="caption" color="secondary" display="block">{data.url || '-'}</SoftTypography>
      ))}
    </SoftBox>
  </SoftBox>
  );
  return content;
};

export const BridgeVersionCell: React.FC<{ site: Site }> = ({ site }) => {
  const v = getBridgePluginVersionFromSite(site);
  return (
    <SoftTypography variant="caption" color="secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>
      {v ?? '—'}
    </SoftTypography>
  );
};

export const StatusIcon: React.FC<{ value: Site['status'] }> = ({ value }) => {
  const isConnected = value === 'connected';
  return (
    <Tooltip title={isConnected ? 'Verbonden' : 'Losgekoppeld'} placement="top">
      <SoftBox sx={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}>
        <Icon
          sx={{
            fontSize: '1.5rem !important',
            ...(isConnected
              ? {
                  background: orangeGradient,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent !important',
                }
              : {
                  background: 'none !important',
                  backgroundClip: 'unset',
                  WebkitBackgroundClip: 'unset',
                  color: '#9e9e9e !important',
                }),
          }}
        >
          {isConnected ? 'flash_on' : 'flash_off'}
        </Icon>
      </SoftBox>
    </Tooltip>
  );
};

function hasUpdate(p: { update?: string | { new_version?: string } | null }): boolean {
  if (p.update == null) return false;
  if (typeof p.update === 'object') return !!(p.update.new_version && String(p.update.new_version).trim());
  return String(p.update).trim() !== '';
}

function parsePluginsForHealth(meta: string | undefined): { update: string | null }[] {
  if (!meta || typeof meta !== 'string') return [];
  try {
    const arr = JSON.parse(meta);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function parseThemesForHealth(meta: string | undefined): { update?: string | null }[] {
  if (!meta || typeof meta !== 'string') return [];
  try {
    const arr = JSON.parse(meta);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export type HealthScoreLevel = 'Terrible' | 'Bad' | 'Ok' | 'Good' | 'Excellent';

export function computeSiteHealthScore(site: Site): { score: number; level: HealthScoreLevel } {
  const plugins = parsePluginsForHealth(site.pluginsMeta);
  const themes = parseThemesForHealth(site.themesMeta);
  const pluginUpdates = plugins.filter(hasUpdate).length;
  const themeUpdates = themes.filter((t) => hasUpdate(t as any)).length;
  const totalUpdates = pluginUpdates + themeUpdates;

  if (totalUpdates === 0) return { score: 5.0, level: 'Excellent' };
  if (totalUpdates <= 2) return { score: 4.0, level: 'Good' };
  if (totalUpdates <= 5) return { score: 3.0, level: 'Ok' };
  if (totalUpdates <= 10) return { score: 2.0, level: 'Bad' };
  return { score: 1.0, level: 'Terrible' };
}

const HEALTH_ORANGE = 'linear-gradient(310deg, #ea580c, #fb923c)';

/** Circular progress ring: score 1–5 maps to 20–100%, orange fill, blue track, white center, orange gradient score text */
export const HealthScoreBadge: React.FC<{ site: Site; size?: number }> = ({ site, size: sizeProp = 36 }) => {
  const { score, level } = computeSiteHealthScore(site);
  const size = sizeProp;
  const strokeWidth = Math.max(2, Math.round(size / 12));
  const r = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * r;
  const percent = (score / 5) * 100;
  const offset = circumference * (1 - percent / 100);
  const gradientId = `health-score-orange-${site.$id || 'default'}`;
  const fontSize = size <= 36 ? '0.6rem' : size <= 56 ? '0.85rem' : '1rem';

  return (
    <Tooltip title={level} placement="top">
      <SoftBox
        sx={{
          width: size,
          height: size,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
            <linearGradient id={`${gradientId}-blue`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F5482" />
              <stop offset="100%" stopColor="#7a8ef0" />
            </linearGradient>
          </defs>
          {/* Unfilled track – blue gradient */}
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={`url(#${gradientId}-blue)`}
            strokeWidth={strokeWidth}
          />
          {/* Progress fill – orange gradient */}
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        {/* White inner circle with score – orange gradient text */}
        <SoftBox
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: size - strokeWidth * 2 - 4,
            height: size - strokeWidth * 2 - 4,
            borderRadius: '50%',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SoftTypography
            variant="caption"
            fontWeight="bold"
            sx={{
              fontSize,
              background: HEALTH_ORANGE,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            {score.toFixed(1)}
          </SoftTypography>
        </SoftBox>
      </SoftBox>
    </Tooltip>
  );
};

/** Format heartbeat timestamp as relative: "A minute ago", "Earlier today", "Yesterday", "A while ago" */
export function formatHeartbeatRelative(iso: string | undefined): string {
  if (!iso || !String(iso).trim()) return 'Never';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 2) return 'A minute ago';
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHours < 24 && d.getDate() === now.getDate()) return 'Earlier today';
    if (diffDays === 1 || (diffDays < 2 && d.getDate() === now.getDate() - 1)) return 'Yesterday';
    return 'A while ago';
  } catch {
    return 'Never';
  }
}

/** Format heartbeat for site details card: "14:30", "Yesterday 14:30", "Jan 01, 14:30" */
export function formatHeartbeatForCard(iso: string | undefined): string {
  if (!iso || !String(iso).trim()) return 'Never';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Never';
    const now = new Date();
    const timeStr = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      return timeStr;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) {
      return `Yesterday ${timeStr}`;
    }
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return 'Never';
  }
}

/** @deprecated Use HealthScoreBadge for sites table. Kept for SiteDetailSidebar Technical details. */
export const HealthBadge: React.FC<{ value: Site['healthStatus'] }> = ({ value }) => {
  const config: Record<string, { color: 'info' | 'error'; label: string }> = {
    healthy: { color: 'info', label: 'Healthy' },
    bad: { color: 'error', label: 'Bad' },
  };
  const c = config[value] || config.bad;
  return <SoftBadge variant="gradient" color={c.color} size="xs" badgeContent={c.label} container />;
};

/** On/Off toggle button – when off, site is excluded from stats and no bridge API calls. */
export const SiteEnabledToggle: React.FC<{
  enabled: boolean;
  onToggle: () => void;
  size?: 'small' | 'normal';
}> = ({ enabled, onToggle, size = 'normal' }) => {
  const sz = size === 'small' ? 28 : 32;
  return (
    <Tooltip title={enabled ? 'Site on – click to turn off' : 'Site off – click to turn on'} placement="top">
      <SoftBox
        component="button"
        type="button"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation?.();
          onToggle();
        }}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: sz,
          height: sz,
          borderRadius: '50%',
          background: enabled ? orangeGradient : 'grey.400',
          color: 'white',
          cursor: 'pointer',
          border: 'none',
          ...neumorphicExtruded,
          transition: 'box-shadow 0.2s ease',
          '&:hover': neumorphicPressed,
          '&:active': { boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.2)' },
        }}
      >
        <Icon sx={{ fontSize: size === 'small' ? 16 : 18, color: 'white !important' }}>{enabled ? 'power' : 'power_off'}</Icon>
      </SoftBox>
    </Tooltip>
  );
};

export const ActionIconButton: React.FC<{
  icon: string;
  title: string;
  color?: 'info' | 'error' | 'success';
  onClick?: () => void;
  disabled?: boolean;
}> = ({ icon, title, onClick, disabled = false }) => {
  const bg = infoGradient;
  return (
    <Tooltip title={title} placement="top">
      <span style={{ display: 'inline-flex' }}>
        <SoftBox
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: bg,
            color: 'white',
            cursor: disabled ? 'default' : onClick ? 'pointer' : 'inherit',
            opacity: disabled ? 0.6 : 1,
            pointerEvents: disabled ? 'none' : undefined,
            ...neumorphicExtruded,
            transition: 'box-shadow 0.2s ease',
            '&:hover': onClick && !disabled ? neumorphicPressed : undefined,
            '&:active': onClick && !disabled ? { boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.2)' } : undefined,
          }}
          component={onClick && !disabled ? 'button' : 'span'}
          onClick={disabled ? undefined : onClick}
          {...(onClick && !disabled && { type: 'button' as const })}
        >
          <Icon sx={{ fontSize: 18, color: 'white !important' }}>{icon}</Icon>
        </SoftBox>
      </span>
    </Tooltip>
  );
};

export const ActionCell: React.FC<{
  siteId: string;
  siteUrl: string;
  site?: Site;
  showPinButton?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  compact?: boolean;
}> = ({ siteId, siteUrl, site, showPinButton = false, isPinned = false, onTogglePin, compact = false }) => {
  const deleteSite = useDeleteSite();
  const updateSite = useUpdateSite();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleToggleEnabled = () => {
    if (!site) return;
    const meta = parseSiteMeta(site);
    meta.enabled = !(site.enabled !== false);
    updateSite.mutate({ siteId: site.$id, metaData: JSON.stringify(meta) });
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };
  const handleMenuClose = () => setAnchorEl(null);

  const handleDelete = () => {
    handleMenuClose();
    if (window.confirm('Are you sure you want to remove this site?')) {
      deleteSite.mutate(siteId);
    }
  };

  const handlePin = () => {
    handleMenuClose();
    onTogglePin?.();
  };

  const handleSettings = () => {
    handleMenuClose();
    navigate(`/sites/${siteId}`);
  };

  const handleOpenSite = () => {
    handleMenuClose();
    window.open(siteUrl, '_blank');
  };

  const enabledToggle = site && (
    <SiteEnabledToggle enabled={site.enabled !== false} onToggle={handleToggleEnabled} />
  );

  const pinButton = showPinButton && onTogglePin && (
    <Tooltip title={isPinned ? 'Remove from dashboard' : 'Pin to dashboard'} placement="top">
      <SoftBox
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: isPinned ? 'rgba(79, 84, 130, 0.2)' : infoGradient,
          cursor: 'pointer',
          ...neumorphicExtruded,
          transition: 'box-shadow 0.2s ease',
          '&:hover': neumorphicPressed,
          '&:active': { boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.2)' },
        }}
        component="button"
        type="button"
        onClick={onTogglePin}
      >
        <Icon sx={{ fontSize: 18, color: isPinned ? '#4F5482 !important' : 'white !important' }}>push_pin</Icon>
      </SoftBox>
    </Tooltip>
  );

  const settingsButton = (
    <Link to={`/sites/${siteId}`} style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex' }}>
      <ActionIconButton icon="settings" title="Manage" />
    </Link>
  );

  const openSiteButton = (
    <a href={siteUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex' }}>
      <ActionIconButton icon="open_in_new" title="Open site" />
    </a>
  );

  const deleteButton = (
    <ActionIconButton icon="delete" title="Remove" color="error" onClick={handleDelete} />
  );

  if (compact) {
    return (
      <>
        <Tooltip title="Actions" placement="top">
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={iconButtonOnLightSurfaceSx}
            aria-controls={open ? 'site-actions-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
          >
            <Icon>more_vert</Icon>
          </IconButton>
        </Tooltip>
        <Menu
          id="site-actions-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          MenuListProps={{ 'aria-labelledby': 'site-actions-button' }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {site && (
            <MenuItem onClick={() => { handleToggleEnabled(); handleMenuClose(); }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <SoftBox
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: site.enabled !== false ? infoGradient : 'grey.400',
                  }}
                >
                  <Icon sx={{ fontSize: 16, color: 'white !important' }}>{site.enabled !== false ? 'power' : 'power_off'}</Icon>
                </SoftBox>
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ sx: { fontSize: '0.65rem !important', fontWeight: 700, textTransform: 'uppercase' } }}>{site.enabled !== false ? 'Turn off site' : 'Turn on site'}</ListItemText>
            </MenuItem>
          )}
          {showPinButton && onTogglePin && (
            <MenuItem onClick={handlePin}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <SoftBox
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: isPinned ? 'rgba(249, 115, 22, 0.2)' : infoGradient,
                  }}
                >
                  <Icon sx={{ fontSize: 16, color: isPinned ? '#4F5482 !important' : 'white !important' }}>push_pin</Icon>
                </SoftBox>
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ sx: { fontSize: '0.65rem !important', fontWeight: 700, textTransform: 'uppercase' } }}>{isPinned ? 'Remove from dashboard' : 'Pin to dashboard'}</ListItemText>
            </MenuItem>
          )}
          <MenuItem onClick={handleSettings}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SoftBox
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: infoGradient,
                }}
              >
                <Icon sx={{ fontSize: 16, color: 'white !important' }}>settings</Icon>
              </SoftBox>
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ sx: { fontSize: '0.65rem !important', fontWeight: 700, textTransform: 'uppercase' } }}>Manage</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleOpenSite}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SoftBox
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: infoGradient,
                }}
              >
                <Icon sx={{ fontSize: 16, color: 'white !important' }}>open_in_new</Icon>
              </SoftBox>
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ sx: { fontSize: '0.65rem !important', fontWeight: 700, textTransform: 'uppercase' } }}>Open site</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SoftBox
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: infoGradient,
                }}
              >
                <Icon sx={{ fontSize: 16, color: 'white !important' }}>delete</Icon>
              </SoftBox>
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ sx: { fontSize: '0.65rem !important', fontWeight: 700, textTransform: 'uppercase' } }}>Remove</ListItemText>
          </MenuItem>
        </Menu>
      </>
    );
  }

  return (
    <SoftBox display="flex" alignItems="center" gap={0.5}>
      {enabledToggle}
      {pinButton}
      {settingsButton}
      {openSiteButton}
      {deleteButton}
    </SoftBox>
  );
};
