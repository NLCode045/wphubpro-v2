import React, { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Footer from 'examples/Footer';
import { contentPageShellSx } from '../../theme/contentPaper';
import { account } from '../../services/appwrite';
import { useAuth } from '../../domains/auth';
import { useToast } from '../../contexts/ToastContext';
import AccountSectionNav from '../../components/account/AccountSectionNav'; // pragma: allowlist secret

const AccountSettingsPage: React.FC = () => { // pragma: allowlist secret
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const prefs = (user?.prefs ?? {}) as Record<string, unknown>;
    setEmailNotifications(prefs.emailNotifications !== false);
    setMarketingEmails(prefs.marketingEmails === true);
    setWeeklyDigest(prefs.weeklyDigest !== false);
  }, [user]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const currentPrefs = (user?.prefs ?? {}) as Record<string, unknown>;
      await account.updatePrefs({
        ...currentPrefs,
        emailNotifications,
        marketingEmails,
        weeklyDigest,
      });
      await refreshUser();
      toast({
        title: 'Settings saved',
        description: 'Your settings have been saved.',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Could not save settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <SoftTypography variant="h4" fontWeight="bold" mb={0.5}>
          Account Settings
        </SoftTypography>
        <SoftTypography variant="button" color="text" mb={2} display="block">
          Manage your notification and communication preferences.
        </SoftTypography>

        <AccountSectionNav /> {/* pragma: allowlist secret */}

        <Card sx={{ mt: 2 }}>
          <SoftBox p={3} display="flex" flexDirection="column" gap={1}>
            <SoftTypography variant="h6" fontWeight="bold" mb={1}>
              Preferences
            </SoftTypography>
            <FormControlLabel
              control={(
                <Switch
                  checked={emailNotifications}
                  onChange={(event) => setEmailNotifications(event.target.checked)}
                />
              )}
              label="Email notifications for account activity"
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={weeklyDigest}
                  onChange={(event) => setWeeklyDigest(event.target.checked)}
                />
              )}
              label="Weekly summary of updates"
            />
            <FormControlLabel
              control={(
                <Switch
                  checked={marketingEmails}
                  onChange={(event) => setMarketingEmails(event.target.checked)}
                />
              )}
              label="Product news and marketing emails"
            />
            <SoftBox mt={1}>
              <SoftButton
                variant="gradient"
                color="info"
                onClick={handleSaveSettings}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save settings'}
              </SoftButton>
            </SoftBox>
          </SoftBox>
        </Card>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AccountSettingsPage;
