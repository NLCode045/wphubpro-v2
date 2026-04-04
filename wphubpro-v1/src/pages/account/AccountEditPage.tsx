import React, { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import SoftInput from 'components/SoftInput';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Footer from 'examples/Footer';
import { contentPageShellSx } from '../../theme/contentPaper';
import { account } from '../../services/appwrite';
import { useAuth } from '../../domains/auth';
import { useToast } from '../../contexts/ToastContext';
import AccountSectionNav from '../../components/account/AccountSectionNav'; // pragma: allowlist secret

const AccountEditPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    const prefs = (user?.prefs ?? {}) as Record<string, unknown>;
    setDisplayName(typeof prefs.displayName === 'string' ? prefs.displayName : '');
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await account.updateName(name.trim());
      const currentPrefs = (user?.prefs ?? {}) as Record<string, unknown>;
      await account.updatePrefs({ ...currentPrefs, displayName: displayName.trim() });
      await refreshUser();
      toast({
        title: 'Profile updated',
        description: 'Uw accountgegevens zijn bijgewerkt.',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Could not update profile.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Gebruik minimaal 8 karakters.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please check your new password and confirmation.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingPassword(true);
    try {
      await account.updatePassword(newPassword, currentPassword || undefined);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: 'Password updated',
        description: 'Your password has been successfully changed.',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Password update failed',
        description: error?.message || 'Could not change password.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <SoftTypography variant="h4" fontWeight="bold" mb={0.5}>
          Edit Account
        </SoftTypography>
        <SoftTypography variant="button" color="text" mb={2} display="block">
          Update your profile details and password.
        </SoftTypography>

        <AccountSectionNav /> {/* pragma: allowlist secret */}

        <Grid container spacing={3} mt={0.5}>
          <Grid item xs={12} md={6}>
            <Card>
              <SoftBox p={3} display="flex" flexDirection="column" gap={2}>
                <SoftTypography variant="h6" fontWeight="bold">
                  Profile details
                </SoftTypography>
                <SoftBox>
                  <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Name</SoftTypography>
                  <SoftInput value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" />
                </SoftBox>
                <SoftBox>
                  <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Display name</SoftTypography>
                  <SoftInput value={displayName} onChange={(e) => setDisplayName(e.target.value)} fullWidth size="small" />
                </SoftBox>
                <SoftBox>
                  <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>E-mail</SoftTypography>
                  <SoftInput value={user?.email || ''} fullWidth size="small" disabled />
                </SoftBox>
                <SoftButton
                  variant="gradient"
                  color="info"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile || !name.trim()}
                >
                  {isSavingProfile ? 'Saving...' : 'Save'}
                </SoftButton>
              </SoftBox>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <SoftBox p={3} display="flex" flexDirection="column" gap={2}>
                <SoftTypography variant="h6" fontWeight="bold">
                  Change password
                </SoftTypography>
                <SoftBox>
                  <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Current password</SoftTypography>
                  <SoftInput type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} fullWidth size="small" />
                </SoftBox>
                <SoftBox>
                  <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>New password</SoftTypography>
                  <SoftInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth size="small" />
                </SoftBox>
                <SoftBox>
                  <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Confirm new password</SoftTypography>
                  <SoftInput type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth size="small" />
                </SoftBox>
                <SoftButton
                  variant="outlined"
                  color="info"
                  onClick={handleSavePassword}
                  disabled={isSavingPassword}
                >
                  {isSavingPassword ? 'Updating...' : 'Update password'}
                </SoftButton>
              </SoftBox>
            </Card>
          </Grid>
        </Grid>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AccountEditPage;
