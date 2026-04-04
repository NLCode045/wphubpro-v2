/**
 * Shared typography for detail / admin info surfaces (use with sx or component props).
 */
export const detailLabelSx = {
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
  display: 'block',
  mb: 0.5,
};

export const detailValueSx = {
  fontSize: '0.875rem',
  lineHeight: 1.5,
  color: 'text.primary',
};

export const detailSectionTitleSx = {
  fontSize: '0.8125rem',
  fontWeight: 700,
  letterSpacing: '0.02em',
  mb: 1.5,
  color: 'text.secondary',
};

/** Match library plugin sidebar gradient card */
export const PLUGIN_INFO_GRADIENT = 'linear-gradient(310deg, #4F5482, #7a8ef0)';
export const PLUGIN_INFO_CARD_SHADOW = '6px 6px 14px rgba(0,0,0,0.25), -3px -3px 8px rgba(255,255,255,0.15)';

/** Blue gradient + subtle white dot grid (site Plugins/Themes tables, library row actions, etc.) */
export const PLUGIN_INFO_GRADIENT_DOTTED_BG = {
  backgroundImage: `radial-gradient(rgba(255,255,255,0.26) 1px, transparent 1px), ${PLUGIN_INFO_GRADIENT}`,
  backgroundSize: '10px 10px, 100% 100%',
} as const;

/** Orange gradient — icon buttons on blue gradient cards (library sidebar, site sidebar, admin info, etc.) */
export const ORANGE_ACTION_GRADIENT = 'linear-gradient(310deg, #ea580c, #fb923c)';

const blueIconBtnBase = {
  ...PLUGIN_INFO_GRADIENT_DOTTED_BG,
  color: '#fff',
  borderRadius: '50%',
  boxShadow: '4px 4px 10px rgba(0,0,0,0.2), -2px -2px 6px rgba(255,255,255,0.12)',
  transition: 'box-shadow 0.2s ease',
  '&:hover': {
    ...PLUGIN_INFO_GRADIENT_DOTTED_BG,
    boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.18)',
  },
  '&:active': {
    boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.22)',
  },
  '&.Mui-disabled': {
    ...PLUGIN_INFO_GRADIENT_DOTTED_BG,
    opacity: 0.45,
    color: '#fff',
  },
  '& .MuiSvgIcon-root': { color: '#fff !important' },
} as const;

const orangeIconBtnBase = {
  background: ORANGE_ACTION_GRADIENT,
  color: '#fff',
  borderRadius: '50%',
  boxShadow: '4px 4px 10px rgba(0,0,0,0.25), -2px -2px 6px rgba(255,255,255,0.1)',
  transition: 'box-shadow 0.2s ease',
  '&:hover': {
    background: ORANGE_ACTION_GRADIENT,
    boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.2)',
  },
  '&:active': {
    boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.25)',
  },
  '&.Mui-disabled': {
    background: ORANGE_ACTION_GRADIENT,
    opacity: 0.45,
    color: '#fff',
  },
  '& .MuiSvgIcon-root': { color: '#fff !important' },
} as const;

/** Default 32×32 on blue gradient panels */
export const iconButtonOnBlueGradientSx = {
  width: 32,
  height: 32,
  minWidth: 32,
  minHeight: 32,
  padding: 0,
  ...orangeIconBtnBase,
} as const;

/** 28×28 — e.g. site detail sidebar action row */
export const iconButtonOnBlueGradientSmSx = {
  width: 28,
  height: 28,
  minWidth: 28,
  minHeight: 28,
  padding: 0,
  ...orangeIconBtnBase,
} as const;

/** Table rows & light surfaces — blue gradient circle (matches header accent #4F5482) */
export const iconButtonOnLightSurfaceSx = {
  width: 32,
  height: 32,
  minWidth: 32,
  minHeight: 32,
  padding: 0,
  ...blueIconBtnBase,
} as const;

export const detailSectionTitleOnGradientSx = {
  fontSize: '0.8125rem',
  fontWeight: 700,
  letterSpacing: '0.02em',
  mb: 1.5,
  color: 'rgba(255,255,255,0.85)',
};

export const detailLabelOnGradientSx = {
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  color: 'rgba(255,255,255,0.65)',
  display: 'block',
  mb: 0.5,
};

export const detailValueOnGradientSx = {
  fontSize: '0.875rem',
  lineHeight: 1.5,
  color: 'rgba(255,255,255,0.98)',
};

export const formControlSurfaceSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    fontSize: '0.875rem',
    backgroundColor: 'background.default',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    '&:hover fieldset': {
      borderColor: 'info.main',
    },
    '&.Mui-focused fieldset': {
      borderWidth: 1,
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
  },
};
