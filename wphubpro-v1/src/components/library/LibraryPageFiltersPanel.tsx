/**
 * Right column on Library page: filters + bulk actions (blue gradient card).
 */
import React, { useMemo, useState, useRef, useEffect } from 'react';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Icon from '@mui/material/Icon';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ClickAwayListener from '@mui/material/ClickAwayListener';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';

import { LibraryItemSource } from '../../types';
import { PLUGIN_INFO_CARD_SHADOW, PLUGIN_INFO_GRADIENT, iconButtonOnBlueGradientSx } from '../../theme/detailPageStyles';

const LIBRARY_ORANGE = '#ea580c';

const outlinedOnGradientSx = {
  color: '#fff',
  '& fieldset': { borderColor: 'rgba(255,255,255,0.35) !important' },
  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.55) !important' },
  '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.85) !important' },
};

const checkboxOnGradientSx = {
  color: 'rgba(255,255,255,0.55)',
  padding: '4px',
  '&.Mui-checked': { color: '#fff' },
};

const filterGroupLabelSx = {
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: LIBRARY_ORANGE,
  display: 'block',
  mb: 0.75,
};

const formLabelSx = {
  '& .MuiFormControlLabel-label': {
    fontSize: '0.8125rem',
    color: 'rgba(255,255,255,0.95)',
  },
};

interface LibraryPageFiltersPanelProps {
  mainTab: number;
  tagInput: string;
  onTagInputChange: (v: string) => void;
  tagFilter: string;
  onTagFilterChange: (v: string) => void;
  allPluginTags: string[];
  includePlugins: boolean;
  includeThemes: boolean;
  onIncludePluginsChange: (v: boolean) => void;
  onIncludeThemesChange: (v: boolean) => void;
  selectedSources: LibraryItemSource[];
  onToggleSource: (s: LibraryItemSource) => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  onInstallSelected: () => void;
  onUpdateSelected: () => void;
  onMergeSelected: () => void;
  disableDelete?: boolean;
  disableInstall?: boolean;
  disableUpdate?: boolean;
  disableMerge?: boolean;
  deletePending?: boolean;
}

const SOURCE_OPTIONS: { value: LibraryItemSource; label: string }[] = [
  { value: LibraryItemSource.Official, label: 'WordPress.org' },
  { value: LibraryItemSource.Local, label: 'Local upload' },
  { value: LibraryItemSource.Remote, label: 'Remote' },
];

