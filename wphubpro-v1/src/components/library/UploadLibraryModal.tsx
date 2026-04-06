/**
 * Modal to upload a plugin or theme ZIP file to the library
 */
import React, { useState, useRef, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';

import { useUploadLocalItem } from '../../hooks/useLibrary';
import { LibraryItemType } from '../../types';

interface UploadLibraryModalProps {
  open: boolean;
  onClose: () => void;
  /** Preselect type when opening (e.g. from Themes tab) */
  initialType?: LibraryItemType;
  /** When adding a version under an existing plugin slug, pass it so the upload merges into that document */
  prefillPluginSlug?: string;
}

const UploadLibraryModal: React.FC<UploadLibraryModalProps> = ({ open, onClose, initialType, prefillPluginSlug }) => {
  const [type, setType] = useState<LibraryItemType>(initialType ?? LibraryItemType.Plugin);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadLocalItem();

  useEffect(() => {
    if (open && initialType) setType(initialType);
  }, [open, initialType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && (f.name.endsWith('.zip') || f.name.endsWith('.ZIP'))) {
      setFile(f);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = () => {
    if (!file) return;
    uploadMutation.mutate(
      { file, type, ...(prefillPluginSlug && { wpSlug: prefillPluginSlug }) },
      {
        onSuccess: (data) => {
          if (data.success) {
            setFile(null);
            setType(LibraryItemType.Plugin);
            if (fileInputRef.current) fileInputRef.current.value = '';
            onClose();
          }
        },
      }
    );
  };

  const handleClose = () => {
    setFile(null);
    setType(LibraryItemType.Plugin);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <SoftBox display="flex" alignItems="center" justifyContent="space-between">
          <SoftTypography variant="h6" fontWeight="bold">
            Upload ZIP
          </SoftTypography>
          <IconButton size="small" onClick={handleClose} aria-label="Close">
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
      </DialogTitle>
      <DialogContent>
        <SoftBox mt={2}>
          <SoftTypography variant="caption" color="secondary" id="upload-type-label" display="block" sx={{ mb: 0.5 }}>
            Type
          </SoftTypography>
          <Select
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            value={type}
            onChange={(e) => setType(e.target.value as LibraryItemType)}
            inputProps={{ 'aria-labelledby': 'upload-type-label' }}
          >
            <MenuItem value={LibraryItemType.Plugin}>Plugin</MenuItem>
            <MenuItem value={LibraryItemType.Theme}>Theme</MenuItem>
          </Select>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <SoftButton
            variant="outlined"
            color="info"
            fullWidth
            onClick={() => fileInputRef.current?.click()}
            startIcon={<Icon>upload_file</Icon>}
            sx={{ mb: 1 }}
          >
            {file ? file.name : 'Choose ZIP file'}
          </SoftButton>
          <SoftTypography variant="caption" color="secondary" display="block">
            Upload a plugin or theme ZIP file from WordPress.org or your own build.
          </SoftTypography>
        </SoftBox>
      </DialogContent>
      <DialogActions>
        <SoftButton variant="outlined" color="secondary" onClick={handleClose}>
          Cancel
        </SoftButton>
        <SoftButton
          variant="gradient"
          color="info"
          onClick={handleSubmit}
          disabled={!file || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
        </SoftButton>
      </DialogActions>
    </Dialog>
  );
};

export default UploadLibraryModal;
