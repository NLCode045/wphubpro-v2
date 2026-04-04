/**
 * Storage Settings tab - S3 config for library/zip-parser (bucket, region, keys)
 */
import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import SoftBox from 'components/SoftBox';
import SoftButton from 'components/SoftButton';
import SoftInput from 'components/SoftInput';
import SoftTypography from 'components/SoftTypography';
import { usePlatformSettings, useUpdatePlatformSettings } from '../../../hooks/usePlatformSettings';
import { useToast } from '../../../contexts/ToastContext';

const StorageSettingsTab: React.FC = () => {
  const { toast } = useToast();
  const { data, isLoading } = usePlatformSettings('s3');
  const updateMutation = useUpdatePlatformSettings();
  const [form, setForm] = useState({
    bucket: '',
    region: '',
    accessKey: '',
    secretKey: '',
  });

  useEffect(() => {
    if (data && typeof data === 'object') {
      setForm({
        bucket: data.bucket ?? '',
        region: data.region ?? '',
        accessKey: data.accessKey ?? '',
        secretKey: data.secretKey ?? '',
      });
    }
  }, [data]);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({ category: 's3', settings: form });
      toast({ title: 'Storage-instellingen opgeslagen', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not save settings',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <SoftBox display="flex" justifyContent="center" alignItems="center" py={6}>
        <CircularProgress size={32} />
      </SoftBox>
    );
  }

  return (
    <SoftBox sx={{ border: '1px solid', borderColor: 'divider', p: 3, borderRadius: 2 }}>
      <SoftBox component="form" onSubmit={handleSave} display="flex" flexDirection="column" gap={3}>
        <SoftBox>
          <SoftTypography variant="h6" fontWeight="bold" mb={0.5}>
            S3 / object storage
          </SoftTypography>
          <SoftTypography variant="body2" color="secondary">
            Voor bibliotheek-uploads en zip-parser. Env-variabelen (S3_BUCKET, S3_REGION, etc.) hebben voorrang.
          </SoftTypography>
        </SoftBox>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <SoftBox mb={2}>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Bucket</SoftTypography>
              <SoftInput
                value={form.bucket}
                onChange={handleChange('bucket')}
                placeholder="wphub-library"
                fullWidth
                size="small"
                sx={{ '& .MuiInputBase-root': { borderRadius: 1.5 } }}
              />
            </SoftBox>
          </Grid>
          <Grid item xs={12} sm={6}>
            <SoftBox mb={2}>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Region</SoftTypography>
              <SoftInput
                value={form.region}
                onChange={handleChange('region')}
                placeholder="eu-west-1"
                fullWidth
                size="small"
                sx={{ '& .MuiInputBase-root': { borderRadius: 1.5 } }}
              />
            </SoftBox>
          </Grid>
          <Grid item xs={12} sm={6}>
            <SoftBox mb={2}>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Access Key ID</SoftTypography>
              <SoftInput
                value={form.accessKey}
                onChange={handleChange('accessKey')}
                fullWidth
                size="small"
                type="password"
                autoComplete="off"
                sx={{ '& .MuiInputBase-root': { borderRadius: 1.5 } }}
              />
            </SoftBox>
          </Grid>
          <Grid item xs={12} sm={6}>
            <SoftBox mb={2}>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Secret Access Key</SoftTypography>
              <SoftInput
                value={form.secretKey}
                onChange={handleChange('secretKey')}
                fullWidth
                size="small"
                type="password"
                autoComplete="off"
                sx={{ '& .MuiInputBase-root': { borderRadius: 1.5 } }}
              />
            </SoftBox>
          </Grid>
        </Grid>

        <SoftBox pt={1}>
            <SoftButton type="submit" variant="contained" color="primary" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </SoftBox>
  );
};

export default StorageSettingsTab;
