/**
 * Admin Platform Settings - Tabbed settings for Appwrite, Branding, Menu, Storage
 */
import React, { useState } from 'react';
import Card from '@mui/material/Card';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import TabNavList, { TabNavPanel } from 'components/ui/TabNavList';
import AppwriteSettingsTab from './platform-settings/AppwriteSettingsTab';
import BrandingSettingsTab from './platform-settings/BrandingSettingsTab';
import MenuItemsTab from './platform-settings/MenuItemsTab';
import StorageSettingsTab from './platform-settings/StorageSettingsTab';
import StripeSettingsTab from './platform-settings/StripeSettingsTab';
import { contentPageShellSx } from '../../theme/contentPaper';

const TAB_ITEMS = [
  { value: 0, label: 'Appwrite', icon: 'cloud' },
  { value: 1, label: 'Branding', icon: 'palette' },
  { value: 2, label: 'Menu Items', icon: 'menu' },
  { value: 3, label: 'Storage', icon: 'folder' },
  { value: 4, label: 'Stripe', icon: 'credit_card' },
];

const AdminPlatformSettingsPage: React.FC = () => {
  const [tab, setTab] = useState(0);

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <SoftTypography variant="h4" fontWeight="bold" mb={2}>
          Platform instellingen
        </SoftTypography>
        <TabNavList items={TAB_ITEMS} value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} />
        <Card sx={{ overflow: 'hidden' }}>
          <SoftBox px={3} pb={3} sx={{ minHeight: 320 }}>
            <TabNavPanel value={tab} index={0}>
              <AppwriteSettingsTab />
            </TabNavPanel>
            <TabNavPanel value={tab} index={1}>
              <BrandingSettingsTab />
            </TabNavPanel>
            <TabNavPanel value={tab} index={2}>
              <MenuItemsTab />
            </TabNavPanel>
            <TabNavPanel value={tab} index={3}>
              <StorageSettingsTab />
            </TabNavPanel>
            <TabNavPanel value={tab} index={4}>
              <StripeSettingsTab />
            </TabNavPanel>
          </SoftBox>
        </Card>
      </SoftBox>
    </>
  );
};

export default AdminPlatformSettingsPage;
