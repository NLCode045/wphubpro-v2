/**
 * Refresh library default versions for selected plugins (WordPress.org pin, or local → upload / add WP.org).
 */
import React, { useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useQueries } from '@tanstack/react-query';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';

import {
  compareSemverLike,
  pluginGroupNeedsLibraryDefaultUpdate,
  splitPluginItemsBySource,
} from '../../domains/library';
import { getWpPluginInfo, WpPluginInfo } from '../../services/wordpress';
import { useUpdateLibraryItem } from '../../hooks/useLibrary';
import { LibraryItem, LibraryItemType } from '../../types';

export interface LibraryBulkUpdatePluginRow {
  slug: string;
  displayName: string;
  items: LibraryItem[];
}

interface LibraryBulkUpdateModalProps {
  open: boolean;
  onClose: () => void;
  plugins: LibraryBulkUpdatePluginRow[];
  onRequestUploadZip: (slug: string) => void;
  onRequestAddFromWordPress: (slug: string, displayName: string) => void;
}

const LibraryBulkUpdateModal: React.FC<LibraryBulkUpdateModalProps> = ({
  open,
  onClose,
  plugins,
  onRequestUploadZip,
  onRequestAddFromWordPress,
}) => {
  const updateMutation = useUpdateLibraryItem();

  const slugs = useMemo(() => plugins.map((p) => p.slug), [plugins]);

  const wpQueries = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ['wpPluginInfo', slug],
      queryFn: () => getWpPluginInfo(slug),
      enabled: open && slugs.length > 0,
      staleTime: 1000 * 60 * 10,
    })),
  });

  const wpBySlug = useMemo(() => {
    const m = new Map<string, WpPluginInfo | null>();
    slugs.forEach((slug, i) => {
      m.set(slug.toLowerCase(), wpQueries[i]?.data ?? null);
    });
    return m;
  }, [slugs, wpQueries]);

  const wpLoading = wpQueries.some((q) => q.isLoading);

  const rows = useMemo(() => {
    return plugins.map((p) => {
      const wp = wpBySlug.get(p.slug.toLowerCase()) ?? null;
      const needs = pluginGroupNeedsLibraryDefaultUpdate(p.items, wp);
      const { officialItems, localItems, remoteItems } = splitPluginItemsBySource(p.items);
      const wpLatest = (wp?.version ?? '').trim();
      const onlyLocalNoOfficial =
        officialItems.length === 0 && localItems.length > 0 && p.items.every((i) => i.type === LibraryItemType.Plugin);
      const onlyRemoteNoOfficial =
        officialItems.length === 0 && remoteItems.length > 0 && localItems.length === 0;

      return {
        ...p,
        wp,
        needs,
        officialItems,
        wpLatest,
        onlyLocalNoOfficial,
        onlyRemoteNoOfficial,
      };
    });
  }, [plugins, wpBySlug]);

  const handlePinOfficials = (officialItems: LibraryItem[], wpLatest: string) => {
    if (!wpLatest) return;
    const targets = officialItems.filter((o) => {
      if (o.version === 'latest') return true;
      return compareSemverLike(o.version, wpLatest) < 0;
    });
    targets.forEach((item) => {
      updateMutation.mutate({ itemId: item.$id, version: wpLatest });
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update library defaults</DialogTitle>
      <DialogContent>
        <SoftTypography variant="caption" color="secondary" display="block" sx={{ mb: 2 }}>
          Pin your library default to the latest WordPress.org release, or add an official copy / upload a new ZIP for
          local-only items.
        </SoftTypography>
        {wpLoading ? (
          <SoftTypography variant="caption" color="secondary">
            Loading WordPress.org data…
          </SoftTypography>
        ) : null}
        <SoftBox display="flex" flexDirection="column" gap={2}>
          {rows.map((row) => (
            <SoftBox
              key={row.slug}
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <SoftTypography variant="button" fontWeight="bold" display="block">
                {row.displayName}
              </SoftTypography>
              <SoftTypography variant="caption" color="secondary" display="block" sx={{ mb: 1 }}>
                {row.slug}
              </SoftTypography>
              {!row.needs ? (
                <SoftTypography variant="caption" color="success" sx={{ display: 'block' }}>
                  Default is already up to date (or WordPress.org data unavailable).
                </SoftTypography>
              ) : null}
              {row.needs && row.officialItems.length > 0 && row.wpLatest ? (
                <SoftButton
                  size="small"
                  variant="gradient"
                  color="info"
                  disabled={updateMutation.isPending}
                  onClick={() => handlePinOfficials(row.officialItems, row.wpLatest)}
                >
                  Set WordPress.org default to {row.wpLatest}
                </SoftButton>
              ) : null}
              {row.needs && row.onlyLocalNoOfficial ? (
                <SoftBox display="flex" flexDirection="column" gap={1} alignItems="flex-start">
                  <SoftTypography variant="caption" color="secondary">
                    This plugin is only in your library as a local upload. Add the WordPress.org version as the default,
                    or upload a newer ZIP.
                  </SoftTypography>
                  <SoftButton size="small" color="secondary" onClick={() => onRequestUploadZip(row.slug)}>
                    Upload a new version (ZIP)
                  </SoftButton>
                  <SoftButton
                    size="small"
                    variant="outlined"
                    color="info"
                    onClick={() => onRequestAddFromWordPress(row.slug, row.displayName)}
                  >
                    Add from WordPress.org (use latest)
                  </SoftButton>
                </SoftBox>
              ) : null}
              {row.needs && row.onlyRemoteNoOfficial ? (
                <SoftBox display="flex" flexDirection="column" gap={1} alignItems="flex-start">
                  <SoftTypography variant="caption" color="secondary">
                    Remote URL only — add WordPress.org or upload a newer file if a newer release exists on
                    WordPress.org.
                  </SoftTypography>
                  <SoftButton size="small" color="secondary" onClick={() => onRequestUploadZip(row.slug)}>
                    Upload a new version (ZIP)
                  </SoftButton>
                  <SoftButton
                    size="small"
                    variant="outlined"
                    color="info"
                    onClick={() => onRequestAddFromWordPress(row.slug, row.displayName)}
                  >
                    Add from WordPress.org (use latest)
                  </SoftButton>
                </SoftBox>
              ) : null}
              {row.needs && row.officialItems.length === 0 && !row.onlyLocalNoOfficial && !row.onlyRemoteNoOfficial ? (
                <SoftTypography variant="caption" color="warning" sx={{ display: 'block' }}>
                  Mixed sources — open the plugin in the library to set the default version.
                </SoftTypography>
              ) : null}
            </SoftBox>
          ))}
        </SoftBox>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <SoftButton variant="text" color="secondary" onClick={onClose}>
          Close
        </SoftButton>
      </DialogActions>
    </Dialog>
  );
};

export default LibraryBulkUpdateModal;
