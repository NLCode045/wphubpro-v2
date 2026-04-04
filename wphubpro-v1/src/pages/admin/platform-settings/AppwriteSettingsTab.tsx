/**
 * Appwrite Settings tab - endpoint, project_id, database_id, api_key, encryption_key
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
const AppwriteSettingsTab: React.FC = () => {
  const { toast } = useToast();
  const { data, isLoading } = usePlatformSettings('appwrite');
  const updateMutation = useUpdatePlatformSettings();
  const [form, setForm] = useState({
    endpoint: '',
    project_id: '',
    database_id: '',
    api_key: '',
    encryption_key: '',
  });

  useEffect(() => {
    if (data && typeof data === 'object') {
      setForm({
        endpoint: data.endpoint ?? '',
        project_id: data.project_id ?? '',
        database_id: data.database_id ?? '',
        api_key: data.api_key ?? '',
        encryption_key: data.encryption_key ?? '',
      });
    }
  }, [data]);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({ category: 'appwrite', settings: form });
      toast({ title: 'Appwrite-instellingen opgeslagen', variant: 'success' });
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
    <SoftBox sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <SoftBox component="form" onSubmit={handleSave} display="flex" flexDirection="column" gap={3}>
        <SoftBox>
          <SoftTypography variant="h6" fontWeight="bold" mb={0.5}>
            Appwrite-configuratie
          </SoftTypography>
          <SoftTypography variant="body2" color="secondary">
            For reference or multi-tenant setup. Endpoint, project and database IDs.
          </SoftTypography>
        </SoftBox>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <SoftBox mb={2}>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Endpoint</SoftTypography>
              <SoftInput
                type="url"
                value={form.endpoint}
                onChange={handleChange('endpoint')}
                placeholder="https://appwrite.example.com/v1"
                fullWidth
                size="small"
                sx={{ '& .MuiInputBase-root': { borderRadius: 1.5 } }}
              />
            </SoftBox>
          </Grid>
          <Grid item xs={12} sm={6}>
            <SoftBox mb={2}>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Project ID</SoftTypography>
              <SoftInput
                value={form.project_id}
                onChange={handleChange('project_id')}
                fullWidth
                size="small"
                sx={{ '& .MuiInputBase-root': { borderRadius: 1.5 } }}
              />
            </SoftBox>
          </Grid>
          <Grid item xs={12} sm={6}>
            <SoftBox mb={2}>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Database ID</SoftTypography>
              <SoftInput
                value={form.database_id}
                onChange={handleChange('database_id')}
                placeholder="platform_db"
                fullWidth
                size="small"
                sx={{ '& .MuiInputBase-root': { borderRadius: 1.5 } }}
              />
            </SoftBox>
          </Grid>
          <Grid item xs={12} sm={6}>
            <SoftBox mb={2}>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>API Key</SoftTypography>
              <SoftTypography variant="caption" color="secondary" display="block" mb={0.5}>Displayed masked</SoftTypography>
              <SoftInput
                value={form.api_key}
                onChange={handleChange('api_key')}
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
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Encryption Key</SoftTypography>
              <SoftTypography variant="caption" color="secondary" display="block" mb={0.5}>Optional, for encryption of sensitive data</SoftTypography>
              <SoftInput
                value={form.encryption_key}
                onChange={handleChange('encryption_key')}
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

export default AppwriteSettingsTab;
