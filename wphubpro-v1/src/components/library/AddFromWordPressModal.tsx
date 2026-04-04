/**
 * Modal to search and add plugins from WordPress.org to the library
 */
import React, { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import SoftInput from 'components/SoftInput';

import { useSearchWpPlugins, useAddOfficialPlugin } from '../../hooks/useLibrary';
import { useLibraryItems } from '../../hooks/useLibrary';

const DEBOUNCE_MS = 400;

interface AddFromWordPressModalProps {
  open: boolean;
  onClose: () => void;
  /** When adding another version under the same plugin slug, use this slug/name */
  prefillPluginSlug?: string;
  prefillPluginName?: string;
  /** Initial search term when opening (e.g. after prefill from Add to library) */
  initialSearchTerm?: string;
}

const AddFromWordPressModal: React.FC<AddFromWordPressModalProps> = ({
  open,
  onClose,
  prefillPluginSlug,
  prefillPluginName,
  initialSearchTerm,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: libraryItems = [] } = useLibraryItems();
  const { data: searchResults = [], isLoading: searchLoading } = useSearchWpPlugins(debouncedSearch);
  const addMutation = useAddOfficialPlugin();

  useEffect(() => {
    if (open && initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
      setDebouncedSearch(initialSearchTerm.trim());
    } else if (open && !initialSearchTerm) {
      setSearchTerm('');
      setDebouncedSearch('');
    }
  }, [open, initialSearchTerm]);

  useEffect(() => {
    if (!open) return;
    if (initialSearchTerm && searchTerm === initialSearchTerm) return;
    if (initialSearchTerm && searchTerm === '' && debouncedSearch === '') return;
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm, open, initialSearchTerm, debouncedSearch]);

  const isInLibrary = useCallback(
    (slug: string) => {
      const targetSlug = (prefillPluginSlug || slug).toLowerCase();
      return libraryItems.some((i) => (i.wpSlug ?? '').toLowerCase() === targetSlug);
    },
    [libraryItems, prefillPluginSlug]
  );

  const handleAdd = (plugin: { name: string; slug: string; version: string; author: string; short_description?: string }) => {
    addMutation.mutate(
      {
        name: plugin.name,
        slug: plugin.slug,
        version: plugin.version,
        author: typeof plugin.author === 'string' ? plugin.author : '',
        short_description: plugin.short_description ?? '',
        ...(prefillPluginSlug && { prefillPluginSlug, prefillPluginName: prefillPluginName ?? plugin.name }),
      },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid', borderColor: 'grey.200' }}>
        <SoftBox display="flex" alignItems="center" justifyContent="space-between">
          <SoftTypography variant="h5" fontWeight="bold">
            Add from WordPress.org
          </SoftTypography>
          <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: 'grey.600' }}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
      </DialogTitle>
      <DialogContent sx={{ overflowX: 'hidden', pt: 3, pb: 2 }}>
        <SoftBox sx={{ minWidth: 0 }}>
          <SoftBox sx={{ mb: debouncedSearch.length >= 3 && !searchLoading ? 3 : 2 }}>
            <SoftInput
              placeholder="Search plugins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={{ component: 'search', direction: 'left' }}
              sx={{
                borderRadius: 2,
                bgcolor: 'grey.50',
                '& .MuiInputBase-root': {
                  borderRadius: 2,
                  bgcolor: 'grey.50',
                },
              }}
            />
          </SoftBox>
          {debouncedSearch.length < 3 && debouncedSearch.length > 0 && (
            <SoftTypography variant="caption" color="secondary" sx={{ display: 'block', mt: 1 }}>
              Type at least 3 characters to search.
            </SoftTypography>
          )}
          {searchLoading && (
            <SoftBox display="flex" alignItems="center" gap={1.5} py={4}>
              <CircularProgress size={24} />
              <SoftTypography variant="body2" color="secondary">Searching...</SoftTypography>
            </SoftBox>
          )}
          {!searchLoading && debouncedSearch.length >= 3 && searchResults.length === 0 && (
            <SoftBox py={5} textAlign="center">
              <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 1.5 }}>search_off</Icon>
              <SoftTypography variant="body2" color="secondary">No plugins found.</SoftTypography>
            </SoftBox>
          )}
          {!searchLoading && searchResults.length > 0 && (
            <SoftBox
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 2.5,
                maxHeight: 420,
                overflow: 'auto',
                minWidth: 0,
                width: '100%',
                py: 0.5,
                px: 0.5,
                mx: -0.5,
                '&::-webkit-scrollbar': { width: 8 },
                '&::-webkit-scrollbar-track': { bgcolor: 'grey.100', borderRadius: 1 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 1 },
                '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'grey.400' },
              }}
            >
              {searchResults.map((plugin: { name: string; slug: string; version: string; author: string; short_description?: string }) => {
                const alreadyAdded = isInLibrary(plugin.slug);
                return (
                  <SoftBox
                    key={plugin.slug}
                    p={2}
                    sx={{
                      border: '1px solid',
                      borderColor: 'grey.200',
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                      minHeight: 0,
                      minWidth: 0,
                      overflow: 'hidden',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        borderColor: 'grey.300',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      },
                    }}
                  >
                    <SoftBox flex={1} minWidth={0} display="flex" gap={1.5} alignItems="flex-start">
                      <SoftBox
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          flexShrink: 0,
                          bgcolor: 'grey.100',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <SoftBox
                          component="img"
                          src={`https://ps.w.org/${plugin.slug}/assets/icon-128x128.png`}
                          alt=""
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          sx={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 1 }}
                        />
                        <Icon sx={{ position: 'absolute', fontSize: 24, color: 'grey.400', zIndex: 0 }}>extension</Icon>
                      </SoftBox>
                      <SoftBox flex={1} minWidth={0}>
                        <SoftTypography variant="button" fontWeight="bold" display="block" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {plugin.name}
                        </SoftTypography>
                        <SoftTypography variant="caption" color="secondary" display="block" sx={{ mt: 0.5 }}>
                          {plugin.author?.replace?.(/<[^>]*>/g, '') || 'Unknown'} · v{plugin.version}
                        </SoftTypography>
                        {plugin.short_description && (
                          <SoftTypography
                            variant="caption"
                            color="text"
                            sx={{
                              mt: 1.25,
                              display: '-webkit-box',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {plugin.short_description}
                          </SoftTypography>
                        )}
                      </SoftBox>
                    </SoftBox>
                    <SoftButton
                      variant="gradient"
                      color="info"
                      size="small"
                      onClick={() => handleAdd(plugin)}
                      disabled={(!prefillPluginSlug && alreadyAdded) || addMutation.isPending}
                      sx={{ alignSelf: 'flex-start', flexShrink: 0 }}
                    >
                      {alreadyAdded ? 'Added' : 'Add'}
                    </SoftButton>
                  </SoftBox>
                );
              })}
            </SoftBox>
          )}
        </SoftBox>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'grey.200', bgcolor: 'grey.50' }}>
        <SoftButton variant="outlined" color="secondary" onClick={onClose}>
          Close
        </SoftButton>
      </DialogActions>
    </Dialog>
  );
};

export default AddFromWordPressModal;
