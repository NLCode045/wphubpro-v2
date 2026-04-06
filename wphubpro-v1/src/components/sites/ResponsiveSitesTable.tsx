/**
 * Responsive sites table - DataTable on md+, compact expandable rows on small screens
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@mui/material/Icon';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Collapse from '@mui/material/Collapse';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import DataTable from 'examples/Tables/DataTable';
import { Site } from '../../types';
import { SiteCell, StatusIcon, HealthScoreBadge, ActionCell, BridgeVersionCell, formatHeartbeatRelative } from './SitesTableCells';

interface ResponsiveSitesTableProps {
  sites: Site[];
  showPinButton?: boolean;
  isPinned?: (id: string) => boolean;
  onTogglePin?: (id: string) => void;
  linkToDetails?: boolean;
  headerColor?: string;
  headerTitle?: string;
  headerLinkText?: string;
  headerLinkTo?: string;
  showHeader?: boolean;
  /** For desktop DataTable */
  entriesPerPage?: { defaultValue: number; entries: number[]; showSelector?: boolean };
  /** Remove top/bottom padding (e.g. for dashboard) */
  noVerticalPadding?: boolean;
  /** Hide "Showing X to Y of Z entries" footer */
  showTotalEntries?: boolean;
  /** Show search input (DataTable) */
  canSearch?: boolean;
}

