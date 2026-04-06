/**
 * Library collections: named bundles of items for batch install.
 */
import React, { useEffect, useMemo, useState } from 'react';
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
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import ScrollableTableWrapper from 'components/ScrollableTableWrapper';
import DataTableHeadCell from 'examples/Tables/DataTable/DataTableHeadCell';
import DataTableBodyCell from 'examples/Tables/DataTable/DataTableBodyCell';

import { getLibraryItemSlug } from '../../domains/library';
import { useLibraryItems } from '../../hooks/useLibrary';
import {
  useCreateLibraryCollection,
  useDeleteLibraryCollection,
  useLibraryCollections,
  useUpdateLibraryCollection,
} from '../../hooks/useLibraryFamiliesAndCollections';
import {
  LibraryCollection,
  LibraryCollectionMember,
  LibraryCollectionVersionMode,
  LibraryItemType,
} from '../../types';
import InstallCollectionOnSitesModal from './InstallCollectionOnSitesModal';

type SlugOption = { slug: string; type: LibraryItemType; label: string };

interface LibraryCollectionsPanelProps {
  searchQuery?: string;
}

const LibraryCollectionsPanel: React.FC<LibraryCollectionsPanelProps> = ({ searchQuery = '' }) => {
  const { data: libraryItems = [] } = useLibraryItems();
  const { data: collections = [], isLoading } = useLibraryCollections();
  const createCollection = useCreateLibraryCollection();
  const updateCollection = useUpdateLibraryCollection();
  const deleteCollection = useDeleteLibraryCollection();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editCollection, setEditCollection] = useState<LibraryCollection | null>(null);
  const [installCollection, setInstallCollection] = useState<LibraryCollection | null>(null);
  const [addSelectKey, setAddSelectKey] = useState('__choose__');

  useEffect(() => {
    if (editCollection) setAddSelectKey('__choose__');
  }, [editCollection]);

  const filteredCollections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter((c) => c.name.toLowerCase().includes(q));
  }, [collections, searchQuery]);

  const slugOptions: SlugOption[] = useMemo(() => {
    const map = new Map<string, SlugOption>();
    for (const i of libraryItems) {
      const slug = getLibraryItemSlug(i);
      const key = `${slug}::${i.type}`;
      if (!map.has(key)) {
        map.set(key, { slug, type: i.type, label: `${i.name} (${i.type})` });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [libraryItems]);

  const handleCreate = () => {
    const n = newName.trim();
    if (!n) return;
    createCollection.mutate(
      { name: n, items: [] },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setNewName('');
        },
      },
    );
  };

  const addMemberToEdit = (opt: SlugOption) => {
    if (!editCollection) return;
    const key = `${opt.slug}::${opt.type}`;
    if (editCollection.items.some((m) => memberKey(m) === key)) return;
    const next: LibraryCollectionMember[] = [
      ...editCollection.items,
      {
        slug: opt.slug,
        type: opt.type,
        versionMode: 'default' as LibraryCollectionVersionMode,
      },
    ];
    updateCollection.mutate(
      { collectionId: editCollection.$id, items: next },
      { onSuccess: (data) => setEditCollection(data) },
    );
  };

  const removeMember = (m: LibraryCollectionMember) => {
    if (!editCollection) return;
    const k = memberKey(m);
    const next = editCollection.items.filter((x) => memberKey(x) !== k);
    updateCollection.mutate(
      { collectionId: editCollection.$id, items: next },
      { onSuccess: (data) => setEditCollection(data) },
    );
  };

  const setMemberVersionMode = (m: LibraryCollectionMember, mode: LibraryCollectionVersionMode, manualKey?: string) => {
    if (!editCollection) return;
    const k = memberKey(m);
    const next = editCollection.items.map((x) => {
      if (memberKey(x) !== k) return x;
      return {
        ...x,
        versionMode: mode,
        ...(mode === 'manual' && manualKey ? { manualVersionKey: manualKey } : { manualVersionKey: undefined }),
      };
    });
    updateCollection.mutate(
      { collectionId: editCollection.$id, items: next },
      { onSuccess: (data) => setEditCollection(data) },
    );
  };

  return (
    <SoftBox pb={2} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <SoftBox display="flex" justifyContent="flex-end" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <Tooltip title="New collection">
          <IconButton color="info" onClick={() => setCreateOpen(true)} aria-label="New collection">
            <Icon sx={{ fontSize: 22 }}>add_circle</Icon>
          </IconButton>
        </Tooltip>
      </SoftBox>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New collection</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Name"
            fullWidth
            margin="dense"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <SoftButton onClick={() => setCreateOpen(false)}>Cancel</SoftButton>
          <SoftButton variant="gradient" color="info" onClick={handleCreate} disabled={createCollection.isPending}>
            Create
          </SoftButton>
        </DialogActions>
      </Dialog>

      <InstallCollectionOnSitesModal
        open={!!installCollection}
        onClose={() => setInstallCollection(null)}
        collection={installCollection}
      />

      <Dialog open={!!editCollection} onClose={() => setEditCollection(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit: {editCollection?.name}</DialogTitle>
        <DialogContent>
          <SoftTypography variant="caption" color="secondary" display="block" sx={{ mb: 1 }}>
            Add items from your library. Set default (library) or manual version per row.
          </SoftTypography>
          <SoftTypography variant="caption" color="secondary" id="add-member-label" display="block" sx={{ mb: 0.5 }}>
            Add library item
          </SoftTypography>
          <Select
            size="small"
            fullWidth
            value={addSelectKey}
            onChange={(e) => {
              const v = e.target.value as string;
              if (v === '__choose__') return;
              const opt = slugOptions.find((o) => `${o.slug}::${o.type}` === v);
              if (opt) {
                addMemberToEdit(opt);
                setAddSelectKey('__choose__');
              }
            }}
            inputProps={{ 'aria-labelledby': 'add-member-label' }}
            sx={{ mb: 2 }}
            renderValue={(v) => {
              if (v === '__choose__') return <em>Choose…</em>;
              const opt = slugOptions.find((o) => `${o.slug}::${o.type}` === v);
              return opt ? `${opt.label} — ${opt.slug}` : String(v);
            }}
          >
            <MenuItem value="__choose__">
              <em>Choose…</em>
            </MenuItem>
            {slugOptions.map((o) => (
              <MenuItem key={`${o.slug}::${o.type}`} value={`${o.slug}::${o.type}`}>
                {o.label} — {o.slug}
              </MenuItem>
            ))}
          </Select>
          {(editCollection?.items ?? []).map((m) => (
            <SoftBox
              key={memberKey(m)}
              display="flex"
              flexWrap="wrap"
              alignItems="center"
              gap={2}
              sx={{ mb: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <SoftTypography variant="caption" sx={{ minWidth: 140 }}>
                {m.slug} ({m.type})
              </SoftTypography>
              <Select
                size="small"
                sx={{ minWidth: 140 }}
                value={m.versionMode}
                onChange={(e) =>
                  setMemberVersionMode(m, e.target.value as LibraryCollectionVersionMode)
                }
                inputProps={{ 'aria-label': `Version mode for ${m.slug}` }}
              >
                <MenuItem value="default">Default (library)</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
              </Select>
              <Tooltip title="Remove">
                <IconButton size="small" onClick={() => removeMember(m)}>
                  <Icon fontSize="small">close</Icon>
                </IconButton>
              </Tooltip>
            </SoftBox>
          ))}
        </DialogContent>
        <DialogActions>
          <SoftButton onClick={() => setEditCollection(null)}>Close</SoftButton>
        </DialogActions>
      </Dialog>

      {isLoading ? (
        <SoftTypography variant="caption" color="secondary">
          Loading…
        </SoftTypography>
      ) : collections.length === 0 ? (
        <SoftBox py={6} textAlign="center">
          <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }}>folder</Icon>
          <SoftTypography variant="h6">No collections yet</SoftTypography>
          <SoftTypography variant="caption" color="secondary">
            Create a collection and add library items to install them together on a site.
          </SoftTypography>
        </SoftBox>
      ) : filteredCollections.length === 0 ? (
        <SoftBox py={4} textAlign="center">
          <SoftTypography variant="button" color="secondary">
            No collections match your search.
          </SoftTypography>
        </SoftBox>
      ) : (
        <ScrollableTableWrapper flexFill sx={{ flex: 1, minHeight: 0 }}>
          <Table stickyHeader>
            <SoftBox component="thead">
              <TableRow>
                <DataTableHeadCell width="40%" pl={undefined} color="#4F5482">
                  Name
                </DataTableHeadCell>
                <DataTableHeadCell width="20%" pl={undefined} color="#4F5482">
                  Items
                </DataTableHeadCell>
                <DataTableHeadCell width="40%" align="right" pl={undefined} color="#4F5482">
                  Actions
                </DataTableHeadCell>
              </TableRow>
            </SoftBox>
            <TableBody>
              {filteredCollections.map((c: LibraryCollection) => (
                <TableRow
                  key={c.$id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setEditCollection(c)}
                >
                  <DataTableBodyCell>
                    <SoftTypography variant="button" fontWeight="medium">
                      {c.name}
                    </SoftTypography>
                  </DataTableBodyCell>
                  <DataTableBodyCell>
                    <SoftTypography variant="caption" color="secondary">
                      {c.items.length}
                    </SoftTypography>
                  </DataTableBodyCell>
                  <DataTableBodyCell align="right">
                    <SoftBox display="inline-flex" gap={0.5} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Install on sites">
                        <span>
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => setInstallCollection(c)}
                            disabled={c.items.length === 0}
                            aria-label={`Install collection ${c.name}`}
                          >
                            <Icon sx={{ fontSize: 18 }}>download</Icon>
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Edit collection">
                        <IconButton size="small" onClick={() => setEditCollection(c)} aria-label={`Edit ${c.name}`}>
                          <Icon sx={{ fontSize: 18 }}>edit</Icon>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete collection">
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (window.confirm('Delete this collection?')) deleteCollection.mutate(c.$id);
                          }}
                          aria-label={`Delete ${c.name}`}
                        >
                          <Icon sx={{ fontSize: 18 }}>delete</Icon>
                        </IconButton>
                      </Tooltip>
                    </SoftBox>
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

function memberKey(m: LibraryCollectionMember): string {
  return `${m.slug}::${m.type}`;
}

export default LibraryCollectionsPanel;
