import React, { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import SoftInput from 'components/SoftInput';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import SoftAvatar from 'components/SoftAvatar';
import Footer from 'examples/Footer';
import { contentPageShellSx } from '../../theme/contentPaper';
import { useAuth } from '../../domains/auth';
import { avatars, account } from '../../services/appwrite';
import {
  useSubscription,
  useUsage,
  useInvoices,
  useManageSubscription,
} from '../../domains/billing';
import { useToast } from '../../contexts/ToastContext';
import TabNavList, { TabNavPanel } from '../../components/ui/TabNavList';

const formatMoney = (amountCents: number, currency = 'eur') =>
  (amountCents / 100).toLocaleString('nl-NL', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  });

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
    <SoftTypography variant="button" color="secondary" sx={{ minWidth: 100, flexShrink: 0 }}>
      {label}:
    </SoftTypography>
    {value}
  </SoftBox>
);

const AccountProfilePage: React.FC = () => {
  const { user, isAdmin, refreshUser } = useAuth();
  const { toast } = useToast();
  const { data: subscription, isLoading: isSubLoading } = useSubscription();
  const { data: usage } = useUsage();
  const { data: invoices, isLoading: isInvoicesLoading } = useInvoices();
  const manageSubscription = useManageSubscription();

  const [activeTab, setActiveTab] = useState(0);

  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    const prefs = (user?.prefs ?? {}) as Record<string, unknown>;
    setDisplayName(typeof prefs.displayName === 'string' ? prefs.displayName : '');
    setEmailNotifications(prefs.emailNotifications !== false);
    setMarketingEmails(prefs.marketingEmails === true);
    setWeeklyDigest(prefs.weeklyDigest !== false);
  }, [user]);

  const avatarUrl = (() => {
    try {
      const initials = (user?.name || user?.email || 'U').substring(0, 2).toUpperCase();
      return avatars.getInitials(initials, 200, 200).toString();
    } catch {
      return undefined;
    }
  })();

  const memberSince = (user as { $createdAt?: string } | null)?.$createdAt
    ? new Date((user as { $createdAt?: string }).$createdAt as string).toLocaleDateString('nl-NL', {
        month: 'long',
        year: 'numeric',
      })
    : '-';

  const usernameDisplay = user?.email?.split('@')[0] ?? '-';
  const isFree = !subscription?.priceAmount || (subscription.planId ?? '').toUpperCase() === 'FREE';
  const usagePct = (used: number, limit: number) =>
    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await account.updateName(name.trim());
      const currentPrefs = (user?.prefs ?? {}) as Record<string, unknown>;
      await account.updatePrefs({ ...currentPrefs, displayName: displayName.trim() });
      await refreshUser();
      toast({ title: 'Profile updated', description: 'Your profile has been updated.', variant: 'success' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Could not update profile.';
      toast({ title: 'Update failed', description: msg, variant: 'destructive' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: 'Password too short', description: 'Minimum 8 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please ensure both passwords are identical.', variant: 'destructive' });
      return;
    }
    setIsSavingPassword(true);
    try {
      await account.updatePassword(newPassword, currentPassword || undefined);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Password updated', variant: 'success' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Could not change password.';
      toast({ title: 'Password update failed', description: msg, variant: 'destructive' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const currentPrefs = (user?.prefs ?? {}) as Record<string, unknown>;
      await account.updatePrefs({ ...currentPrefs, emailNotifications, marketingEmails, weeklyDigest });
      await refreshUser();
      toast({ title: 'Settings saved', description: 'Your settings have been saved.', variant: 'success' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Could not save settings.';
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <Grid container spacing={3} alignItems="flex-start">
          {/* Left: Profile Card */}
          <Grid item xs={12} md={4} lg={3}>
            <Card>
              <SoftBox p={3} display="flex" flexDirection="column" alignItems="center" textAlign="center">
                <SoftAvatar
                  src={avatarUrl}
                  alt={user?.name || 'avatar'}
                  size="xl"
                  bgColor="info"
                  variant="circular"
                  sx={{ width: 90, height: 90 }}
                />
                <SoftTypography variant="h5" fontWeight="bold" mt={1.5}>
                  {user?.name || 'User'}
                </SoftTypography>
                <SoftBox
                  mt={0.5}
                  mb={2}
                  sx={{
                    bgcolor: 'info.main',
                    borderRadius: '4px',
                    px: 1.5,
                    py: 0.3,
                    display: 'inline-block',
                  }}
                >
                  <SoftTypography
                    variant="caption"
                    fontWeight="bold"
                    sx={{ color: '#fff', fontSize: '0.65rem', letterSpacing: 1, textTransform: 'uppercase' }}
                  >
                    {isAdmin ? 'Admin' : 'Member'}
                  </SoftTypography>
                </SoftBox>

                {/* Stats row */}
                <SoftBox display="flex" width="100%" mb={2}>
                  <SoftBox flex={1} textAlign="center">
                    <SoftTypography variant="h5" fontWeight="bold">
                      {usage?.sitesUsed ?? 0}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="secondary">
                      Sites
                    </SoftTypography>
                  </SoftBox>
                  <Divider orientation="vertical" flexItem />
                  <SoftBox flex={1} textAlign="center">
                    <SoftTypography variant="h5" fontWeight="bold">
                      {usage?.libraryUsed ?? 0}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="secondary">
                      Library
                    </SoftTypography>
                  </SoftBox>
                </SoftBox>

                <Divider sx={{ width: '100%', my: 0.5 }} />

                {/* Details section */}
                <SoftBox width="100%" textAlign="left" mt={1.5}>
                  <SoftTypography variant="button" fontWeight="bold" mb={1.5} display="block">
                    Details
                  </SoftTypography>

                  <DetailRow label="Username" value={
                    <SoftTypography variant="button" fontWeight="medium">
                      @{usernameDisplay}
                    </SoftTypography>
                  } />
                  <DetailRow label="Billing Email" value={
                    <SoftTypography
                      variant="button"
                      fontWeight="medium"
                      sx={{ textAlign: 'right', wordBreak: 'break-word', maxWidth: 160 }}
                    >
                      {user?.email ?? '-'}
                    </SoftTypography>
                  } />
                  <DetailRow label="Status" value={
                    <SoftBox
                      sx={{
                        bgcolor: '#e8f5e9',
                        borderRadius: '4px',
                        px: 1,
                        py: 0.15,
                        display: 'inline-block',
                      }}
                    >
                      <SoftTypography
                        variant="caption"
                        fontWeight="bold"
                        sx={{ color: '#2e7d32', fontSize: '0.65rem', letterSpacing: 0.5, textTransform: 'uppercase' }}
                      >
                        Active
                      </SoftTypography>
                    </SoftBox>
                  } />
                  <DetailRow label="Role" value={
                    <SoftTypography variant="button" fontWeight="medium">
                      {isAdmin ? 'Admin' : 'Member'}
                    </SoftTypography>
                  } />
                  <DetailRow label="Plan" value={
                    <SoftTypography variant="button" fontWeight="medium">
                      {isSubLoading ? '...' : (subscription?.planId ?? 'FREE')}
                    </SoftTypography>
                  } />
                  <DetailRow label="Member since" value={
                    <SoftTypography variant="button" fontWeight="medium">
                      {memberSince}
                    </SoftTypography>
                  } />
                </SoftBox>

                <SoftBox mt={2.5} width="100%">
                  <SoftButton
                    variant="gradient"
                    color="info"
                    fullWidth
                    size="small"
                    onClick={() => setActiveTab(0)}
                  >
                    Edit Profile
                  </SoftButton>
                </SoftBox>
              </SoftBox>
            </Card>
          </Grid>

          {/* Right: Tabs content */}
          <Grid item xs={12} md={8} lg={9}>
            <TabNavList
              items={[
                { value: 0, label: 'Account', icon: 'person_outline' },
                { value: 1, label: 'Security', icon: 'lock_outline' },
                { value: 2, label: 'Billing & Plans', icon: 'credit_card' },
                { value: 3, label: 'Notifications', icon: 'notifications_none' },
              ]}
              value={activeTab}
              onChange={(_, v: number) => setActiveTab(v)}
              sx={{ px: 0, pt: 0, mb: 2 }}
            />

            <Card>
              <SoftBox px={3} pb={3} pt={1}>
                {/* Account Tab */}
                <TabNavPanel value={activeTab} index={0}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <SoftTypography variant="h6" fontWeight="bold" mb={2}>
                        Profile details
                      </SoftTypography>
                      <SoftBox display="flex" flexDirection="column" gap={2}>
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
                    </Grid>
                  </Grid>
                </TabNavPanel>

                {/* Security Tab */}
                <TabNavPanel value={activeTab} index={1}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <SoftTypography variant="h6" fontWeight="bold" mb={2}>
                        Change password
                      </SoftTypography>
                      <SoftBox display="flex" flexDirection="column" gap={2}>
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
                    </Grid>
                  </Grid>
                </TabNavPanel>

                {/* Billing & Plans Tab */}
                <TabNavPanel value={activeTab} index={2}>
                  {/* Plan header */}
                  <SoftBox
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    flexWrap="wrap"
                    gap={2}
                    mb={2.5}
                  >
                    <SoftBox>
                      <SoftTypography variant="h6" fontWeight="bold">
                        Current Plan
                      </SoftTypography>
                      <SoftTypography variant="button" color="text" display="block">
                        Your Current Plan is{' '}
                        <strong>{isSubLoading ? '...' : (subscription?.planId ?? 'FREE')}</strong>
                      </SoftTypography>
                      {subscription?.currentPeriodEnd && (
                        <SoftTypography variant="caption" color="secondary">
                          Active until{' '}
                          {new Date(subscription.currentPeriodEnd).toLocaleDateString('nl-NL')}
                        </SoftTypography>
                      )}
                    </SoftBox>
                    <SoftBox textAlign="right">
                      <SoftTypography variant="h5" fontWeight="bold" color="info">
                        {subscription?.priceAmount
                          ? formatMoney(subscription.priceAmount, subscription.currency ?? 'eur')
                          : 'Gratis'}
                      </SoftTypography>
                      {subscription?.interval && (
                        <SoftTypography variant="caption" color="secondary">
                          per {subscription.interval}
                        </SoftTypography>
                      )}
                    </SoftBox>
                  </SoftBox>

                  {/* Usage metrics */}
                  <SoftBox
                    display="grid"
                    gridTemplateColumns={{ xs: '1fr', sm: 'repeat(3, 1fr)' }}
                    gap={2}
                    mb={3}
                  >
                    {[
                      {
                        label: 'Sites',
                        used: usage?.sitesUsed ?? 0,
                        limit: subscription?.sitesLimit ?? 1,
                      },
                      {
                        label: 'Library items',
                        used: usage?.libraryUsed ?? 0,
                        limit: subscription?.libraryLimit ?? 5,
                      },
                      {
                        label: 'Storage',
                        used: usage?.storageUsed ?? 0,
                        limit: subscription?.storageLimit ?? 10,
                      },
                    ].map(({ label, used, limit }) => (
                      <Card
                        key={label}
                        variant="outlined"
                        sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'grey.200' }}
                      >
                        <SoftBox p={2}>
                          <SoftBox display="flex" justifyContent="space-between" mb={0.75}>
                            <SoftTypography variant="caption" color="secondary">
                              {label}
                            </SoftTypography>
                            <SoftTypography variant="caption" fontWeight="bold">
                              {used} / {limit}
                            </SoftTypography>
                          </SoftBox>
                          <LinearProgress
                            variant="determinate"
                            value={usagePct(used, limit)}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: 'info.main',
                                borderRadius: 3,
                              },
                            }}
                          />
                        </SoftBox>
                      </Card>
                    ))}
                  </SoftBox>

                  {!isFree && (
                    <SoftBox display="flex" gap={1.5} mb={3}>
                      <SoftButton
                        variant="gradient"
                        color="info"
                        onClick={() => manageSubscription.mutate()}
                        disabled={manageSubscription.isPending}
                      >
                        {manageSubscription.isPending ? 'Opening...' : 'Upgrade Plan'}
                      </SoftButton>
                      <SoftButton
                        variant="outlined"
                        color="error"
                        onClick={() => manageSubscription.mutate()}
                        disabled={manageSubscription.isPending}
                      >
                        Cancel Subscription
                      </SoftButton>
                    </SoftBox>
                  )}

                  <Divider sx={{ mb: 2.5 }} />

                  <SoftTypography variant="h6" fontWeight="bold" mb={1.5}>
                    Recent invoices
                  </SoftTypography>
                  {isInvoicesLoading ? (
                    <SoftTypography variant="button" color="text">
                      Loading...
                    </SoftTypography>
                  ) : (invoices ?? []).length === 0 ? (
                    <SoftTypography variant="button" color="text">
                      No invoices available.
                    </SoftTypography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Bedrag</TableCell>
                            <TableCell align="right">PDF</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(invoices ?? []).map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell>
                                {new Date(invoice.created * 1000).toLocaleDateString('nl-NL')}
                              </TableCell>
                              <TableCell>{invoice.status}</TableCell>
                              <TableCell>
                                {formatMoney(invoice.amount_paid, invoice.currency)}
                              </TableCell>
                              <TableCell align="right">
                                <SoftButton
                                  component="a"
                                  href={invoice.invoice_pdf}
                                  target="_blank"
                                  rel="noreferrer"
                                  variant="outlined"
                                  color="info"
                                  size="small"
                                >
                                  Open
                                </SoftButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </TabNavPanel>

                {/* Notifications Tab */}
                <TabNavPanel value={activeTab} index={3}>
                  <SoftTypography variant="h6" fontWeight="bold" mb={2}>
                    Notification preferences
                  </SoftTypography>
                  <SoftBox display="flex" flexDirection="column" gap={1.5}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={emailNotifications}
                          onChange={(e) => setEmailNotifications(e.target.checked)}
                        />
                      }
                      label="Email notifications for account activity"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={weeklyDigest}
                          onChange={(e) => setWeeklyDigest(e.target.checked)}
                        />
                      }
                      label="Weekly summary of updates"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={marketingEmails}
                          onChange={(e) => setMarketingEmails(e.target.checked)}
                        />
                      }
                      label="Product news and marketing emails"
                    />
                    <SoftBox mt={1}>
                      <SoftButton
                        variant="gradient"
                        color="info"
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings}
                      >
                        {isSavingSettings ? 'Saving...' : 'Save settings'}
                      </SoftButton>
                    </SoftBox>
                  </SoftBox>
                </TabNavPanel>
              </SoftBox>
            </Card>
          </Grid>
        </Grid>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AccountProfilePage;
