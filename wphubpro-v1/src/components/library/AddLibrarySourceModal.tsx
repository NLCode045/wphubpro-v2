/**
 * Modal to add library items: WordPress.org, upload, remote URL, or prefill slug/name then pick a source
 * (for adding another version under the same plugin slug).
 */
import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import SoftInput from 'components/SoftInput';

/** Which upstream to use when adding a version */
export type LibrarySourceKind = 'wordpress.org' | 'library_upload' | 'remote_url';

export type AddLibrarySourcePayload =
  | { mode: 'direct'; source: LibrarySourceKind }
  | { mode: 'prefill'; source: LibrarySourceKind; pluginName: string; pluginSlug: string };

/** Shared with AddPluginVersionModal – bordered choice rows in library dialogs */
export const libraryChoiceListItemSx = {
  borderRadius: 2,
  mb: 1.5,
  py: 2,
  px: 2,
  border: '1px solid',
  borderColor: 'grey.200',
  transition: 'all 0.2s ease',
  '&:hover:not(.Mui-disabled)': {
    borderColor: 'info.main',
    bgcolor: 'action.hover',
    boxShadow: '0 2px 8px rgba(79, 84, 130, 0.15)',
  },
  '&.Mui-disabled': {
    opacity: 0.6,
  },
};

export const libraryChoiceIconWrapSx = {
  width: 48,
  height: 48,
  borderRadius: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: 'grey.100',
  color: 'info.main',
};

/** @deprecated Use `libraryChoiceListItemSx` — alias for older bundles / mixed merges */
export const sourceItemSx = libraryChoiceListItemSx;
/** @deprecated Use `libraryChoiceIconWrapSx` */
export const iconWrapSx = libraryChoiceIconWrapSx;

interface AddLibrarySourceModalProps {
  open: boolean;
  onClose: () => void;
  /** Current tab: plugins or themes. Themes only show Library upload. */
  tab: number;
  onChooseSource: (payload: AddLibrarySourcePayload) => void;
  disabled?: boolean;
  /** When adding version to existing plugin (e.g. from detail view), start at pick-source step */
  existingPluginSlug?: string;
  existingPluginName?: string;
}

type Step = 'source' | 'prefill_name' | 'prefill_pick';

