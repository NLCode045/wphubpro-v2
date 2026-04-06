/**
 * Gradient info header + body for detail pages (Soft UI).
 * variant="fullGradient": entire card matches library plugin sidebar (gradient + white text).
 */
import React from 'react';
import { styled } from '@mui/material/styles';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Icon from '@mui/material/Icon';
import { PLUGIN_INFO_GRADIENT, PLUGIN_INFO_CARD_SHADOW, iconButtonOnBlueGradientSx } from '../../theme/detailPageStyles';

const GRADIENT_HEADER = 'linear-gradient(310deg, #4F5482 0%, #7a8ef0 100%)';

const Root = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(79, 84, 130, 0.12)',
}));

const Header = styled(SoftBox)({
  background: GRADIENT_HEADER,
  color: '#fff',
  padding: '1.25rem 1.5rem',
  position: 'relative',
});

const Body = styled(SoftBox)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(2.5),
}));

const RootGradientFull = styled(Card)({
  background: PLUGIN_INFO_GRADIENT,
  color: '#fff',
  padding: '1rem 1.25rem',
  boxShadow: PLUGIN_INFO_CARD_SHADOW,
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 12,
  overflow: 'hidden',
  '& .MuiTypography-root': { color: 'inherit' },
});

export interface DetailPageInfoCardProps {
  backLabel: string;
  onBack: () => void;
  title: string;
  subtitle?: React.ReactNode;
  /** Primary actions in the header row (e.g. Stripe, Users) */
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /** default: white body below gradient strip; fullGradient: same gradient as plugin library sidebar */
  variant?: 'default' | 'fullGradient';
  /** Back control: icon-only with tooltip (recommended for fullGradient) */
  backIconOnly?: boolean;
}

const DetailPageInfoCard: React.FC<DetailPageInfoCardProps> = ({
  backLabel,
  onBack,
  title,
  subtitle,
  actions,
  children,
  variant = 'default',
  backIconOnly = false,
}) => {
  if (variant === 'fullGradient') {
    const showBackIconOnly = backIconOnly !== false;
    return (
      <RootGradientFull elevation={0}>
        <SoftBox display="flex" alignItems="flex-start" justifyContent="space-between" gap={1.5} flexWrap="wrap">
          <SoftBox display="flex" alignItems="flex-start" gap={1} sx={{ flex: '1 1 160px', minWidth: 0 }}>
            {showBackIconOnly ? (
              <Tooltip title={backLabel}>
                <IconButton
                  size="small"
                  onClick={onBack}
                  aria-label={backLabel}
                  sx={{ ...iconButtonOnBlueGradientSx, mt: -0.25 }}
                >
                  <Icon fontSize="small">arrow_back</Icon>
                </IconButton>
              </Tooltip>
            ) : (
              <SoftButton
                size="small"
                variant="text"
                onClick={onBack}
                startIcon={<Icon sx={{ color: '#fff !important' }}>arrow_back</Icon>}
                sx={{
                  color: 'rgba(255,255,255,0.92) !important',
                  minWidth: 0,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                {backLabel}
              </SoftButton>
            )}
            <SoftBox sx={{ flex: '1 1 0%', minWidth: 0 }}>
              <SoftTypography variant="h6" fontWeight="bold" sx={{ color: '#fff', fontSize: '1rem', lineHeight: 1.35 }}>
                {title}
              </SoftTypography>
              {subtitle != null && subtitle !== '' && (
                <SoftTypography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.88)', mt: 0.75, fontSize: '0.8125rem', lineHeight: 1.5, wordBreak: 'break-all' }}
                >
                  {subtitle}
                </SoftTypography>
              )}
            </SoftBox>
          </SoftBox>
          {actions ? (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ alignItems: 'center', flexShrink: 0 }}>
              {actions}
            </Stack>
          ) : null}
        </SoftBox>
        {children != null ? (
          <>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.25)', my: 2 }} />
            <SoftBox sx={{ color: 'rgba(255,255,255,0.98)', '& .MuiTypography-root': { color: 'inherit' } }}>{children}</SoftBox>
          </>
        ) : null}
      </RootGradientFull>
    );
  }

  return (
    <Root elevation={0}>
      <Header>
        <SoftBox display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} flexWrap="wrap">
          <SoftBox sx={{ flex: '1 1 200px', minWidth: 0 }}>
            <SoftButton
              size="small"
              variant="text"
              onClick={onBack}
              startIcon={<Icon sx={{ color: '#fff !important' }}>arrow_back</Icon>}
              sx={{
                color: 'rgba(255,255,255,0.92) !important',
                mb: 1,
                pl: 0,
                minWidth: 0,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              {backLabel}
            </SoftButton>
            <SoftTypography variant="h5" fontWeight="bold" sx={{ color: '#fff', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              {title}
            </SoftTypography>
            {subtitle != null && subtitle !== '' && (
              <SoftTypography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.75, fontSize: '0.875rem', lineHeight: 1.5 }}
              >
                {subtitle}
              </SoftTypography>
            )}
          </SoftBox>
          {actions ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ alignItems: 'center' }}>
              {actions}
            </Stack>
          ) : null}
        </SoftBox>
      </Header>
      {children != null ? <Body>{children}</Body> : null}
    </Root>
  );
};

export default DetailPageInfoCard;
