/**
 * Modal to add a plugin from a remote ZIP URL.
 */
import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import SoftInput from 'components/SoftInput';

import { useAddRemotePlugin } from '../../hooks/useLibrary';

interface AddRemoteUrlModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-fill slug when adding a version to an existing plugin */
  existingPluginSlug?: string;
  existingPluginName?: string;
  /** Pre-fill plugin name when opening from Add to library (prefill flow) */
  initialPluginName?: string;
}

const AddRemoteUrlModal: React.FC<AddRemoteUrlModalProps> = ({
  open,
  onClose,
  existingPluginSlug,
  existingPluginName,
  initialPluginName,
}) => {
  const [name, setName] = useState('');
  const [wpSlug, setWpSlug] = useState('');

  useEffect(() => {
    if (open) {
      const n = existingPluginName ?? initialPluginName ?? '';
      const s = existingPluginSlug ?? (initialPluginName ? initialPluginName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '');
      setName(n);
      setWpSlug(s);
    }
  }, [open, existingPluginName, existingPluginSlug, initialPluginName]);
  const [version, setVersion] = useState('1.0.0');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [author, setAuthor] = useState('');

  const addMutation = useAddRemotePlugin();

  const handleClose = () => {
    setName(existingPluginName ?? '');
    setWpSlug(existingPluginSlug ?? '');
    setVersion('1.0.0');
    setRemoteUrl('');
    setAuthor('');
    onClose();
  };

  const handleSubmit = () => {
    const slug = wpSlug.trim() || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!slug || !remoteUrl.trim()) return;
    addMutation.mutate(
      {
        name: name.trim() || slug,
        wpSlug: slug,
        version: version.trim() || '1.0.0',
        remoteUrl: remoteUrl.trim(),
        author: author.trim(),
      },
      {
        onSuccess: () => handleClose(),
      }
    );
  };

  const slug = wpSlug.trim() || (name ? name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '');
  const isUrlValid = remoteUrl.trim().startsWith('https://');
  const canSubmit = slug && isUrlValid && !addMutation.isPending;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <SoftBox display="flex" alignItems="center" justifyContent="space-between">
          <SoftTypography variant="h6" fontWeight="bold">
            Add from remote URL
          </SoftTypography>
          <IconButton size="small" onClick={handleClose} aria-label="Close">
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
      </DialogTitle>
      <DialogContent>
        <SoftBox mt={1} display="flex" flexDirection="column" gap={2}>
          <SoftBox>
            <SoftTypography variant="caption" color="secondary" display="block" gutterBottom>
              Plugin name
            </SoftTypography>
            <SoftInput
              placeholder="e.g. My Custom Plugin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!!existingPluginName || !!initialPluginName}
            />
          </SoftBox>
          <SoftBox>
            <SoftTypography variant="caption" color="secondary" display="block" gutterBottom>
              Plugin slug (folder name)
            </SoftTypography>
            <SoftInput
              placeholder="e.g. my-custom-plugin"
              value={wpSlug}
              onChange={(e) => setWpSlug(e.target.value)}
              disabled={!!existingPluginSlug || !!initialPluginName}
            />
          </SoftBox>
          <SoftBox>
            <SoftTypography variant="caption" color="secondary" display="block" gutterBottom>
              Version
            </SoftTypography>
            <SoftInput
              placeholder="1.0.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </SoftBox>
          <SoftBox>
            <SoftTypography variant="caption" color="secondary" display="block" gutterBottom>
              ZIP file URL (HTTPS)
            </SoftTypography>
            <SoftInput
              placeholder="https://example.com/plugin.zip"
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              error={!!remoteUrl && !remoteUrl.trim().startsWith('https://')}
            />
            {remoteUrl && !isUrlValid && (
              <SoftTypography variant="caption" color="error" sx={{ mt: 0.5 }}>
                URL must start with https://
              </SoftTypography>
            )}
          </SoftBox>
          <SoftBox>
            <SoftTypography variant="caption" color="secondary" display="block" gutterBottom>
              Author (optional)
            </SoftTypography>
            <SoftInput
              placeholder="Author name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </SoftBox>
          <SoftTypography variant="caption" color="secondary">
            Add a plugin from a remote ZIP URL. Use this for custom builds, private packages, or GitHub releases.
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
          disabled={!canSubmit}
          startIcon={<Icon sx={{ fontSize: 18 }}>link</Icon>}
        >
          {addMutation.isPending ? 'Adding…' : 'Add to library'}
        </SoftButton>
      </DialogActions>
    </Dialog>
  );
};

export default AddRemoteUrlModal;
