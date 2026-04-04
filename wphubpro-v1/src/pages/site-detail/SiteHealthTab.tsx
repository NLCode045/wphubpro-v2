/**
 * Site Health tab - Action log + health status
 */
import React, { useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import ScrollableTableWrapper from 'components/ScrollableTableWrapper';
import TableRow from '@mui/material/TableRow';
import DataTableHeadCell from 'examples/Tables/DataTable/DataTableHeadCell';
import DataTableBodyCell from 'examples/Tables/DataTable/DataTableBodyCell';
import Card from '@mui/material/Card';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import { useSite } from '../../domains/sites';
import type { ActionLogEntry } from '../../types';
import { contentPaperSurfaceSx } from '../../theme/contentPaper';

interface SiteHealthTabProps {
  siteId: string;
}

const SiteHealthTab: React.FC<SiteHealthTabProps> = ({ siteId }) => {
  const { data: site, isLoading, isError, error } = useSite(siteId);
  const [expanded, setExpanded] = useState<number | null>(null);

  if (isLoading) {
    return (
      <SoftBox p={6} textAlign="center">
        <SoftTypography variant="button" color="secondary">Loading action log...</SoftTypography>
      </SoftBox>
    );
  }

  if (isError || !site) {
    return (
      <SoftBox p={4}>
        <SoftTypography variant="button" color="error">{error?.message || 'Error loading.'}</SoftTypography>
      </SoftBox>
    );
  }

  const log: ActionLogEntry[] = Array.isArray(site?.actionLog) ? [...site.actionLog].reverse() : [];

  return (
    <Card sx={contentPaperSurfaceSx}>
      <SoftBox p={2} borderBottom="1px solid" borderColor="grey-200">
        <SoftTypography variant="h6" fontWeight="medium">Site Health &amp; Action Log</SoftTypography>
        <SoftTypography variant="caption" color="secondary">Overview of API calls and health</SoftTypography>
      </SoftBox>
      <ScrollableTableWrapper maxHeight="55vh">
        <Table
          stickyHeader
          sx={{
            tableLayout: 'fixed',
            width: '100%',
            '& thead th': {
              position: 'sticky',
              top: 0,
              zIndex: 2,
              backgroundColor: 'background.paper',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
            },
            '& tbody td:first-of-type': {
              paddingLeft: (theme) => theme.spacing(5),
              paddingRight: (theme) => theme.spacing(3),
            },
            '& thead th:last-of-type': { paddingRight: (theme) => theme.spacing(4) },
            '& tbody td:last-of-type': { paddingRight: (theme) => theme.spacing(4) },
          }}
        >
          <SoftBox component="thead">
            <TableRow>
              {/* Column widths total 100%: 25 + 35 + 25 + 15 */}
              <DataTableHeadCell width="25%" pl={5} color="#4F5482">Action</DataTableHeadCell>
              <DataTableHeadCell width="35%" pl={undefined} color="#4F5482">Endpoint</DataTableHeadCell>
              <DataTableHeadCell width="25%" pl={undefined} color="#4F5482">Date/Time</DataTableHeadCell>
              <DataTableHeadCell width="15%" align="right" pl={undefined} color="#4F5482">{null}</DataTableHeadCell>
            </TableRow>
          </SoftBox>
          <TableBody>
            {log.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <SoftTypography variant="caption" color="secondary">No actions logged yet.</SoftTypography>
                </TableCell>
              </TableRow>
            )}
            {log.map((entry, idx) => (
              <React.Fragment key={idx}>
                <TableRow>
                  <DataTableBodyCell><SoftTypography variant="caption">{entry.action}</SoftTypography></DataTableBodyCell>
                  <DataTableBodyCell><SoftTypography variant="caption" sx={{ wordBreak: 'break-all' }}>{entry.endpoint}</SoftTypography></DataTableBodyCell>
                  <DataTableBodyCell><SoftTypography variant="caption">{new Date(entry.timestamp).toLocaleString('nl-NL')}</SoftTypography></DataTableBodyCell>
                  <DataTableBodyCell align="right">
                    <SoftButton
                      variant="text"
                      color="info"
                      size="small"
                      onClick={() => setExpanded(expanded === idx ? null : idx)}
                    >
                      {expanded === idx ? 'Hide' : 'Details'}
                    </SoftButton>
                  </DataTableBodyCell>
                </TableRow>
                {expanded === idx && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ py: 0, borderTop: 'none' }}>
                      <SoftBox p={2} bgColor="grey-100" borderRadius="md">
                        <SoftTypography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.7rem' }}>
                          <strong>Request:</strong> {JSON.stringify(entry.request, null, 2)}
                          {'\n'}
                          <strong>Response:</strong> {typeof entry.response === 'object' ? JSON.stringify(entry.response, null, 2) : String(entry.response)}
                        </SoftTypography>
                      </SoftBox>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </ScrollableTableWrapper>
    </Card>
  );
};

export default SiteHealthTab;
