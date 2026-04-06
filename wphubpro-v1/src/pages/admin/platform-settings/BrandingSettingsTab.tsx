/**
 * Branding Settings tab - logo, name, slogan, colors, contact email
 */
import React, { useState, useEffect, useRef } from 'react';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import SoftBox from 'components/SoftBox';
import SoftButton from 'components/SoftButton';
import SoftInput from 'components/SoftInput';
import SoftTypography from 'components/SoftTypography';
import { usePlatformSettings, useUpdatePlatformSettings } from '../../../hooks/usePlatformSettings';
import { useToast } from '../../../contexts/ToastContext';
import { storage, ID } from '../../../services/appwrite';

const PLATFORM_ASSETS_BUCKET = 'platform_assets';

const BrandingSettingsTab: React.FC = () => {
  const { toast } = useToast();
  const { data: details, isLoading: loadingDetails } = usePlatformSettings('details');
  const { data: branding, isLoading: loadingBranding } = usePlatformSettings('branding');
  const updateMutation = useUpdatePlatformSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [detailsForm, setDetailsForm] = useState({
    name: '',
    slogan: '',
    contactEmail: '',
    logoUrl: '',
    logoDataUrl: '',
  });
  const [brandingForm, setBrandingForm] = useState({
    primaryColor: '#17c1e8',
    secondaryColor: '#cb0c9f',
    primaryGradientStart: '#17c1e8',
    primaryGradientEnd: '#5e72e4',
    secondaryGradientStart: '#f53939',
    secondaryGradientEnd: '#fbcf33',
  });

  useEffect(() => {
    if (details && typeof details === 'object') {
      setDetailsForm({
        name: details.name ?? '',
        slogan: details.subtitle ?? details.slogan ?? '',
        contactEmail: details.contactEmail ?? '',
        logoUrl: details.logoUrl ?? '',
        logoDataUrl: details.logoDataUrl ?? '',
      });
    }
  }, [details]);

  useEffect(() => {
    if (branding && typeof branding === 'object') {
      setBrandingForm({
        primaryColor: branding.primaryColor ?? '#17c1e8',
        secondaryColor: branding.secondaryColor ?? '#cb0c9f',
        primaryGradientStart: branding.primaryGradientStart ?? '#17c1e8',
        primaryGradientEnd: branding.primaryGradientEnd ?? '#5e72e4',
        secondaryGradientStart: branding.secondaryGradientStart ?? '#f53939',
        secondaryGradientEnd: branding.secondaryGradientEnd ?? '#fbcf33',
      });
    }
  }, [branding]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await storage.createFile(PLATFORM_ASSETS_BUCKET, ID.unique(), file);
      const url = `${(import.meta as any).env?.APPWRITE_ENDPOINT || 'https://api.wphub.pro/v1'}/storage/v1/buckets/${PLATFORM_ASSETS_BUCKET}/files/${result.$id}/view?project=${(import.meta as any).env?.APPWRITE_PROJECT_ID || ''}`;
      setDetailsForm((prev) => ({ ...prev, logoUrl: url, logoDataUrl: '' }));
      toast({ title: 'Logo geüpload', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not upload logo',
        variant: 'destructive',
      });
    }
    e.target.value = '';
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: detailsForm.name,
      subtitle: detailsForm.slogan,
      slogan: detailsForm.slogan,
      contactEmail: detailsForm.contactEmail,
      logoUrl: detailsForm.logoUrl || undefined,
      logoDataUrl: detailsForm.logoDataUrl || undefined,
    };
    try {
      await updateMutation.mutateAsync({ category: 'details', settings: payload });
      toast({ title: 'Branding-details opgeslagen', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not save',
        variant: 'destructive',
      });
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({ category: 'branding', settings: brandingForm });
      toast({ title: 'Kleuren opgeslagen', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not save',
        variant: 'destructive',
      });
    }
  };

  const isLoading = loadingDetails || loadingBranding;
  const logoPreview = detailsForm.logoUrl || detailsForm.logoDataUrl;

  if (isLoading) {
    return (
      <SoftBox display="flex" justifyContent="center" alignItems="center" py={6}>
        <CircularProgress size={32} />
      </SoftBox>
    );
  }

  const inputSx = { '& .MuiInputBase-root': { borderRadius: 1.5 } };
  const colorFieldSx = { width: 72, '& input': { height: 44, cursor: 'pointer', padding: 0.5 } };

  return (
    <SoftBox display="flex" flexDirection="column" gap={4}>
      {/* Logo & Details */}
      <SoftBox sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <SoftBox component="form" onSubmit={handleSaveDetails} display="flex" flexDirection="column" gap={3}>
          <SoftBox>
            <SoftTypography variant="h6" fontWeight="bold" mb={0.5}>
              Logo & platform name
            </SoftTypography>
            <SoftTypography variant="body2" color="secondary">
              Upload a logo and set the platform name and contact details.
            </SoftTypography>
          </SoftBox>

          <SoftBox display="flex" alignItems="flex-start" gap={3} flexWrap="wrap">
            <SoftBox
              sx={{
                width: 100,
                height: 100,
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                bgcolor: 'action.hover',
                flexShrink: 0,
              }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <SoftTypography variant="caption" color="secondary" textAlign="center" px={1}>
                  No logo
                </SoftTypography>
              )}
            </SoftBox>
            <SoftBox flex={1} minWidth={200}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg,.webp"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
              <SoftButton variant="outlined" color="primary" size="small" onClick={() => fileInputRef.current?.click()}>
                Logo uploaden
              </SoftButton>
            </SoftBox>
          </SoftBox>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <SoftBox mb={2}>
                <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Platform name</SoftTypography>
                <SoftInput
                  value={detailsForm.name}
                  onChange={(e) => setDetailsForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="WPHub.PRO"
                  fullWidth
                  size="small"
                  sx={inputSx}
                />
              </SoftBox>
            </Grid>
            <Grid item xs={12} sm={6}>
              <SoftBox mb={2}>
                <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Contact email address</SoftTypography>
                <SoftInput
                  type="email"
                  value={detailsForm.contactEmail}
                  onChange={(e) => setDetailsForm((p) => ({ ...p, contactEmail: e.target.value }))}
                  placeholder="support@example.com"
                  fullWidth
                  size="small"
                  sx={inputSx}
                />
              </SoftBox>
            </Grid>
            <Grid item xs={12}>
              <SoftBox mb={2}>
                <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Slogan</SoftTypography>
                <SoftInput
                  value={detailsForm.slogan}
                  onChange={(e) => setDetailsForm((p) => ({ ...p, slogan: e.target.value }))}
                  placeholder="WordPress Management from the Hub"
                  fullWidth
                  size="small"
                  sx={inputSx}
                />
              </SoftBox>
            </Grid>
          </Grid>

          <SoftBox pt={1}>
            <SoftButton type="submit" variant="contained" color="primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save details'}
            </SoftButton>
          </SoftBox>
        </SoftBox>
      </SoftBox>

      {/* Colors */}
      <SoftBox sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <SoftBox component="form" onSubmit={handleSaveBranding} display="flex" flexDirection="column" gap={3}>
          <SoftBox>
            <SoftTypography variant="h6" fontWeight="bold" mb={0.5}>
              Kleuren & gradients
            </SoftTypography>
            <SoftTypography variant="body2" color="secondary">
              Set the primary and secondary colors for buttons and accents.
            </SoftTypography>
          </SoftBox>

          <SoftBox>
            <SoftTypography variant="subtitle2" fontWeight="bold" mb={1.5} color="secondary">
              Primary gradient (blue)
            </SoftTypography>
            <SoftBox display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
              <SoftInput
                placeholder="Start"
                value={brandingForm.primaryGradientStart}
                onChange={(e) => setBrandingForm((p) => ({ ...p, primaryGradientStart: e.target.value }))}
                size="small"
                type="color"
                sx={colorFieldSx}
              />
              <SoftInput
                placeholder="Eind"
                value={brandingForm.primaryGradientEnd}
                onChange={(e) => setBrandingForm((p) => ({ ...p, primaryGradientEnd: e.target.value }))}
                size="small"
                type="color"
                sx={colorFieldSx}
              />
              <SoftBox
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  background: `linear-gradient(135deg, ${brandingForm.primaryGradientStart}, ${brandingForm.primaryGradientEnd})`,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
              <SoftInput
                placeholder="#17c1e8"
                value={brandingForm.primaryColor}
                onChange={(e) => setBrandingForm((p) => ({ ...p, primaryColor: e.target.value }))}
                size="small"
                sx={{ minWidth: 120, ...inputSx }}
              />
            </SoftBox>
          </SoftBox>

          <SoftBox>
            <SoftTypography variant="subtitle2" fontWeight="bold" mb={1.5} color="secondary">
              Secondary gradient (orange)
            </SoftTypography>
            <SoftBox display="flex" gap={2} flexWrap="wrap" alignItems="center">
              <SoftInput
                placeholder="Start"
                value={brandingForm.secondaryGradientStart}
                onChange={(e) => setBrandingForm((p) => ({ ...p, secondaryGradientStart: e.target.value }))}
                size="small"
                type="color"
                sx={colorFieldSx}
              />
              <SoftInput
                placeholder="Eind"
                value={brandingForm.secondaryGradientEnd}
                onChange={(e) => setBrandingForm((p) => ({ ...p, secondaryGradientEnd: e.target.value }))}
                size="small"
                type="color"
                sx={colorFieldSx}
              />
              <SoftBox
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  background: `linear-gradient(135deg, ${brandingForm.secondaryGradientStart}, ${brandingForm.secondaryGradientEnd})`,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
              <SoftInput
                placeholder="#cb0c9f"
                value={brandingForm.secondaryColor}
                onChange={(e) => setBrandingForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                size="small"
                sx={{ minWidth: 120, ...inputSx }}
              />
            </SoftBox>
          </SoftBox>

          <SoftBox pt={1}>
            <SoftButton type="submit" variant="contained" color="primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save colors'}
            </SoftButton>
          </SoftBox>
        </SoftBox>
      </SoftBox>
    </SoftBox>
  );
};

export default BrandingSettingsTab;