function TagFilterInput({
  tagInput,
  onTagInputChange,
  tagFilter,
  onTagFilterChange,
  allPluginTags,
}: {
  tagInput: string;
  onTagInputChange: (v: string) => void;
  tagFilter: string;
  onTagFilterChange: (v: string) => void;
  allPluginTags: string[];
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    if (!q) return allPluginTags.slice(0, 24);
    return allPluginTags.filter((t) => t.toLowerCase().includes(q)).slice(0, 24);
  }, [tagInput, allPluginTags]);

  const applyTag = (tag: string) => {
    onTagFilterChange(tag);
    onTagInputChange('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const exact = allPluginTags.find((t) => t.toLowerCase() === tagInput.trim().toLowerCase());
      if (exact) applyTag(exact);
      else if (suggestions.length === 1) applyTag(suggestions[0]);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  useEffect(() => {
    if (tagInput.trim() && suggestions.length > 0) setOpen(true);
    else if (!tagInput.trim()) setOpen(false);
  }, [tagInput, suggestions.length]);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <SoftBox sx={{ position: 'relative', mb: 1.5 }}>
        <SoftTypography sx={filterGroupLabelSx}>Tag</SoftTypography>
        <TextField
          inputRef={inputRef}
          variant="outlined"
          hiddenLabel
          size="small"
          fullWidth
          placeholder="Type to filter by tag…"
          value={tagInput}
          onChange={(e) => {
            onTagInputChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => tagInput.trim() && suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          InputProps={{ sx: outlinedOnGradientSx }}
        />
        {tagFilter ? (
          <SoftTypography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.85 }}>
            Filtering: <strong>{tagFilter}</strong>{' '}
            <IconButton
              size="small"
              sx={{ p: 0, ml: 0.5, color: 'inherit' }}
              aria-label="Clear tag"
              onClick={() => {
                onTagFilterChange('');
                onTagInputChange('');
              }}
            >
              <Icon sx={{ fontSize: 16 }}>close</Icon>
            </IconButton>
          </SoftTypography>
        ) : null}
        {open && suggestions.length > 0 && (
          <Paper
            elevation={4}
            sx={{
              position: 'absolute',
              zIndex: 20,
              left: 0,
              right: 0,
              top: '100%',
              mt: 0.5,
              maxHeight: 200,
              overflow: 'auto',
              borderRadius: 1,
              border: '1px solid rgba(234, 88, 12, 0.35)',
            }}
          >
            <List dense disablePadding>
              {suggestions.map((t) => (
                <ListItemButton
                  key={t}
                  onClick={() => applyTag(t)}
                  sx={{ py: 0.5, '&:hover': { bgcolor: 'rgba(234, 88, 12, 0.08)' } }}
                >
                  <ListItemText primary={t} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}
      </SoftBox>
    </ClickAwayListener>
  );
}

const LibraryPageFiltersPanel: React.FC<LibraryPageFiltersPanelProps> = ({
  mainTab,
  tagInput,
  onTagInputChange,
  tagFilter,
  onTagFilterChange,
  allPluginTags,
  includePlugins,
  includeThemes,
  onIncludePluginsChange,
  onIncludeThemesChange,
  selectedSources,
  onToggleSource,
  selectedCount,
  onDeleteSelected,
  onInstallSelected,
  onUpdateSelected,
  onMergeSelected,
  disableDelete = false,
  disableInstall = false,
  disableUpdate = false,
  disableMerge = false,
  deletePending = false,
}) => {
  const showItemFilters = mainTab === 0;

  const sourceChecked = (s: LibraryItemSource) => selectedSources.includes(s);

  return (
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
        maxWidth: '100%',
        alignSelf: 'flex-start',
        maxHeight: 'min(100vh - 16px, calc(100dvh - 16px))',
        overflow: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
        '& .MuiTypography-root': { color: 'white !important' },
      }}
    >
      <SoftBox p={{ xs: 2.25, sm: 2.75 }} sx={{ color: 'white' }}>
        <SoftTypography
          variant="button"
          fontWeight="bold"
          display="block"
          sx={{ mb: 1.5, letterSpacing: 0.5, color: `${LIBRARY_ORANGE} !important` }}
        >
          Filters
        </SoftTypography>

        {showItemFilters ? (
          <>
            <SoftTypography sx={filterGroupLabelSx}>Type</SoftTypography>
            <FormGroup
              row
              sx={{
                flexWrap: 'wrap',
                gap: 2,
                columnGap: 2.5,
                mb: 2,
                '& .MuiFormControlLabel-root': { mr: 0 },
              }}
            >
              <FormControlLabel
                sx={formLabelSx}
                control={
                  <Checkbox
                    size="small"
                    checked={includePlugins}
                    onChange={(_, c) => onIncludePluginsChange(c)}
                    sx={checkboxOnGradientSx}
                  />
                }
                label="Plugins"
              />
              <FormControlLabel
                sx={formLabelSx}
                control={
                  <Checkbox
                    size="small"
                    checked={includeThemes}
                    onChange={(_, c) => onIncludeThemesChange(c)}
                    sx={checkboxOnGradientSx}
                  />
                }
                label="Themes"
              />
            </FormGroup>

            <TagFilterInput
              tagInput={tagInput}
              onTagInputChange={onTagInputChange}
              tagFilter={tagFilter}
              onTagFilterChange={onTagFilterChange}
              allPluginTags={allPluginTags}
            />

            <SoftTypography sx={filterGroupLabelSx}>Source</SoftTypography>
            <FormGroup
              row
              sx={{
                flexWrap: 'wrap',
                gap: 1.5,
                columnGap: 2,
                mb: 2,
                '& .MuiFormControlLabel-root': { mr: 0 },
              }}
            >
              {SOURCE_OPTIONS.map((o) => (
                <FormControlLabel
                  key={o.value}
                  sx={formLabelSx}
                  control={
                    <Checkbox
                      size="small"
                      checked={sourceChecked(o.value)}
                      onChange={() => onToggleSource(o.value)}
                      sx={checkboxOnGradientSx}
                    />
                  }
                  label={o.label}
                />
              ))}
            </FormGroup>
          </>
        ) : null}

        <SoftBox
          mt={2}
          pt={2}
          borderTop="1px solid rgba(255,255,255,0.25)"
          display="flex"
          flexWrap="wrap"
          gap={1}
          justifyContent="center"
        >
          <SoftTypography variant="caption" display="block" width="100%" textAlign="center" sx={{ opacity: 0.9, mb: 0.5 }}>
            {selectedCount > 0 ? `${selectedCount} selected` : 'Select rows in the table'}
          </SoftTypography>
          {showItemFilters ? (
            <>
              <Tooltip title="Remove selected from library">
                <span>
                  <IconButton
                    size="small"
                    onClick={onDeleteSelected}
                    disabled={selectedCount === 0 || disableDelete || deletePending}
                    sx={iconButtonOnBlueGradientSx}
                    aria-label="Delete selected"
                  >
                    <Icon sx={{ fontSize: 18, color: '#fff !important' }}>delete</Icon>
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Install selected on sites">
                <span>
                  <IconButton
                    size="small"
                    onClick={onInstallSelected}
                    disabled={selectedCount === 0 || disableInstall}
                    sx={iconButtonOnBlueGradientSx}
                    aria-label="Install selected"
                  >
                    <Icon sx={{ fontSize: 18, color: '#fff !important' }}>download</Icon>
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Update library default version (plugins)">
                <span>
                  <IconButton
                    size="small"
                    onClick={onUpdateSelected}
                    disabled={selectedCount === 0 || disableUpdate}
                    sx={iconButtonOnBlueGradientSx}
                    aria-label="Update selected defaults"
                  >
                    <Icon sx={{ fontSize: 18, color: '#fff !important' }}>published_with_changes</Icon>
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Merge selected plugins into one library plugin">
                <span>
                  <IconButton
                    size="small"
                    onClick={onMergeSelected}
                    disabled={selectedCount < 2 || disableMerge}
                    sx={iconButtonOnBlueGradientSx}
                    aria-label="Merge selected plugins"
                  >
                    <Icon sx={{ fontSize: 18, color: '#fff !important' }}>merge_type</Icon>
                  </IconButton>
                </span>
              </Tooltip>
            </>
          ) : (
            <SoftTypography variant="caption" sx={{ opacity: 0.85, textAlign: 'center' }}>
              Bulk actions apply to the Library items tab.
            </SoftTypography>
          )}
        </SoftBox>
      </SoftBox>
    </Card>
  );
};

export default LibraryPageFiltersPanel;
