/**
 * Sites page - based on soft layouts/ecommerce/products/products-list
 * DataTable with sites list
 */
import React, { useState } from 'react';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Icon from '@mui/material/Icon';

import Footer from 'examples/Footer';

import { useSites, useSitesStatusPoll, useFetchSiteMetaIfNeeded } from '../domains/sites';
import { useSitesUpdateStats } from '../hooks/useWordPress';
import { usePinnedSites } from '../hooks/usePinnedSites';
import AddSiteModal from '../components/sites/AddSiteModal';
import ResponsiveSitesTable from '../components/sites/ResponsiveSitesTable';
import { contentPageShellSx, contentPaperSurfaceSx, contentPaperPageTitleSx, contentPaperPageDescriptionSx } from '../theme/contentPaper';

const SitesPage: React.FC = () => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { data: sites, isLoading, isError, error } = useSites();
  const enabledSites = (sites ?? []).filter((s) => s.enabled !== false);
  useSitesUpdateStats(enabledSites);
  useSitesStatusPoll(enabledSites.map((s) => s.$id));
  useFetchSiteMetaIfNeeded(enabledSites);
  const { togglePin, isPinned } = usePinnedSites(sites ?? []);

  return (
    <>
      <AddSiteModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />

      <SoftBox sx={contentPageShellSx}>
        <Card sx={contentPaperSurfaceSx}>
          <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" p={3}>
            <SoftBox lineHeight={1}>
              <SoftTypography sx={contentPaperPageTitleSx}>
                Sites
              </SoftTypography>
              <SoftTypography sx={{ ...contentPaperPageDescriptionSx, display: 'block', mt: 0.5 }}>
                Manage your connected WordPress sites.
              </SoftTypography>
            </SoftBox>
            <Stack spacing={1} direction="row">
              <SoftButton variant="gradient" color="info" size="small" onClick={() => setAddModalOpen(true)}>
                + New site
              </SoftButton>
            </Stack>
          </SoftBox>

          {isLoading && (
            <SoftBox p={6} textAlign="center">
              <SoftTypography variant="button" color="secondary">Loading...</SoftTypography>
            </SoftBox>
          )}

          {isError && (
            <SoftBox p={4}>
              <SoftTypography variant="button" color="error">{error?.message || 'Error loading sites.'}</SoftTypography>
            </SoftBox>
          )}

          {!isLoading && !isError && sites && sites.length === 0 && (
            <SoftBox p={6} textAlign="center">
              <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }}>public</Icon>
              <SoftTypography variant="h6" fontWeight="medium" mb={1}>No sites yet</SoftTypography>
              <SoftTypography variant="button" color="secondary" mb={2} display="block">
                Add your first WordPress site to get started.
              </SoftTypography>
              <SoftButton variant="gradient" color="info" size="small" onClick={() => setAddModalOpen(true)}>
                + New site
              </SoftButton>
            </SoftBox>
          )}

          {!isLoading && !isError && sites && sites.length > 0 && (
            <ResponsiveSitesTable
              sites={sites}
              showPinButton
              isPinned={isPinned}
              onTogglePin={togglePin}
              linkToDetails
              showHeader={false}
              headerColor="#4F5482"
              entriesPerPage={{ defaultValue: 10, entries: [5, 10, 15, 20, 25] }}
            />
          )}
        </Card>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default SitesPage;
