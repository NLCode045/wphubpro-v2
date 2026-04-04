import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import SoftBox from 'components/SoftBox';
import SoftButton from 'components/SoftButton';
import SoftInput from 'components/SoftInput';
import SoftTypography from 'components/SoftTypography';
import Icon from '@mui/material/Icon';
import { useAddSite } from '../../domains/sites';

interface AddSiteModalProps {
  open: boolean;
  onClose: () => void;
}

const AddSiteModal: React.FC<AddSiteModalProps> = ({ open, onClose }) => {
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const addSiteMutation = useAddSite();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSiteMutation.mutate(
      { siteName, siteUrl, username: '' },
      {
        onSuccess: () => {
          setSiteName('');
          setSiteUrl('');
          onClose();
        },
      }
    );
  };

  const handleClose = () => {
    if (!addSiteMutation.isPending) {
      setSiteName('');
      setSiteUrl('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <SoftBox display="flex" alignItems="center" gap={1}>
          <Icon color="info">add_link</Icon>
          <SoftTypography variant="h6" fontWeight="medium">Add new site</SoftTypography>
        </SoftBox>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {addSiteMutation.isError && (
            <SoftBox mb={2} p={2} borderRadius="md" bgColor="error" color="white" sx={{ opacity: 0.9 }}>
              <SoftBox display="flex" alignItems="center" gap={1}>
                <Icon sx={{ fontSize: 20, color: "white" }}>error</Icon>
                <SoftTypography variant="caption" color="white">{addSiteMutation.error?.message}</SoftTypography>
              </SoftBox>
            </SoftBox>
          )}
          <SoftBox mb={2}>
            <SoftTypography variant="caption" fontWeight="medium" color="text" mb={0.5} display="block">Site name</SoftTypography>
            <SoftInput placeholder="Mijn WordPress Site" value={siteName} onChange={(e) => setSiteName(e.target.value)} fullWidth size="small" />
          </SoftBox>
          <SoftBox>
            <SoftTypography variant="caption" fontWeight="medium" color="text" mb={0.5} display="block">Site URL</SoftTypography>
            <SoftInput type="url" placeholder="https://example.com" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} fullWidth size="small" />
          </SoftBox>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <SoftButton variant="outlined" color="secondary" onClick={handleClose} disabled={addSiteMutation.isPending}>Cancel</SoftButton>
          <SoftButton type="submit" variant="contained" color="info" disabled={addSiteMutation.isPending}>{addSiteMutation.isPending ? 'Adding...' : 'Add site'}</SoftButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddSiteModal;
