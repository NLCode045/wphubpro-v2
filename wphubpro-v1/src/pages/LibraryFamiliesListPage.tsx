/**
 * Full-page list of library item families with create (name only) and links to detail.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Icon from '@mui/material/Icon';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import ScrollableTableWrapper from 'components/ScrollableTableWrapper';
import DataTableHeadCell from 'examples/Tables/DataTable/DataTableHeadCell';
import DataTableBodyCell from 'examples/Tables/DataTable/DataTableBodyCell';
import Footer from 'examples/Footer';

import { ROUTE_PATHS } from '../config/routePaths';
import { usePageBreadcrumb } from '../contexts/PageBreadcrumbContext';
import {
  useCreateLibraryFamily,
  useDeleteLibraryFamily,
  useLibraryFamilies,
} from '../hooks/useLibraryFamiliesAndCollections';
import { LibraryFamily } from '../types';
import {
  PLUGIN_INFO_CARD_SHADOW,
  PLUGIN_INFO_GRADIENT,
  iconButtonOnBlueGradientSx,
  iconButtonOnLightSurfaceSx,
} from '../theme/detailPageStyles';
import {
  libraryContentPaperSx,
  libraryListNoTabsPaperSx,
  libraryListNoTabsSidebarSx,
  libraryListNoTabsTitleSx,
  libraryListPageNoTabsGridSx,
} from '../theme/libraryLayout';
import { contentPageShellFlexSx } from '../theme/contentPaper';

const outlinedOnGradientSx = {
  color: '#fff',
  '& fieldset': { borderColor: 'rgba(255,255,255,0.35) !important' },
  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.55) !important' },
  '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.85) !important' },
};

function libraryFamilyDetailHref(familyId: string) {
  return `${ROUTE_PATHS.LIBRARY_FAMILIES}/${encodeURIComponent(familyId)}`;
}

const LibraryFamiliesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbTitle } = usePageBreadcrumb();
  const { data: families = [], isLoading } = useLibraryFamilies();
  const createFamily = useCreateLibraryFamily();
  const deleteFamily = useDeleteLibraryFamily();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [listSearch, setListSearch] = useState('');

  useEffect(() => {
    setBreadcrumbTitle('Item families');
    return () => setBreadcrumbTitle(null);
  }, [setBreadcrumbTitle]);

  const filteredFamilies = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return families;
    return families.filter(
      (f) =>
        (f.name || '').toLowerCase().includes(q) ||
        f.memberSlugs.some((s) => s.toLowerCase().includes(q)),
    );
  }, [families, listSearch]);

  const handleCreate = () => {
    const n = name.trim();
    if (!n) return;
    createFamily.mutate(
      { name: n, memberSlugs: [] },
      {
        onSuccess: (doc) => {
          setDialogOpen(false);
          setName('');
          navigate(libraryFamilyDetailHref(doc.$id));
        },
      },
    );
  };

  const tableSection = isLoading ? (
    <SoftBox p={3}>
      <SoftTypography variant="caption" color="secondary">
        Loading…
      </SoftTypography>
    </SoftBox>
  ) : families.length === 0 ? (
    <SoftBox py={6} textAlign="center">
      <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }}>groups</Icon>
      <SoftTypography variant="h6">No families yet</SoftTypography>
      <SoftTypography variant="caption" color="secondary" display="block" mb={2}>
        Create a family to link plugins or themes that belong together.
      </SoftTypography>
      <Tooltip title="Create family">
        <IconButton color="info" onClick={() => setDialogOpen(true)} aria-label="Create family">
          <Icon sx={{ fontSize: 28 }}>add_circle</Icon>
        </IconButton>
      </Tooltip>
    </SoftBox>
  ) : filteredFamilies.length === 0 ? (
    <SoftBox py={4} textAlign="center">
      <SoftTypography variant="button" color="secondary">
        No families match your search.
      </SoftTypography>
    </SoftBox>
  ) : (
    <ScrollableTableWrapper flexFill sx={{ flex: 1, minHeight: 0 }}>
      <Table stickyHeader>
        <SoftBox component="thead">
          <TableRow>
            <DataTableHeadCell width="28%" pl={undefined} color="#4F5482">
              Name
            </DataTableHeadCell>
            <DataTableHeadCell width="62%" pl={undefined} color="#4F5482">
              Members
            </DataTableHeadCell>
            <DataTableHeadCell width="10%" align="right" pl={undefined} color="#4F5482">
              {' '}
            </DataTableHeadCell>
          </TableRow>
        </SoftBox>
        <TableBody>
          {filteredFamilies.map((f: LibraryFamily) => (
            <TableRow key={f.$id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(libraryFamilyDetailHref(f.$id))}>
              <DataTableBodyCell>
                <SoftTypography variant="button" fontWeight="medium">
                  {f.name || '—'}
                </SoftTypography>
              </DataTableBodyCell>
              <DataTableBodyCell>
                <SoftBox display="flex" flexWrap="wrap" gap={0.5} onClick={(e) => e.stopPropagation()}>
                  {f.memberSlugs.length === 0 ? (
                    <SoftTypography variant="caption" color="secondary">
                      No members yet
                    </SoftTypography>
                  ) : (
                    f.memberSlugs.map((s) => (
                      <Chip
                        key={s}
                        component={Link}
                        to={`${ROUTE_PATHS.LIBRARY}?plugin=${encodeURIComponent(s)}`}
                        size="small"
                        label={s}
                        variant="outlined"
                        onClick={(e) => e.stopPropagation()}
                        clickable
                      />
                    ))
                  )}
                </SoftBox>
              </DataTableBodyCell>
              <DataTableBodyCell align="right">
                <Tooltip title="Delete family">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this family?')) deleteFamily.mutate(f.$id);
                    }}
                    sx={iconButtonOnLightSurfaceSx}
                    aria-label="Delete family"
                  >
                    <Icon sx={{ fontSize: 18 }}>delete</Icon>
                  </IconButton>
                </Tooltip>
              </DataTableBodyCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollableTableWrapper>
  );

  return (
    <>
      <SoftBox sx={contentPageShellFlexSx}>
        <SoftBox sx={{ ...libraryListPageNoTabsGridSx, flex: 1, minHeight: 0 }}>
          <SoftBox sx={libraryListNoTabsTitleSx}>
            <SoftBox display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} flexWrap="wrap">
              <SoftBox lineHeight={1.3}>
                <SoftTypography variant="h5" fontWeight="bold" gutterBottom>
                  Item families
                </SoftTypography>
                <SoftTypography variant="button" color="secondary">
                  Group related plugins or themes. Add members on each family&apos;s detail page.
                </SoftTypography>
              </SoftBox>
              <Tooltip title="Create family">
                <IconButton color="info" onClick={() => setDialogOpen(true)} aria-label="Create family">
                  <Icon sx={{ fontSize: 26 }}>add_circle</Icon>
                </IconButton>
              </Tooltip>
            </SoftBox>
          </SoftBox>

          <SoftBox sx={{ ...libraryListNoTabsPaperSx, ...libraryContentPaperSx, flex: 1, overflow: 'hidden' }}>{tableSection}</SoftBox>

          <SoftBox sx={libraryListNoTabsSidebarSx}>
            <Card
              sx={{
                position: 'sticky',
                top: 8,
                zIndex: 1,
                background: PLUGIN_INFO_GRADIENT,
                color: 'white',
                boxShadow: PLUGIN_INFO_CARD_SHADOW,
                border: '1px solid rgba(255,255,255,0.2)',
                flexShrink: 0,
                width: '100%',
                '& .MuiTypography-root': { color: 'white !important' },
              }}
            >
              <SoftBox p={2}>
                <SoftTypography variant="button" fontWeight="bold" display="block" sx={{ mb: 1.5, letterSpacing: 0.5 }}>
                  Search &amp; navigation
                </SoftTypography>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search families…"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  sx={{ mb: 1.5 }}
                  InputProps={{ sx: outlinedOnGradientSx }}
                />
                <SoftBox display="flex" gap={0.5} flexWrap="wrap" justifyContent="flex-start">
                  <Tooltip title="Back to library">
                    <IconButton component={Link} to={ROUTE_PATHS.LIBRARY} sx={iconButtonOnBlueGradientSx} aria-label="Back to library">
                      <Icon sx={{ fontSize: 18, color: '#fff !important' }}>library_books</Icon>
                    </IconButton>
                  </Tooltip>
                </SoftBox>
              </SoftBox>
            </Card>
          </SoftBox>
        </SoftBox>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>New item family</DialogTitle>
          <DialogContent>
            <TextField
              label="Family name"
              fullWidth
              required
              margin="dense"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              helperText="You can add library items on the next screen."
            />
          </DialogContent>
          <DialogActions>
            <SoftButton onClick={() => setDialogOpen(false)}>Cancel</SoftButton>
            <SoftButton
              variant="gradient"
              color="info"
              onClick={handleCreate}
              disabled={createFamily.isPending || !name.trim()}
            >
              Create
            </SoftButton>
          </DialogActions>
        </Dialog>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default LibraryFamiliesListPage;
