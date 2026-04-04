import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import ScrollableTableWrapper from 'components/ScrollableTableWrapper';
import TableRow from '@mui/material/TableRow';
import DataTableHeadCell from 'examples/Tables/DataTable/DataTableHeadCell';
import DataTableBodyCell from 'examples/Tables/DataTable/DataTableBodyCell';
import Card from '@mui/material/Card';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import SoftBox from 'components/SoftBox';
import SoftButton from 'components/SoftButton';
import SoftTypography from 'components/SoftTypography';
import { useThemes, useManageTheme } from '../../hooks/useWordPress';
import { useSite } from '../../domains/sites';
import type { WordPressTheme } from '../../types';
import { iconButtonOnLightSurfaceSx } from '../../theme/detailPageStyles';
import { contentPaperSurfaceSx } from '../../theme/contentPaper';

const infoGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';
const orangeGradient = 'linear-gradient(310deg, #ea580c, #fb923c)';

interface ThemesTabProps {
  siteId: string;
}

const ThemesTab: React.FC<ThemesTabProps> = ({ siteId }) => {
  const { data: site } = useSite(siteId);
  const { data: themes, isLoading, isError, error, refetch } = useThemes(siteId, { enabled: site?.enabled });
  const manageTheme = useManageTheme(siteId);

  const list = themes ?? [];
  const onlyOneTheme = list.length <= 1;

  const handleActivate = (theme: WordPressTheme) => {
    if (theme.status !== 'active') {
      manageTheme.mutate({ themeSlug: theme.stylesheet, action: 'activate', themeName: theme.name });
    }
  };

  const handleUpdate = (theme: WordPressTheme) => {
    manageTheme.mutate({ themeSlug: theme.stylesheet, action: 'update', themeName: theme.name });
  };

  const handleDelete = (theme: WordPressTheme) => {
    if (onlyOneTheme) return;
    if (theme.status === 'active') return;
    if (!window.confirm(`Remove theme “${theme.name}” from this site?`)) return;
    manageTheme.mutate({ themeSlug: theme.stylesheet, action: 'delete', themeName: theme.name });
  };

  const anyPending = manageTheme.isPending;

  if (isLoading) {
    return (
      <SoftBox display="flex" justifyContent="center" alignItems="center" p={6}>
        <Icon sx={{ fontSize: 40, color: 'grey.400', mr: 2 }}>sync</Icon>
        <SoftTypography variant="button" color="secondary">Loading themes...</SoftTypography>
      </SoftBox>
    );
  }

  if (isError) {
    const apiUrl = site ? `${String(site.siteUrl).replace(/\/$/, '')}/wp-json/wphubpro/v1/themes` : 'unknown';
    return (
      <Card sx={contentPaperSurfaceSx}>
        <SoftBox p={3}>
          <SoftTypography variant="caption" color="secondary" mb={2} display="block">API: {apiUrl}</SoftTypography>
          <SoftBox display="flex" alignItems="flex-start" gap={2}>
            <Icon color="error" sx={{ mt: 0.5 }}>error</Icon>
            <SoftBox flex={1}>
              <SoftTypography variant="h6" fontWeight="medium" color="error" mb={1}>Error loading themes</SoftTypography>
              <SoftTypography variant="caption" color="secondary" mb={2}>{error?.message || String(error)}</SoftTypography>
              <SoftButton variant="outlined" color="info" size="small" onClick={() => refetch()}>Try again</SoftButton>
            </SoftBox>
          </SoftBox>
        </SoftBox>
      </Card>
    );
  }

  return (
    <Card sx={contentPaperSurfaceSx}>
      <SoftBox p={2} borderBottom="1px solid" borderColor="grey-200">
        <SoftTypography variant="caption" color="secondary">
          API: {site ? `${String(site.siteUrl).replace(/\/$/, '')}/wp-json/wphubpro/v1/themes` : '-'}
        </SoftTypography>
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
              <DataTableHeadCell width="50%" pl={5} color="#4F5482">Theme</DataTableHeadCell>
              <DataTableHeadCell width="20%" pl={undefined} color="#4F5482">Status</DataTableHeadCell>
              <DataTableHeadCell width="20%" pl={undefined} color="#4F5482">Version</DataTableHeadCell>
              <DataTableHeadCell width="10%" align="right" pl={undefined} color="#4F5482" sorted="none">Actions</DataTableHeadCell>
            </TableRow>
          </SoftBox>
          <TableBody>
            {list.map((theme) => {
              const isActive = theme.status === 'active';
              const canDelete = !onlyOneTheme && !isActive;
              return (
                <TableRow key={theme.stylesheet}>
                  <DataTableBodyCell>
                    <SoftTypography variant="button" fontWeight="medium">{theme.name}</SoftTypography>
                  </DataTableBodyCell>
                  <DataTableBodyCell>
                    {isActive ? (
                      <Tooltip title="Active theme. Activate another theme to switch." placement="top">
                        <SoftBox
                          component="span"
                          sx={{
                            display: 'inline-block',
                            width: 90,
                            textAlign: 'center',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            background: orangeGradient,
                            color: '#ffffff',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'default',
                            opacity: 0.95,
                          }}
                        >
                          Active
                        </SoftBox>
                      </Tooltip>
                    ) : (
                      <SoftBox
                        component="button"
                        type="button"
                        onClick={() => handleActivate(theme)}
                        disabled={anyPending && manageTheme.variables?.themeSlug === theme.stylesheet}
                        sx={{
                          display: 'inline-block',
                          width: 90,
                          textAlign: 'center',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          border: 'none',
                          cursor: anyPending ? 'not-allowed' : 'pointer',
                          opacity: anyPending && manageTheme.variables?.themeSlug === theme.stylesheet ? 0.7 : 1,
                          background: infoGradient,
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          '&:hover:not(:disabled)': { filter: 'brightness(1.1)' },
                        }}
                      >
                        Activate
                      </SoftBox>
                    )}
                  </DataTableBodyCell>
                  <DataTableBodyCell>
                    <SoftBox display="flex" alignItems="center" gap={0.5}>
                      <SoftTypography variant="caption">{theme.version}</SoftTypography>
                      {theme.update != null && theme.update !== '' && (
                        <Tooltip title={`Update to ${theme.update}`} placement="top">
                          <IconButton
                            size="small"
                            onClick={() => handleUpdate(theme)}
                            disabled={manageTheme.isPending && manageTheme.variables?.themeSlug === theme.stylesheet}
                            sx={iconButtonOnLightSurfaceSx}
                            aria-label={`Update ${theme.name}`}
                          >
                            <Icon sx={{ fontSize: 18 }}>sync</Icon>
                          </IconButton>
                        </Tooltip>
                      )}
                    </SoftBox>
                  </DataTableBodyCell>
                  <DataTableBodyCell align="right">
                    <Tooltip
                      title={
                        onlyOneTheme
                          ? 'Cannot remove the only installed theme'
                          : isActive
                            ? 'Switch to another theme before removing this one'
                            : 'Remove theme from site'
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(theme)}
                          disabled={!canDelete || (manageTheme.isPending && manageTheme.variables?.themeSlug === theme.stylesheet)}
                          sx={iconButtonOnLightSurfaceSx}
                          aria-label={`Remove ${theme.name}`}
                        >
                          <Icon sx={{ fontSize: 18 }}>delete</Icon>
                        </IconButton>
                      </span>
                    </Tooltip>
                  </DataTableBodyCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollableTableWrapper>
    </Card>
  );
};

export default ThemesTab;
