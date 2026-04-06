/**
 * Tags editor for library plugin detail — sits below the membership card in the sidebar column.
 */
import React, { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import { ORANGE_ACTION_GRADIENT, iconButtonOnBlueGradientSx } from '../../theme/detailPageStyles';

const infoGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';
const orangeGradient = ORANGE_ACTION_GRADIENT;
const actionIconButtonSx = iconButtonOnBlueGradientSx;

export interface LibraryPluginTagsCardProps {
  tags: string[];
  onSaveTags: (tags: string[]) => void | Promise<void>;
  savingTags?: boolean;
}

const LibraryPluginTagsCard: React.FC<LibraryPluginTagsCardProps> = ({
  tags,
  onSaveTags,
  savingTags = false,
}) => {
  const [tagsEditing, setTagsEditing] = useState(false);
  const [tagDraft, setTagDraft] = useState<string[]>(tags);
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    if (!tagsEditing) {
      setTagDraft(tags);
    }
  }, [tags, tagsEditing]);

  const addDraftTag = () => {
    const t = newTagInput.trim();
    if (!t) return;
    if (tagDraft.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setNewTagInput('');
      return;
    }
    setTagDraft((prev) => [...prev, t].sort((a, b) => a.localeCompare(b)));
    setNewTagInput('');
  };

  const cancelTagEdit = () => {
    setTagDraft(tags);
    setNewTagInput('');
    setTagsEditing(false);
  };

  const saveTagEdit = async () => {
    const normalized = [...new Set(tagDraft.map((t) => t.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
    await onSaveTags(normalized);
    setTagsEditing(false);
    setNewTagInput('');
  };

  return (
    <Card
      sx={{
        p: 2,
        background: infoGradient,
        color: 'white',
        boxShadow: '6px 6px 14px rgba(0,0,0,0.25), -3px -3px 8px rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.2)',
        '& .MuiTypography-root': { color: 'white !important' },
      }}
    >
      <SoftBox sx={{ color: 'white', '& .MuiTypography-root': { color: 'white !important' } }}>
        <SoftBox display="flex" alignItems="center" justifyContent="space-between" gap={1} mb={0.75}>
          <SoftTypography variant="button" fontWeight="bold" color="white">
            Tags
          </SoftTypography>
          {!tagsEditing ? (
            <Tooltip title="Edit tags">
              <IconButton
                size="small"
                onClick={() => setTagsEditing(true)}
                sx={actionIconButtonSx}
                aria-label="Edit tags"
              >
                <Icon sx={{ fontSize: 18 }}>edit</Icon>
              </IconButton>
            </Tooltip>
          ) : null}
        </SoftBox>
        {!tagsEditing ? (
          <SoftBox display="flex" flexWrap="wrap" gap={0.5}>
            {tagDraft.length === 0 ? (
              <SoftTypography variant="caption" sx={{ opacity: 0.75, color: 'white !important' }}>
                No tags
              </SoftTypography>
            ) : (
              tagDraft.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.22)',
                    color: '#fff',
                    '& .MuiChip-label': { color: '#fff' },
                  }}
                />
              ))
            )}
          </SoftBox>
        ) : (
          <SoftBox>
            <SoftBox display="flex" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
              {tagDraft.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  size="small"
                  onDelete={() => setTagDraft((prev) => prev.filter((x) => x !== t))}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.22)',
                    color: '#fff',
                    '& .MuiChip-label': { color: '#fff' },
                    '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.85) !important' },
                  }}
                />
              ))}
            </SoftBox>
            <SoftBox display="flex" flexWrap="wrap" gap={0.75} alignItems="center">
              <TextField
                size="small"
                placeholder="Add tag"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addDraftTag();
                  }
                }}
                sx={{
                  minWidth: 120,
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                  },
                  '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.6)', opacity: 1 },
                }}
              />
              <SoftButton variant="outlined" size="small" onClick={addDraftTag} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}>
                Add
              </SoftButton>
              <SoftButton variant="contained" size="small" onClick={() => void saveTagEdit()} disabled={savingTags} sx={{ bgcolor: orangeGradient, color: '#fff' }}>
                Save
              </SoftButton>
              <SoftButton variant="text" size="small" onClick={cancelTagEdit} disabled={savingTags} sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Cancel
              </SoftButton>
            </SoftBox>
          </SoftBox>
        )}
      </SoftBox>
    </Card>
  );
};

export default LibraryPluginTagsCard;
