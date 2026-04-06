/**
 * Modal to pin multiple versions from WordPress.org – shown when Add version + is clicked.
 * User checks versions, clicks Add, and they are added to the library.
 */
import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Checkbox from '@mui/material/Checkbox';
import Icon from '@mui/material/Icon';
import CircularProgress from '@mui/material/CircularProgress';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';

import { getWpPluginInfo } from '../../services/wordpress';
import { useAddOfficialPlugin } from '../../hooks/useLibrary';

interface PinVersionsFromWpModalProps {
  open: boolean;
  onClose: () => void;
  pluginSlug: string;
  displayName: string;
}

const PinVersionsFromWpModal: React.FC<PinVersionsFromWpModalProps> = ({
  open,
  onClose,
  pluginSlug,
  displayName,
}) => {
  const [wpInfo, setWpInfo] = useState<{ name: string; author: string; versions?: Record<string, string> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());

  const addMutation = useAddOfficialPlugin();

  const wpVersionList = wpInfo?.versions
    ? Object.keys(wpInfo.versions)
        .filter((v) => v !== 'trunk')
        .sort((a, b) => {
          const pa = a.split('.').map(Number);
          const pb = b.split('.').map(Number);
          for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const x = pa[i] ?? 0;
            const y = pb[i] ?? 0;
            if (x !== y) return y - x;
          }
          return 0;
        })
    : [];

  useEffect(() => {
    if (!open || !pluginSlug) return;
    setLoading(true);
    setWpInfo(null);
    setSelectedVersions(new Set());
    getWpPluginInfo(pluginSlug)
      .then((info) => setWpInfo(info ?? null))
      .catch(() => setWpInfo(null))
      .finally(() => setLoading(false));
  }, [open, pluginSlug]);

  const toggleVersion = (v: string) => {
    setSelectedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedVersions.size === wpVersionList.length) {
      setSelectedVersions(new Set());
    } else {
      setSelectedVersions(new Set(wpVersionList));
    }
  };

  const handleAdd = async () => {
    if (selectedVersions.size === 0) return;
    const plugin = {
      slug: pluginSlug,
      name: wpInfo?.name ?? displayName,
      author: wpInfo?.author ?? '',
      short_description: '',
      prefillPluginSlug: pluginSlug,
      prefillPluginName: displayName,
    };
    for (const version of selectedVersions) {
      await addMutation.mutateAsync({ ...plugin, version });
    }
    setSelectedVersions(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pin versions from WordPress.org</DialogTitle>
      <DialogContent>
        {loading ? (
          <SoftBox display="flex" alignItems="center" justifyContent="center" py={4}>
            <CircularProgress size={32} />
          </SoftBox>
        ) : !wpInfo ? (
          <SoftTypography variant="caption" color="secondary">
            Plugin not found on WordPress.org or could not load versions.
          </SoftTypography>
        ) : wpVersionList.length === 0 ? (
          <SoftTypography variant="caption" color="secondary">
            No versions available.
          </SoftTypography>
        ) : (
          <SoftBox component="table" width="100%" sx={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: 48, padding: 0, textAlign: 'left' }}>
                  <Checkbox
                    size="small"
                    checked={selectedVersions.size === wpVersionList.length && wpVersionList.length > 0}
                    indeterminate={selectedVersions.size > 0 && selectedVersions.size < wpVersionList.length}
                    onChange={toggleAll}
                  />
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>
                  <SoftTypography variant="caption" fontWeight="bold" color="secondary">
                    Version
                  </SoftTypography>
                </th>
              </tr>
            </thead>
            <tbody>
              {wpVersionList.map((v) => (
                <tr key={v} style={{ cursor: 'pointer' }} onClick={() => toggleVersion(v)}>
                  <td style={{ padding: 0, verticalAlign: 'middle' }}>
                    <Checkbox size="small" checked={selectedVersions.has(v)} onChange={() => toggleVersion(v)} />
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <SoftTypography variant="caption">{v}</SoftTypography>
                  </td>
                </tr>
              ))}
            </tbody>
          </SoftBox>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <SoftButton variant="text" color="secondary" onClick={onClose}>
          Cancel
        </SoftButton>
        <SoftButton
          variant="gradient"
          color="info"
          onClick={handleAdd}
          disabled={selectedVersions.size === 0 || loading || addMutation.isPending}
          startIcon={<Icon sx={{ fontSize: 18 }}>add</Icon>}
        >
          {addMutation.isPending ? 'Adding…' : `Add ${selectedVersions.size} version(s)`}
        </SoftButton>
      </DialogActions>
    </Dialog>
  );
};

export default PinVersionsFromWpModal;
