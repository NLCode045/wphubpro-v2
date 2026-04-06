/**
 * Modal to add a version to an existing library plugin – same layout as AddLibrarySourceModal.
 */
import React from 'react';
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

import { libraryChoiceIconWrapSx, libraryChoiceListItemSx } from './AddLibrarySourceModal';

export interface AddPluginVersionModalProps {
  open: boolean;
  onClose: () => void;
  onPinFromWordPressOrg: () => void;
  onUploadZip: () => void;
  onRemoteUrl: () => void;
  /** Shown as context under the section label */
  pluginDisplayName?: string;
}

const AddPluginVersionModal: React.FC<AddPluginVersionModalProps> = ({
  open,
  onClose,
  onPinFromWordPressOrg,
  onUploadZip,
  onRemoteUrl,
  pluginDisplayName,
}) => {
  const choose = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <SoftBox display="flex" alignItems="center" justifyContent="space-between">
          <SoftTypography variant="h5" fontWeight="bold">
            Add version
          </SoftTypography>
          <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: 'text.secondary' }}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <SoftBox mt={1}>
          <SoftTypography
            variant="caption"
            color="secondary"
            display="block"
            sx={{ mb: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
          >
            Choose source
          </SoftTypography>
          {pluginDisplayName ? (
            <SoftTypography variant="body2" color="secondary" sx={{ mb: 2 }}>
              Add a version to &quot;{pluginDisplayName}&quot; from:
            </SoftTypography>
          ) : null}
          <List disablePadding>
            <ListItemButton onClick={choose(onPinFromWordPressOrg)} sx={libraryChoiceListItemSx}>
              <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                <SoftBox sx={libraryChoiceIconWrapSx}>
                  <Icon sx={{ fontSize: 24 }}>cloud_download</Icon>
                </SoftBox>
              </ListItemIcon>
              <ListItemText
                primary={<SoftTypography variant="button" fontWeight="bold">Pin from WordPress.org</SoftTypography>}
                secondary="Pick one or more versions from the official plugin directory"
                primaryTypographyProps={{ sx: { mb: 0.25 } }}
                secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
              />
            </ListItemButton>
            <ListItemButton onClick={choose(onUploadZip)} sx={libraryChoiceListItemSx}>
              <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                <SoftBox sx={libraryChoiceIconWrapSx}>
                  <Icon sx={{ fontSize: 24 }}>upload_file</Icon>
                </SoftBox>
              </ListItemIcon>
              <ListItemText
                primary={<SoftTypography variant="button" fontWeight="bold">Upload ZIP file</SoftTypography>}
                secondary="Upload a plugin ZIP to this library entry"
                primaryTypographyProps={{ sx: { mb: 0.25 } }}
                secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
              />
            </ListItemButton>
            <ListItemButton onClick={choose(onRemoteUrl)} sx={{ ...libraryChoiceListItemSx, mb: 0 }}>
              <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                <SoftBox sx={libraryChoiceIconWrapSx}>
                  <Icon sx={{ fontSize: 24 }}>link</Icon>
                </SoftBox>
              </ListItemIcon>
              <ListItemText
                primary={<SoftTypography variant="button" fontWeight="bold">Remote URL</SoftTypography>}
                secondary="Add a version from a remote ZIP file URL"
                primaryTypographyProps={{ sx: { mb: 0.25 } }}
                secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
              />
            </ListItemButton>
          </List>
        </SoftBox>
      </DialogContent>
    </Dialog>
  );
};

export default AddPluginVersionModal;
