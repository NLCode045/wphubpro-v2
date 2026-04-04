/**
 * Family detail — gradient info card + name edit + actions (matches library plugin / site detail sidebars).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import Card from '@mui/material/Card';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import { ROUTE_PATHS } from '../../config/routePaths';
import { ORANGE_ACTION_GRADIENT, iconButtonOnBlueGradientSx } from '../../theme/detailPageStyles';

const infoGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';
const orangeGradient = ORANGE_ACTION_GRADIENT;
const actionIconButtonSx = iconButtonOnBlueGradientSx;

interface LibraryFamilyDetailSidebarProps {
  displayName: string;
  nameDraft: string;
  onNameDraftChange: (value: string) => void;
  onSaveName: () => void;
  saveNameDisabled?: boolean;
  onDeleteFamily: () => void;
  deletePending?: boolean;
}

const LibraryFamilyDetailSidebar: React.FC<LibraryFamilyDetailSidebarProps> = ({
  displayName,
  nameDraft,
  onNameDraftChange,
  onSaveName,
  saveNameDisabled,
  onDeleteFamily,
  deletePending,
}) => {
  return (
    <SoftBox display="flex" flexDirection="column" gap={2} sx={{ alignSelf: 'flex-start', width: '100%' }}>
      <Card
        sx={{
          position: 'sticky',
          top: 8,
          zIndex: 1,
          background: infoGradient,
          color: 'white',
          boxShadow: '6px 6px 14px rgba(0,0,0,0.25), -3px -3px 8px rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.2)',
          '& .MuiTypography-root': { color: 'white !important' },
        }}
      >
        <SoftBox p={2} sx={{ color: 'white', '& .MuiTypography-root': { color: 'white !important' } }}>
          <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5} gap={1}>
            <SoftTypography variant="h6" fontWeight="bold" color="white" sx={{ flex: 1, minWidth: 0 }}>
              {displayName}
            </SoftTypography>
            <SoftBox display="flex" alignItems="center" gap={0.5} flexShrink={0}>
              <Tooltip title="Save name">
                <span>
                  <IconButton
                    size="small"
                    onClick={onSaveName}
                    disabled={saveNameDisabled}
                    sx={actionIconButtonSx}
                    aria-label="Save family name"
                  >
                    <Icon sx={{ fontSize: 18 }}>save</Icon>
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Delete family">
                <span>
                  <IconButton
                    size="small"
                    onClick={onDeleteFamily}
                    disabled={deletePending}
                    sx={{
                      ...actionIconButtonSx,
                      background: orangeGradient,
                      '&:hover': { background: orangeGradient, opacity: 0.92 },
                    }}
                    aria-label="Delete family"
                  >
                    <Icon sx={{ fontSize: 18 }}>delete</Icon>
                  </IconButton>
                </span>
              </Tooltip>
            </SoftBox>
          </SoftBox>

          <SoftBox mb={1.5}>
            <SoftTypography variant="caption" color="white" sx={{ opacity: 0.9, display: 'block', mb: 0.75 }}>
              Family name
            </SoftTypography>
            <TextField
              size="small"
              fullWidth
              value={nameDraft}
              onChange={(e) => onNameDraftChange(e.target.value)}
              placeholder="Name"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.55)' },
                },
                '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.6)', opacity: 1 },
              }}
            />
          </SoftBox>

          <SoftTypography variant="caption" color="white" sx={{ opacity: 0.85, display: 'block', mb: 1 }}>
            Edit the name above, then use the save icon. Add members below; source and version are set in the main column.
          </SoftTypography>

          <SoftButton
            component={Link}
            to={ROUTE_PATHS.LIBRARY_FAMILIES}
            size="small"
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
            }}
            variant="outlined"
          >
            All families
          </SoftButton>
        </SoftBox>
      </Card>
    </SoftBox>
  );
};

export default LibraryFamilyDetailSidebar;
