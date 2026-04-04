/**
 * Plan Detail Sidebar - Plan info box with improved styling
 * Orange action buttons, no bg on edit icons, smaller fonts, orange labels
 */
import React, { useState } from 'react';
import Card from '@mui/material/Card';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import { ORANGE_ACTION_GRADIENT, iconButtonOnBlueGradientSx } from '../../theme/detailPageStyles';

const infoGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';
const orangeGradient = ORANGE_ACTION_GRADIENT;

const inlineOrangeIconBtn = {
  ...iconButtonOnBlueGradientSx,
  width: 24,
  height: 24,
  minWidth: 24,
  minHeight: 24,
} as const;

const labelSx = { fontSize: '0.8rem', color: '#fb923c !important', fontWeight: 600, textTransform: 'uppercase' as const };

function InlineEditable({
  value,
  onSave,
  placeholder,
  multiline,
  type = 'text',
  displayValue,
  underline,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
  /** When set, shown when not editing instead of value */
  displayValue?: string;
  underline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  React.useEffect(() => setDraft(value), [value]);

  const handleSave = () => {
    onSave(draft.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <SoftBox display="flex" alignItems="flex-start" gap={0.5} sx={{ width: '100%' }}>
        <TextField
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !multiline) handleSave();
            if (e.key === 'Escape') { setDraft(value); setEditing(false); }
          }}
          multiline={multiline}
          type={type}
          size="small"
          autoFocus
          sx={{ flex: 1, '& .MuiInput-root': { color: 'white' }, '& .MuiInput-input': { color: 'white', fontSize: '0.8rem' } }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleSave} sx={inlineOrangeIconBtn}>
                  <Icon sx={{ fontSize: 14 }}>check</Icon>
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </SoftBox>
    );
  }

  const showValue = displayValue ?? value;
  return (
    <SoftBox display="flex" alignItems="center" gap={0.5}>
      <SoftTypography variant="body2" color="white" sx={{ fontSize: '0.8rem', fontWeight: 700, textDecoration: underline ? 'underline' : undefined }}>
        {showValue || placeholder || '—'}
      </SoftTypography>
      <IconButton size="small" onClick={() => setEditing(true)} sx={inlineOrangeIconBtn}>
        <Icon sx={{ fontSize: 12 }}>edit</Icon>
      </IconButton>
    </SoftBox>
  );
}

interface PlanDetailSidebarProps {
  plan: {
    id: string;
    name: string;
    description: string;
    status: string;
    monthlyPrice: number;
    yearlyPrice: number;
    currency: string;
    metadata?: Array<{ key: string; value: string }>;
    stripeLink?: string;
  };
  onUpdate: (field: string, value: string | number | boolean) => void;
  onUpdatePrice?: (interval: 'month' | 'year', amount: number) => void;
  onToggleActive: () => void;
  isUpdating?: boolean;
}

const formatPrice = (amount: number, currency: string) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: currency.toUpperCase() }).format(amount);

function getMetaMap(meta?: Array<{ key: string; value: string }>): Record<string, string> {
  return meta ? Object.fromEntries((meta || []).map((m) => [m.key, m.value])) : {};
}

