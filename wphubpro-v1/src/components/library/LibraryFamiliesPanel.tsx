/**
 * List and manage library item families (embedded on Library tab; full list at /library/families).
 */
import React, { useMemo, useState } from 'react';
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

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import ScrollableTableWrapper from 'components/ScrollableTableWrapper';
import DataTableHeadCell from 'examples/Tables/DataTable/DataTableHeadCell';
import DataTableBodyCell from 'examples/Tables/DataTable/DataTableBodyCell';

import { ROUTE_PATHS } from '../../config/routePaths';
import {
  useCreateLibraryFamily,
  useDeleteLibraryFamily,
  useLibraryFamilies,
} from '../../hooks/useLibraryFamiliesAndCollections';
import { LibraryFamily } from '../../types';
import { iconButtonOnLightSurfaceSx } from '../../theme/detailPageStyles';

function libraryFamilyDetailHref(familyId: string) {
  return `${ROUTE_PATHS.LIBRARY_FAMILIES}/${encodeURIComponent(familyId)}`;
}

interface LibraryFamiliesPanelProps {
  /** Client-side filter from Library page sidebar */
  searchQuery?: string;
}

const LibraryFamiliesPanel: React.FC<LibraryFamiliesPanelProps> = ({ searchQuery = '' }) => {
  const navigate = useNavigate();
  const { data: families = [], isLoading } = useLibraryFamilies();
  const createFamily = useCreateLibraryFamily();
  const deleteFamily = useDeleteLibraryFamily();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');

  const filteredFamilies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return families;
    return families.filter(
      (f) =>
        (f.name || '').toLowerCase().includes(q) ||
        f.memberSlugs.some((s) => s.toLowerCase().includes(q)),
    );
  }, [families, searchQuery]);

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

  return (
    <SoftBox pb={2} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <SoftBox display="flex" justifyContent="flex-end" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <SoftBox display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
          <Tooltip title="Full list of families">
            <IconButton component={Link} to={ROUTE_PATHS.LIBRARY_FAMILIES} size="small" aria-label="Full list of families">
              <Icon sx={{ fontSize: 20 }}>view_list</Icon>
            </IconButton>
          </Tooltip>
          <Tooltip title="Create family">
            <IconButton
              color="info"
              size="small"
              onClick={() => setDialogOpen(true)}
              aria-label="Create family"
            >
              <Icon sx={{ fontSize: 22 }}>add_circle</Icon>
            </IconButton>
          </Tooltip>
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

      {isLoading ? (
        <SoftTypography variant="caption" color="secondary">
          Loading…
        </SoftTypography>
      ) : families.length === 0 ? (
        <SoftBox py={6} textAlign="center">
          <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }}>groups</Icon>
          <SoftTypography variant="h6">No families yet</SoftTypography>
          <SoftTypography variant="caption" color="secondary" display="block" mb={2}>
            Create a family to link plugins or themes that belong together.
          </SoftTypography>
          <SoftButton variant="gradient" color="info" size="small" onClick={() => setDialogOpen(true)}>
            Create family
          </SoftButton>
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
                <TableRow
                  key={f.$id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(libraryFamilyDetailHref(f.$id))}
                >
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
      )}
    </SoftBox>
  );
};

export default LibraryFamiliesPanel;