export default function ResponsiveSitesTable({
  sites,
  showPinButton = false,
  isPinned = () => false,
  onTogglePin,
  linkToDetails = true,
  headerColor = '#4F5482',
  headerTitle = 'Sites',
  headerLinkText = 'All sites',
  headerLinkTo = '/sites',
  showHeader = true,
  entriesPerPage = { defaultValue: 5, entries: [5], showSelector: false },
  noVerticalPadding = false,
  showTotalEntries = true,
  canSearch = true,
}: ResponsiveSitesTableProps) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!isSmall) {
    const dataTableData = {
      columns: [
        { Header: 'Site', accessor: 'site', width: '32%', Cell: ({ value, row }: any) => <SiteCell value={value} siteId={row.original.siteId} linkToDetails={linkToDetails} /> },
        { Header: 'Status', accessor: 'status', width: '16%', disableSortBy: true, Cell: ({ value, row }: any) => (
          <SoftBox display="flex" alignItems="center" gap={1}>
            <StatusIcon value={value} />
            <Tooltip title={row.original.heartbeatAt ? new Date(row.original.heartbeatAt).toLocaleString('nl-NL') : ''} placement="top">
              <SoftTypography variant="caption" color="secondary">
                {formatHeartbeatRelative(row.original.heartbeatAt)}
              </SoftTypography>
            </Tooltip>
          </SoftBox>
        ) },
        { Header: 'Bridge', accessor: 'bridgeVersion', width: '12%', disableSortBy: true, Cell: ({ row }: any) => <BridgeVersionCell site={row.original.siteData} /> },
        { Header: 'Health', accessor: 'health', width: '16%', disableSortBy: true, Cell: ({ row }: any) => <HealthScoreBadge site={row.original.siteData} /> },
        { Header: 'Actions', accessor: 'action', width: '12%', disableSortBy: true },
      ],
      rows: sites.map((site) => ({
        site: [site.siteName || site.siteUrl || 'Untitled', { url: site.siteUrl || '-' }],
        siteId: site.$id,
        status: site.status,
        heartbeatAt: site.connectionStatus?.heartbeatUpdatedAt ?? (site as any).heartbeatUpdatedAt ?? (site as any).heartbeat_updated_at ?? '',
        health: site.healthStatus,
        siteData: site,
        action: (
          <ActionCell
            siteId={site.$id}
            siteUrl={site.siteUrl || '#'}
            site={site}
            showPinButton={showPinButton}
            isPinned={isPinned(site.$id)}
            onTogglePin={onTogglePin ? () => onTogglePin(site.$id) : undefined}
            compact
          />
        ),
      })),
    };
    return (
      <>
        {showHeader && (
        <SoftBox p={2} mb={2} borderBottom="1px solid" borderColor="grey-200" display="flex" justifyContent="space-between" alignItems="center">
          <SoftTypography variant="h6" fontWeight="bold" sx={{ color: headerColor }}>{headerTitle}</SoftTypography>
          {headerLinkTo && (
            <Link to={headerLinkTo} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <SoftTypography variant="button" fontWeight="bold" sx={{ color: headerColor }}>{headerLinkText}</SoftTypography>
              <Icon sx={{ fontSize: 18, color: headerColor }}>arrow_forward</Icon>
            </Link>
          )}
        </SoftBox>
        )}
        <SoftBox pt={noVerticalPadding ? 0 : 2} pr={2} pb={noVerticalPadding ? 0 : 2} pl={1}>
          <DataTable
            table={dataTableData}
            entriesPerPage={entriesPerPage}
            canSearch={canSearch}
            headerColor={headerColor}
            showTotalEntries={showTotalEntries}
          />
        </SoftBox>
      </>
    );
  }

  return (
    <>
      {showHeader && (
      <SoftBox p={2} mb={2} borderBottom="1px solid" borderColor="grey-200" display="flex" justifyContent="space-between" alignItems="center">
        <SoftTypography variant="h6" fontWeight="bold" sx={{ color: headerColor }}>{headerTitle}</SoftTypography>
        {headerLinkTo && (
          <Link to={headerLinkTo} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <SoftTypography variant="button" fontWeight="bold" sx={{ color: headerColor }}>{headerLinkText}</SoftTypography>
            <Icon sx={{ fontSize: 18, color: headerColor }}>arrow_forward</Icon>
          </Link>
        )}
      </SoftBox>
      )}
      <SoftBox px={2} pt={noVerticalPadding ? 0 : 2} pb={noVerticalPadding ? 0 : 2}>
        {sites.length === 0 ? (
          <SoftBox py={3} textAlign="center">
            <SoftTypography variant="caption" color="secondary">No sites registered.</SoftTypography>
          </SoftBox>
        ) : (
          <SoftBox display="flex" flexDirection="column" gap={1}>
            {sites.map((site) => {
              const isExpanded = expanded[site.$id];
              return (
                <SoftBox
                  key={site.$id}
                  onClick={() => toggleExpand(site.$id)}
                  sx={{
                    border: '1px solid',
                    borderColor: 'grey.200',
                    borderRadius: 2,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <SoftBox p={2} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <SoftBox flex={1} minWidth={0} sx={{ flexBasis: 'min-content' }}>
                      <SiteCell
                        value={[site.siteName || site.siteUrl || 'Untitled', { url: site.siteUrl || '-' }]}
                        siteId={site.$id}
                        linkToDetails={linkToDetails}
                      />
                    </SoftBox>
                    <SoftBox display="flex" alignItems="center" gap={0.5} onClick={(e) => e.stopPropagation()}>
                      <ActionCell
                        siteId={site.$id}
                        siteUrl={site.siteUrl || '#'}
                        site={site}
                        showPinButton={showPinButton}
                        isPinned={isPinned(site.$id)}
                        onTogglePin={onTogglePin ? () => onTogglePin(site.$id) : undefined}
                        compact
                      />
                    </SoftBox>
                    <Icon sx={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                      expand_more
                    </Icon>
                  </SoftBox>
                  <Collapse in={isExpanded}>
                    <SoftBox px={2} pb={2} display="flex" flexWrap="wrap" gap={2} alignItems="center">
                      <SoftBox display="flex" alignItems="center" gap={0.5}>
                        <SoftTypography variant="caption" color="secondary">Status:</SoftTypography>
                        <StatusIcon value={site.status} />
                        <Tooltip title={site.connectionStatus?.heartbeatUpdatedAt ?? (site as any).heartbeatUpdatedAt ? new Date(site.connectionStatus?.heartbeatUpdatedAt ?? (site as any).heartbeatUpdatedAt).toLocaleString('nl-NL') : ''} placement="top">
                          <SoftTypography variant="caption" color="secondary">
                            {formatHeartbeatRelative(site.connectionStatus?.heartbeatUpdatedAt ?? (site as any).heartbeatUpdatedAt)}
                          </SoftTypography>
                        </Tooltip>
                      </SoftBox>
                      <SoftBox display="flex" alignItems="center" gap={0.5}>
                        <SoftTypography variant="caption" color="secondary">Bridge:</SoftTypography>
                        <BridgeVersionCell site={site} />
                      </SoftBox>
                      <SoftBox display="flex" alignItems="center" gap={0.5}>
                        <SoftTypography variant="caption" color="secondary">Health:</SoftTypography>
                        <HealthScoreBadge site={site} />
                      </SoftBox>
                    </SoftBox>
                  </Collapse>
                </SoftBox>
              );
            })}
          </SoftBox>
        )}
      </SoftBox>
    </>
  );
}