const PlanDetailSidebar: React.FC<PlanDetailSidebarProps> = ({
  plan,
  onUpdate,
  onUpdatePrice,
  onToggleActive,
  isUpdating,
}) => {
  const meta = getMetaMap(plan.metadata);

  return (
    <SoftBox display="flex" flexDirection="column" gap={2} sx={{ alignSelf: 'flex-start' }}>
      <Card sx={{
        position: 'sticky',
        top: 8,
        zIndex: 1,
        background: infoGradient,
        color: 'white',
        boxShadow: '6px 6px 14px rgba(0,0,0,0.25), -3px -3px 8px rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}>
        <SoftBox p={2} pl={3} sx={{ color: 'white' }}>
          {/* Status left, action buttons right - same row */}
          <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Chip
              label={plan.status}
              size="small"
              sx={{
                textTransform: 'capitalize',
                fontSize: '0.7rem',
                height: 20,
                background: orangeGradient,
                color: 'white !important',
                border: 'none',
              }}
            />
            <SoftBox display="flex" alignItems="center" gap={0.5}>
              <Tooltip title={plan.status === 'active' ? 'Deactivate (archive)' : 'Activate'} placement="top">
                <IconButton size="small" onClick={onToggleActive} disabled={isUpdating} sx={iconButtonOnBlueGradientSx}>
                  <Icon sx={{ fontSize: 16 }}>{plan.status === 'active' ? 'archive' : 'check_circle'}</Icon>
                </IconButton>
              </Tooltip>
              {plan.stripeLink && (
                <Tooltip title="Open in Stripe" placement="top">
                  <IconButton
                    size="small"
                    component="a"
                    href={plan.stripeLink}
                    target="_blank"
                    rel="noreferrer"
                    sx={iconButtonOnBlueGradientSx}
                  >
                    <Icon sx={{ fontSize: 16 }}>open_in_new</Icon>
                  </IconButton>
                </Tooltip>
              )}
            </SoftBox>
          </SoftBox>

          {/* Stripe ID below status badge */}
          <SoftBox display="flex" justifyContent="flex-start" mb={2}>
            <SoftTypography sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>{plan.id}</SoftTypography>
          </SoftBox>

          <SoftBox mt={1}>
            <SoftTypography sx={{ ...labelSx, display: 'block', mb: 0.25 }}>Plan name</SoftTypography>
            <InlineEditable value={plan.name} onSave={(v) => onUpdate('name', v)} placeholder="Plan name" />
          </SoftBox>

          <SoftBox mt={1.5}>
            <SoftTypography sx={{ ...labelSx, display: 'block', mb: 0.25 }}>Description</SoftTypography>
            <InlineEditable value={plan.description || ''} onSave={(v) => onUpdate('description', v)} placeholder="Description" multiline />
          </SoftBox>

          <SoftBox mt={1.5} display="flex" gap={2} flexWrap="wrap">
            <SoftBox flex={1} minWidth={80}>
              <SoftTypography sx={{ ...labelSx, display: 'block', mb: 0.25 }}>Monthly</SoftTypography>
              {onUpdatePrice ? (
                <InlineEditable
                  value={plan.monthlyPrice > 0 ? String(plan.monthlyPrice) : ''}
                  displayValue={plan.monthlyPrice > 0 ? formatPrice(plan.monthlyPrice, plan.currency) : undefined}
                  underline
                  onSave={(v) => {
                    const n = parseFloat(v);
                    if (!Number.isNaN(n) && n >= 0) onUpdatePrice('month', n);
                  }}
                  placeholder="0"
                  type="number"
                />
              ) : (
                <SoftTypography sx={{ fontSize: '0.8rem', color: 'white', fontWeight: 700, textDecoration: 'underline' }}>
                  {plan.monthlyPrice > 0 ? formatPrice(plan.monthlyPrice, plan.currency) : '—'}
                </SoftTypography>
              )}
            </SoftBox>
            <SoftBox flex={1} minWidth={80}>
              <SoftTypography sx={{ ...labelSx, display: 'block', mb: 0.25 }}>Yearly</SoftTypography>
              {onUpdatePrice ? (
                <InlineEditable
                  value={plan.yearlyPrice > 0 ? String(plan.yearlyPrice) : ''}
                  displayValue={plan.yearlyPrice > 0 ? formatPrice(plan.yearlyPrice, plan.currency) : undefined}
                  underline
                  onSave={(v) => {
                    const n = parseFloat(v);
                    if (!Number.isNaN(n) && n >= 0) onUpdatePrice('year', n);
                  }}
                  placeholder="0"
                  type="number"
                />
              ) : (
                <SoftTypography sx={{ fontSize: '0.8rem', color: 'white', fontWeight: 700, textDecoration: 'underline' }}>
                  {plan.yearlyPrice > 0 ? formatPrice(plan.yearlyPrice, plan.currency) : '—'}
                </SoftTypography>
              )}
            </SoftBox>
          </SoftBox>

          {/* Toggle switches - horizontal */}
          <SoftBox mt={2} pt={2} borderTop="1px solid rgba(255,255,255,0.3)" display="flex" flexDirection="row" gap={2} flexWrap="wrap" sx={{ '& .MuiFormControlLabel-label': { color: 'white !important', fontSize: '0.8rem', textTransform: 'uppercase' } }}>
            <FormControlLabel
              control={
                <Switch
                  checked={meta.non_sellable === 'true'}
                  onChange={(e) => onUpdate('non_sellable', e.target.checked)}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase': { color: 'rgba(255,255,255,0.5)' },
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#fb923c' },
                    '& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb': { backgroundColor: 'white' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#fb923c', opacity: 1 },
                    '& .MuiSwitch-track': { backgroundColor: 'rgba(255,255,255,0.3)' },
                  }}
                />
              }
              label="Not for Sale"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={meta.hidden === 'true'}
                  onChange={(e) => onUpdate('hidden', e.target.checked)}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase': { color: 'rgba(255,255,255,0.5)' },
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#fb923c' },
                    '& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb': { backgroundColor: 'white' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#fb923c', opacity: 1 },
                    '& .MuiSwitch-track': { backgroundColor: 'rgba(255,255,255,0.3)' },
                  }}
                />
              }
              label="Hidden"
            />
          </SoftBox>
        </SoftBox>
      </Card>
    </SoftBox>
  );
};

export default PlanDetailSidebar;
