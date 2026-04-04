/**
 * Dashboard Logs tab — same table chrome as Sites tab (DataTable + header row).
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import LinkMui from '@mui/material/Link';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import DataTable from 'examples/Tables/DataTable';
import ScrollableBox from '../ui/ScrollableBox';
import { Site } from '../../types';
import { DASHBOARD_TABLE_HEADER_COLOR, dashboardTabTableCardSx } from './dashboardTabTableConstants';

interface DashboardLogsSitesTableProps {
  sites: Site[];
}

const HEADER = DASHBOARD_TABLE_HEADER_COLOR;

function lastLogHint(site: Site): string {
  const incoming = site.logData?.incoming;
  if (incoming && incoming.length > 0) {
    const last = incoming[incoming.length - 1];
    return last?.time ? new Date(last.time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—';
  }
  return '—';
}

const DashboardLogsSitesTable: React.FC<DashboardLogsSitesTableProps> = ({ sites }) => {
  const rows = useMemo(() => sites.filter((s) => s.enabled !== false), [sites]);

  const table = useMemo(
    () => ({
      columns: [
        {
          Header: 'Site',
          accessor: 'site',
          width: '36%',
          Cell: ({ value }: { value: string }) => (
            <SoftTypography variant="button" fontWeight="medium" sx={{ color: HEADER }}>
              {value}
            </SoftTypography>
          ),
        },
        {
          Header: 'Connection',
          accessor: 'connection',
          width: '20%',
          disableSortBy: true,
        },
        {
          Header: 'Recent activity',
          accessor: 'activity',
          width: '28%',
          disableSortBy: true,
          Cell: ({ value }: { value: string }) => (
            <SoftTypography variant="caption" color="secondary">
              {value}
            </SoftTypography>
          ),
        },
        {
          Header: 'Open logs',
          accessor: 'open',
          width: '16%',
          align: 'right' as const,
          disableSortBy: true,
        },
      ],
      rows: rows.map((site) => ({
        site: site.siteName || site.siteUrl,
        connection: (
          <Chip
            size="small"
            label={site.status === 'connected' ? 'Connected' : 'Disconnected'}
            color={site.status === 'connected' ? 'success' : 'default'}
            variant="outlined"
          />
        ),
        activity: lastLogHint(site),
        open: (
          <LinkMui component={Link} to={`/sites/${site.$id}?tab=4`} variant="caption" underline="hover" sx={{ color: HEADER, fontWeight: 600 }}>
            View logs
          </LinkMui>
        ),
      })),
    }),
    [rows]
  );

  return (
    <Card sx={dashboardTabTableCardSx}>
      <SoftBox sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {rows.length === 0 ? (
          <>
            <SoftBox p={2} mb={2} borderBottom="1px solid" borderColor="grey-200" display="flex" justifyContent="space-between" alignItems="center">
              <SoftTypography variant="h6" fontWeight="bold" sx={{ color: HEADER }}>
                Logs
              </SoftTypography>
              <Link to="/sites" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <SoftTypography variant="button" fontWeight="bold" sx={{ color: HEADER }}>
                  All sites
                </SoftTypography>
                <Icon sx={{ fontSize: 18, color: HEADER }}>arrow_forward</Icon>
              </Link>
            </SoftBox>
            <SoftBox pt={0} pr={2} pb={2} pl={1}>
              <SoftBox py={3} textAlign="center">
                <SoftTypography variant="caption" color="secondary">
                  No sites to show.
                </SoftTypography>
              </SoftBox>
            </SoftBox>
          </>
        ) : (
          <ScrollableBox fill showArrows={false} sx={{ flex: 1, minHeight: 0 }}>
            <SoftBox p={2} mb={2} borderBottom="1px solid" borderColor="grey-200" display="flex" justifyContent="space-between" alignItems="center">
              <SoftTypography variant="h6" fontWeight="bold" sx={{ color: HEADER }}>
                Logs
              </SoftTypography>
              <Link to="/sites" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <SoftTypography variant="button" fontWeight="bold" sx={{ color: HEADER }}>
                  All sites
                </SoftTypography>
                <Icon sx={{ fontSize: 18, color: HEADER }}>arrow_forward</Icon>
              </Link>
            </SoftBox>
            <SoftBox pt={0} pr={2} pb={0} pl={1}>
              <DataTable
                table={table}
                entriesPerPage={{ defaultValue: 50, entries: [50], showSelector: false }}
                canSearch={false}
                headerColor={HEADER}
                showTotalEntries={false}
              />
            </SoftBox>
          </ScrollableBox>
        )}
      </SoftBox>
    </Card>
  );
};

export default DashboardLogsSitesTable;