const AddLibrarySourceModal: React.FC<AddLibrarySourceModalProps> = ({
  open,
  onClose,
  tab,
  onChooseSource,
  disabled,
  existingPluginSlug,
  existingPluginName,
}) => {
  const [step, setStep] = useState<Step>('source');
  const [pluginName, setPluginName] = useState('');

  useEffect(() => {
    if (!open) return;
    if (existingPluginSlug && existingPluginName) {
      setPluginName(existingPluginName);
      setStep('prefill_pick');
    } else {
      setStep('source');
      setPluginName('');
    }
  }, [open, existingPluginSlug, existingPluginName]);

  const isPluginsTab = tab === 0;

  const handleClose = () => {
    setStep('source');
    setPluginName('');
    onClose();
  };

  const effectivePluginName = existingPluginName ?? pluginName;
  const effectivePluginSlug =
    existingPluginSlug ??
    (pluginName || existingPluginName || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handlePrefillBackToName = () => setStep('prefill_name');

  const handleDirectSource = (source: LibrarySourceKind) => {
    onChooseSource({ mode: 'direct', source });
    handleClose();
  };

  const handleStartPrefillFlow = () => {
    setStep('prefill_name');
  };

  const handlePrefillNameSubmit = () => {
    const trimmed = pluginName.trim();
    if (!trimmed) return;
    setStep('prefill_pick');
  };

  const handlePrefillPickClick = (source: LibrarySourceKind) => {
    const name = effectivePluginName.trim() || effectivePluginSlug;
    onChooseSource({
      mode: 'prefill',
      source,
      pluginName: name,
      pluginSlug: effectivePluginSlug,
    });
    handleClose();
  };

  const handleBack = () => {
    if (step === 'prefill_pick' && !existingPluginSlug) {
      setStep('prefill_name');
    } else {
      setStep('source');
      setPluginName('');
    }
  };

  const titleForStep = () => {
    if (step === 'source') return 'Add to library';
    if (step === 'prefill_name') return 'Plugin for new version';
    return 'Add version';
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <SoftBox display="flex" alignItems="center" justifyContent="space-between">
          <SoftTypography variant="h5" fontWeight="bold">
            {titleForStep()}
          </SoftTypography>
          <IconButton size="small" onClick={handleClose} aria-label="Close" sx={{ color: 'text.secondary' }}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {step === 'source' ? (
          <SoftBox mt={1}>
            <SoftTypography
              variant="caption"
              color="secondary"
              display="block"
              sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              Choose source
            </SoftTypography>
            <List disablePadding>
              {isPluginsTab && (
                <ListItemButton
                  onClick={() => handleDirectSource('wordpress.org')}
                  disabled={disabled}
                  sx={libraryChoiceListItemSx}
                >
                  <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                    <SoftBox sx={libraryChoiceIconWrapSx}>
                      <Icon sx={{ fontSize: 24 }}>cloud_download</Icon>
                    </SoftBox>
                  </ListItemIcon>
                  <ListItemText
                    primary={<SoftTypography variant="button" fontWeight="bold">WordPress.org</SoftTypography>}
                    secondary="Search and add from the official plugin directory"
                    primaryTypographyProps={{ sx: { mb: 0.25 } }}
                    secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  />
                </ListItemButton>
              )}
              <ListItemButton
                onClick={() => handleDirectSource('library_upload')}
                disabled={disabled}
                sx={libraryChoiceListItemSx}
              >
                <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                  <SoftBox sx={libraryChoiceIconWrapSx}>
                    <Icon sx={{ fontSize: 24 }}>upload_file</Icon>
                  </SoftBox>
                </ListItemIcon>
                <ListItemText
                  primary={<SoftTypography variant="button" fontWeight="bold">Library upload</SoftTypography>}
                  secondary={isPluginsTab ? 'Upload a plugin or theme ZIP file' : 'Upload a theme ZIP file'}
                  primaryTypographyProps={{ sx: { mb: 0.25 } }}
                  secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                />
              </ListItemButton>
              {isPluginsTab && (
                <ListItemButton
                  onClick={() => handleDirectSource('remote_url')}
                  disabled={disabled}
                  sx={libraryChoiceListItemSx}
                >
                  <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                    <SoftBox sx={libraryChoiceIconWrapSx}>
                      <Icon sx={{ fontSize: 24 }}>link</Icon>
                    </SoftBox>
                  </ListItemIcon>
                  <ListItemText
                    primary={<SoftTypography variant="button" fontWeight="bold">Remote URL</SoftTypography>}
                    secondary="Add from a remote ZIP file URL (HTTPS)"
                    primaryTypographyProps={{ sx: { mb: 0.25 } }}
                    secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  />
                </ListItemButton>
              )}
              {isPluginsTab && (
                <ListItemButton
                  onClick={() => handleStartPrefillFlow()}
                  disabled={disabled}
                  sx={{ ...libraryChoiceListItemSx, mb: 0 }}
                >
                  <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                    <SoftBox sx={libraryChoiceIconWrapSx}>
                      <Icon sx={{ fontSize: 24 }}>add_circle_outline</Icon>
                    </SoftBox>
                  </ListItemIcon>
                  <ListItemText
                    primary={<SoftTypography variant="button" fontWeight="bold">Another version, same plugin</SoftTypography>}
                    secondary="Enter the plugin name, then add from WordPress.org, upload, or a remote URL"
                    primaryTypographyProps={{ sx: { mb: 0.25 } }}
                    secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  />
                </ListItemButton>
              )}
            </List>
          </SoftBox>
        ) : step === 'prefill_name' ? (
          <SoftBox mt={1} display="flex" flexDirection="column" gap={2}>
            <SoftTypography variant="body2" color="secondary" sx={{ mb: 0.5 }}>
              Enter the plugin name. The next step lets you add a version from WordPress.org, a ZIP upload, or a remote URL,
              all under the same slug.
            </SoftTypography>
            <SoftBox>
              <SoftTypography variant="caption" color="secondary" display="block" gutterBottom>
                Plugin name
              </SoftTypography>
              <SoftInput
                placeholder="e.g. My Custom Plugin"
                value={pluginName}
                onChange={(e) => setPluginName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePrefillNameSubmit()}
                autoFocus
              />
            </SoftBox>
            <SoftBox display="flex" gap={1} justifyContent="flex-end">
              <SoftButton variant="outlined" color="secondary" size="small" onClick={handleBack}>
                Back
              </SoftButton>
              <SoftButton
                variant="gradient"
                color="info"
                size="small"
                onClick={handlePrefillNameSubmit}
                disabled={!pluginName.trim()}
              >
                Continue
              </SoftButton>
            </SoftBox>
          </SoftBox>
        ) : (
          <SoftBox mt={1}>
            <SoftTypography
              variant="caption"
              color="secondary"
              display="block"
              sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              Add version from
            </SoftTypography>
            <SoftTypography variant="body2" color="secondary" sx={{ mb: 2 }}>
              Add a version to &quot;{effectivePluginName}&quot; from:
            </SoftTypography>
            <List disablePadding>
              <ListItemButton onClick={() => handlePrefillPickClick('wordpress.org')} disabled={disabled} sx={libraryChoiceListItemSx}>
                <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                  <SoftBox sx={libraryChoiceIconWrapSx}>
                    <Icon sx={{ fontSize: 24 }}>cloud_download</Icon>
                  </SoftBox>
                </ListItemIcon>
                <ListItemText
                  primary={<SoftTypography variant="button" fontWeight="bold">WordPress.org</SoftTypography>}
                  secondary="Search and add from the official plugin directory"
                  primaryTypographyProps={{ sx: { mb: 0.25 } }}
                  secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                />
              </ListItemButton>
              <ListItemButton onClick={() => handlePrefillPickClick('library_upload')} disabled={disabled} sx={libraryChoiceListItemSx}>
                <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                  <SoftBox sx={libraryChoiceIconWrapSx}>
                    <Icon sx={{ fontSize: 24 }}>upload_file</Icon>
                  </SoftBox>
                </ListItemIcon>
                <ListItemText
                  primary={<SoftTypography variant="button" fontWeight="bold">Library upload</SoftTypography>}
                  secondary="Upload a plugin ZIP file"
                  primaryTypographyProps={{ sx: { mb: 0.25 } }}
                  secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                />
              </ListItemButton>
              <ListItemButton onClick={() => handlePrefillPickClick('remote_url')} disabled={disabled} sx={{ ...libraryChoiceListItemSx, mb: 0 }}>
                <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                  <SoftBox sx={libraryChoiceIconWrapSx}>
                    <Icon sx={{ fontSize: 24 }}>link</Icon>
                  </SoftBox>
                </ListItemIcon>
                <ListItemText
                  primary={<SoftTypography variant="button" fontWeight="bold">Remote URL</SoftTypography>}
                  secondary="Add from a remote ZIP file URL"
                  primaryTypographyProps={{ sx: { mb: 0.25 } }}
                  secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                />
              </ListItemButton>
            </List>
            {!existingPluginSlug && (
              <SoftButton variant="text" color="secondary" size="small" onClick={handlePrefillBackToName} sx={{ mt: 1 }}>
                Back
              </SoftButton>
            )}
          </SoftBox>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddLibrarySourceModal;
