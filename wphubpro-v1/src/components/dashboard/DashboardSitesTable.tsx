/**
 * Dashboard sites table - shows only sites with meta_data.pinned === true
 * Responsive: compact expandable rows on small screens
 * Max 5 visible, scroll arrows when more than 5
 */
import React, { useMemo } from 'react';
import Card from '@mui/material/Card';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import { Site } from '../../types';
import { usePinnedSites, isSitePinned } from '../../hooks/usePinnedSites';
import ResponsiveSitesTable from '../sites/ResponsiveSitesTable';
import ScrollableBox from '../ui/ScrollableBox';

interface DashboardSitesTableProps {
  sites: Site[];
}

const DashboardSitesTable: React.FC<DashboardSitesTableProps> = ({ sites }) => {
  const { togglePin, isPinned } = usePinnedSites(sites);
  const displaySites = useMemo(() => sites.filter(isSitePinned), [sites]);

  return (
    <Card sx={{ flex: 1, minHeight: 0, maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2, width: '100%' }}>
      <SoftBox sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {displaySites.length === 0 ? (
          <>
            <SoftBox p={2} borderBottom="1px solid" borderColor="grey-200" display="flex" justifyContent="space-between" alignItems="center">
              <SoftTypography variant="h6" fontWeight="bold" sx={{ color: '#4F5482' }}>Sites</SoftTypography>
            </SoftBox>
            <SoftBox py={3} textAlign="center">
              <SoftTypography variant="caption" color="secondary">
                No pinned sites. Pin sites from the Sites page to show them here.
              </SoftTypography>
            </SoftBox>
          </>
        ) : (
          <ScrollableBox
            fill
            showArrows={false}
            sx={{ flex: 1, minHeight: 0 }}
          >
            <ResponsiveSitesTable
              sites={displaySites}
              showPinButton
              isPinned={isPinned}
              onTogglePin={togglePin}
              linkToDetails
              headerColor="#4F5482"
              headerTitle="Sites"
              headerLinkText="All sites"
              headerLinkTo="/sites"
              noVerticalPadding
              showTotalEntries={false}
              canSearch={false}
              entriesPerPage={{ defaultValue: 50, entries: [50], showSelector: false }}
            />
          </ScrollableBox>
        )}
      </SoftBox>
    </Card>
  );
};

export default DashboardSitesTable;
