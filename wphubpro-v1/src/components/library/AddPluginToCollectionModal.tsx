/**
 * Pick a collection and add the current library plugin (by slug) as a member.
 */
import React, { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import SoftTypography from 'components/SoftTypography';
import SoftBox from 'components/SoftBox';
import SoftButton from 'components/SoftButton';

import { buildCollectionMemberFromLibraryItem } from '../../hooks/useLibraryFamiliesAndCollections';
import { useLibraryCollections, useUpdateLibraryCollection } from '../../hooks/useLibraryFamiliesAndCollections';
import { LibraryCollection, LibraryItemType } from '../../types';

interface AddPluginToCollectionModalProps {
  open: boolean;
  onClose: () => void;
  pluginSlug: string;
  displayName: string;
}

function collectionHasPlugin(c: LibraryCollection, slug: string): boolean {
  const s = slug.trim().toLowerCase();
  return c.items.some(
    (m) => m.slug.toLowerCase() === s && m.type === LibraryItemType.Plugin,
  );
}

const AddPluginToCollectionModal: React.FC<AddPluginToCollectionModalProps> = ({
  open,
  onClose,
  pluginSlug,
  displayName,
}) => {
  const { data: collections = [] } = useLibraryCollections();
  const updateCollection = useUpdateLibraryCollection();
  const [collectionId, setCollectionId] = useState('');

  useEffect(() => {
    if (!open) setCollectionId('');
  }, [open]);

  const eligible = useMemo(
    () => collections.filter((c) => !collectionHasPlugin(c, pluginSlug)),
    [collections, pluginSlug],
  );

  const collectionIdValid = !collectionId || eligible.some((c) => c.$id === collectionId);
  const selectCollectionValue = collectionId && collectionIdValid ? collectionId : '__choose__';

  useEffect(() => {
    if (collectionId && !collectionIdValid) {
      setCollectionId('');
    }
  }, [collectionId, collectionIdValid]);

  const handleAdd = () => {
    if (!collectionId) return;
    const target = collections.find((c) => c.$id === collectionId);
    if (!target) return;
    const member = buildCollectionMemberFromLibraryItem(pluginSlug, LibraryItemType.Plugin);
    const next = [...target.items, member];
    updateCollection.mutate(
      { collectionId: target.$id, items: next },
      { onSuccess: () => { onClose(); setCollectionId(''); } },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add to collection</DialogTitle>
      <DialogContent>
        <SoftTypography variant="caption" color="secondary" display="block" sx={{ mb: 2 }}>
          Add “{displayName}” ({pluginSlug}) to a collection.
        </SoftTypography>
        {eligible.length === 0 ? (
          <SoftTypography variant="caption" color="secondary">
            No collections available, or this plugin is already in every collection. Create a collection first from
            Library → Collections.
          </SoftTypography>
        ) : (
          <SoftBox>
            <SoftTypography variant="caption" color="secondary" id="add-to-coll-label" display="block" sx={{ mb: 0.5 }}>
              Collection
            </SoftTypography>
            <Select
              fullWidth
              size="small"
              value={selectCollectionValue}
              onChange={(e) => setCollectionId((e.target.value as string) === '__choose__' ? '' : (e.target.value as string))}
              inputProps={{ 'aria-labelledby': 'add-to-coll-label' }}
              renderValue={(v) => {
                if (v === '__choose__' || !v) return <em>Choose a collection…</em>;
                return eligible.find((c) => c.$id === v)?.name ?? v;
              }}
            >
              <MenuItem value="__choose__">
                <em>Choose a collection…</em>
              </MenuItem>
              {eligible.map((c) => (
                <MenuItem key={c.$id} value={c.$id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </SoftBox>
        )}
      </DialogContent>
      <DialogActions>
        <SoftButton onClick={onClose}>Cancel</SoftButton>
        <SoftButton
          variant="gradient"
          color="info"
          onClick={handleAdd}
          disabled={!collectionId || eligible.length === 0 || updateCollection.isPending}
        >
          Add
        </SoftButton>
      </DialogActions>
    </Dialog>
  );
};

export default AddPluginToCollectionModal;
