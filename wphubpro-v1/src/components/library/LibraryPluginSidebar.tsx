/**
 * Library Plugin Sidebar - Plugin info card (same style as SiteDetailSidebar)
 */
import React from 'react';
import Card from '@mui/material/Card';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import { iconButtonOnBlueGradientSx } from '../../theme/detailPageStyles';

const infoGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';

const actionIconButtonSx = iconButtonOnBlueGradientSx;

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  const el = document.createElement('div');
  el.innerHTML = text;
  return el.textContent || el.innerText || text;
}

interface LibraryPluginSidebarProps {
  displayName: string;
  descriptionText: string;
  defaultVersion: string;
  latestKnownVersion: string;
  displayAuthor: string;
  authorUrl?: string;
  onRemove: () => void;
  onInstall: () => void;
  installDisabled: boolean;
  /** Add this plugin slug to a user collection */
  onAddToCollection?: () => void;
}

const LibraryPluginSidebar: React.FC<LibraryPluginSidebarProps> = ({
  displayName,
  descriptionText,
  defaultVersion,
  latestKnownVersion,
  displayAuthor,
  authorUrl,
  onRemove,
  onInstall,
  installDisabled,
  onAddToCollection,
}) => {
  return (
    <SoftBox display="flex" flexDirection="column" gap={2} sx={{ alignSelf: 'flex-start' }}>
      <Card
        sx={{
          position: 'sticky',
          top: 8,
          zIndex: 1,
          background: infoGradient,
          color: 'white',
          boxShadow: '6px 6px 14px rgba(0,0,0,0.25), -3px -3px 8px rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.2)',
          '& .MuiTypography-root': { color: 'white !important' },
        }}
      >
        <SoftBox p={2} sx={{ color: 'white', '& .MuiTypography-root': { color: 'white !important' } }}>
          <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={1} gap={1}>
            <SoftTypography variant="h6" fontWeight="bold" color="white" sx={{ flex: 1, minWidth: 0 }}>
              {decodeHtmlEntities(displayName)}
            </SoftTypography>
            <SoftBox display="flex" alignItems="center" gap={0.5} flexShrink={0}>
              {authorUrl ? (
                <a href={authorUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  {displayAuthor || '—'}
                </a>
              ) : (
                <SoftTypography variant="caption" color="white" sx={{ opacity: 0.9 }}>{displayAuthor || '—'}</SoftTypography>
              )}
            </SoftBox>
          </SoftBox>

          {descriptionText && (
            <SoftBox mb={1.5}>
              <SoftTypography variant="caption" color="white" sx={{ display: 'block', opacity: 0.95 }}>
                {decodeHtmlEntities(descriptionText.slice(0, 200) + (descriptionText.length > 200 ? '…' : ''))}
              </SoftTypography>
            </SoftBox>
          )}

          <SoftBox mt={2} pt={2} borderTop="1px solid rgba(255,255,255,0.3)">
            <SoftBox display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
              <SoftBox>
                <SoftTypography variant="caption" color="white" sx={{ opacity: 0.9 }}>Default version</SoftTypography>
                <SoftTypography variant="button" display="block" color="white">{defaultVersion || '—'}</SoftTypography>
              </SoftBox>
              <SoftBox>
                <SoftTypography variant="caption" color="white" sx={{ opacity: 0.9 }}>Latest known</SoftTypography>
                <SoftTypography variant="button" display="block" color="white">{latestKnownVersion}</SoftTypography>
              </SoftBox>
            </SoftBox>
          </SoftBox>

          <SoftBox display="flex" justifyContent="flex-end" gap={0.75} mt={2} pt={2} borderTop="1px solid rgba(255,255,255,0.3)">
            <Tooltip title="Install on sites (default version)">
              <span>
                <IconButton size="small" onClick={onInstall} disabled={installDisabled} sx={actionIconButtonSx}>
                  <Icon sx={{ fontSize: 16, color: '#fff !important' }}>download</Icon>
                </IconButton>
              </span>
            </Tooltip>
            {onAddToCollection ? (
              <Tooltip title="Add to collection" placement="top">
                <IconButton size="small" onClick={onAddToCollection} sx={actionIconButtonSx}>
                  <Icon sx={{ fontSize: 16, color: '#fff !important' }}>playlist_add</Icon>
                </IconButton>
              </Tooltip>
            ) : null}
            <Tooltip title="Remove from library" placement="top">
              <IconButton size="small" onClick={onRemove} sx={actionIconButtonSx}>
                <Icon sx={{ fontSize: 16, color: '#fff !important' }}>delete</Icon>
              </IconButton>
            </Tooltip>
          </SoftBox>
        </SoftBox>
      </Card>
    </SoftBox>
  );
};

export default LibraryPluginSidebar;
