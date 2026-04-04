/**
 * TabNavList - Horizontal tab navigation
 * - `library`: “magic nav” pill — sliding orange indicator with curve notches (Online Tutorials / F3lip32010 pattern), icon lifts into circle
 * - `default`: MUI Tabs with animated orange pill indicator (site detail, account, etc.)
 */
import React, { useLayoutEffect, useRef } from 'react';
import { Tabs, Tab, useMediaQuery, useTheme } from '@mui/material';
import ButtonBase from '@mui/material/ButtonBase';
import Icon from '@mui/material/Icon';
import { styled } from '@mui/material/styles';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';

const blueGradient = 'linear-gradient(310deg, #4F5482, #7a8ef0)';
const orangeGradient = 'linear-gradient(310deg, #ea580c, #fb923c)';

/** Inactive tab icons — dark like the [magic nav demo](https://github.com/F3lip32010/Magic-Navigation-Menu-Indicator-using-Html-CSS-Javascript-Curve-Outside-Effects) (`--clr`); primary theme is orange */
const LIB_NAV_ICON_IDLE = '#222327';
const LIB_NAV_ORANGE = '#ea580c';

export interface TabNavItem {
  value: number;
  label: string;
  icon?: string;
}

export interface TabNavListProps {
  items: TabNavItem[];
  value: number;
  onChange: (event: React.SyntheticEvent, value: number) => void;
  /** Optional wrapper sx. Default: px: 3, pt: 0, py: 1, backgroundColor: 'transparent' */
  sx?: object;
  /**
   * `library` — pill bar: white background, blue icons, orange active circle (matches content paper width).
   * `default` — site-style MUI tab strip with page padding.
   */
  variant?: 'default' | 'library';
}

const tabStyles = {
  minHeight: 40,
  position: 'relative',
  '& .MuiTabs-indicator': {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ea580c',
    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  '& .MuiTabs-flexContainer': { overflow: 'visible', justifyContent: 'flex-start', gap: 4 },
  '& .MuiTab-root': {
    flex: '0 0 auto',
    minHeight: 40,
    minWidth: 0,
    padding: '6px 12px',
    justifyContent: 'flex-start',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: 500,
    textTransform: 'none',
    color: 'text.secondary',
    backgroundColor: 'transparent',
    '&:hover': { color: 'text.primary' },
    '&.Mui-selected': {
      color: 'primary.main',
      fontWeight: 600,
    },
  },
  '& .MuiTab-iconWrapper': {
    marginRight: 1,
    marginLeft: 0,
    '& .material-icons-round, & .material-icons, & .MuiIcon-root': {
      fontSize: '20px !important',
      color: '#fff !important',
    },
    '& > *': {
      fontSize: '20px !important',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 32,
      height: 32,
      borderRadius: 8,
      background: orangeGradient,
      color: '#fff',
    },
  },
  '& .Mui-selected .MuiTab-iconWrapper > *': {
    background: blueGradient,
    color: '#fff',
  },
};

const libraryVariantSx = {
  mb: 2,
  px: 0,
  py: 0,
  backgroundColor: 'transparent',
};

const LibraryPillOuter = styled(SoftBox)({
  width: '100%',
  position: 'relative',
  overflow: 'visible',
});

const LibraryPillBar = styled(SoftBox)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  minHeight: 68,
  boxSizing: 'border-box',
  backgroundColor: '#FFFFFF',
  borderRadius: 10,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  paddingLeft: theme.spacing(1),
  paddingRight: theme.spacing(1),
  /** Space for indicator (`top: -half`) + icon lift */
  paddingTop: theme.spacing(3.25),
  /** Room for captions under icons */
  paddingBottom: theme.spacing(1.25),
  overflow: 'visible',
  isolation: 'isolate',
}));

/** Sliding circle + curve “outside” notches (see Magic Navigation Menu demo) */
const MAGIC_INDICATOR_SIZE = 60;
const MAGIC_INDICATOR_HALF = MAGIC_INDICATOR_SIZE / 2;

const MagicNavIndicator = styled(SoftBox, {
  shouldForwardProp: (p) => p !== '$pageBg',
})<{
  $pageBg: string;
}>(({ $pageBg }) => ({
  position: 'absolute',
  width: MAGIC_INDICATOR_SIZE,
  height: MAGIC_INDICATOR_SIZE,
  top: -MAGIC_INDICATOR_HALF,
  left: 0,
  /** Hidden until ref applies inline opacity (avoids sx fighting DOM on re-renders). */
  opacity: 0,
  borderRadius: '50%',
  background: orangeGradient,
  border: `5px solid ${$pageBg}`,
  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.28)',
  pointerEvents: 'none',
  zIndex: 0,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: -18,
    width: 16,
    height: 16,
    background: $pageBg,
    borderTopRightRadius: 16,
    transform: 'translateY(-50%)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    right: -18,
    width: 16,
    height: 16,
    background: $pageBg,
    borderTopLeftRadius: 16,
    transform: 'translateY(-50%)',
  },
}));

const LibraryTabButton = styled(ButtonBase)(({ theme }) => ({
  position: 'relative',
  overflow: 'visible',
  flex: 1,
  minWidth: 0,
  minHeight: 60,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: theme.spacing(0.5),
  padding: theme.spacing(0.5, 0.5, 1),
  borderRadius: theme.shape.borderRadius,
  '&.MuiButtonBase-root': {
    overflow: 'visible',
  },
  '&:focus-visible': {
    outline: `2px solid ${LIB_NAV_ORANGE}`,
    outlineOffset: 2,
  },
}));

interface LibraryPillNavProps {
  items: TabNavItem[];
  value: number;
  onChange: (event: React.SyntheticEvent, value: number) => void;
}

const LibraryPillNav: React.FC<LibraryPillNavProps> = ({ items, value, onChange }) => {
  const theme = useTheme();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  /** Notch cutouts must match the pill bar background. */
  const pageBg = '#FFFFFF';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  /** Last applied px — avoid redundant DOM writes. */
  const lastLeftPxRef = useRef<number | null>(null);
  /** Content key so inline `items={[...]}` does not retrigger the effect every parent render. */
  const itemsLayoutKey = items.map((i) => `${i.value}:${i.label}:${i.icon ?? ''}`).join('|');

  useLayoutEffect(() => {
    lastLeftPxRef.current = null;
    tabRefs.current = tabRefs.current.slice(0, items.length);

    /**
     * Position via direct DOM (no React setState). Prevents layout-driven re-render chains
     * that trigger minified error #185 (nested updates > 50).
     */
    const applyPosition = () => {
      const idx = items.findIndex((i) => i.value === value);
      const el = tabRefs.current[idx];
      const c = containerRef.current;
      const ind = indicatorRef.current;
      if (!el || !c || !ind) return;
      const er = el.getBoundingClientRect();
      const cr = c.getBoundingClientRect();
      const center = er.left - cr.left + er.width / 2;
      const nextLeft = Math.round(center - MAGIC_INDICATOR_HALF);
      if (lastLeftPxRef.current !== null && Math.abs(lastLeftPxRef.current - nextLeft) < 0.5) {
        ind.style.opacity = '1';
        return;
      }
      lastLeftPxRef.current = nextLeft;
      ind.style.left = `${nextLeft}px`;
      ind.style.opacity = '1';
    };

    /** Sync before paint so the circle is not stuck at left:0 for one frame. */
    applyPosition();

    const scheduleUpdate = () => {
      requestAnimationFrame(applyPosition);
    };

    window.addEventListener('resize', scheduleUpdate);
    let ro: ResizeObserver | null = null;
    const node = containerRef.current;
    if (node && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => scheduleUpdate());
      ro.observe(node);
    }

    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      ro?.disconnect();
    };
  }, [value, itemsLayoutKey]);

  return (
    <LibraryPillOuter>
      <LibraryPillBar ref={containerRef}>
        <MagicNavIndicator
          ref={indicatorRef}
          aria-hidden
          $pageBg={pageBg}
          sx={{
            transition: reducedMotion
              ? 'none'
              : 'left 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
          }}
        />
        <SoftBox
          role="tablist"
          display="flex"
          justifyContent="space-evenly"
          alignItems="stretch"
          sx={{ position: 'relative', zIndex: 1, minHeight: 44, width: '100%' }}
        >
          {items.map((item, index) => {
            const selected = value === item.value;
            return (
              <LibraryTabButton
                key={item.value}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                role="tab"
                id={`tabnav-${item.value}`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                disableRipple
                onClick={(e) => onChange(e, item.value)}
              >
                <SoftBox
                  sx={{
                    position: 'relative',
                    width: '100%',
                    flex: 1,
                    minHeight: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon ? (
                    <Icon
                      sx={{
                        color: selected ? '#fff' : LIB_NAV_ICON_IDLE,
                        fontSize: '30px !important',
                        width: 30,
                        height: 30,
                        lineHeight: 1,
                        position: 'relative',
                        zIndex: 2,
                        transition: reducedMotion
                          ? 'none'
                          : 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), color 0.35s ease',
                        transform: selected ? 'translateY(-10px)' : 'none',
                        '&.material-icons-round, &.material-icons': {
                          fontSize: '30px !important',
                        },
                      }}
                    >
                      {item.icon}
                    </Icon>
                  ) : null}
                </SoftBox>
                <SoftTypography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    bottom: theme.spacing(0.5),
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    fontWeight: selected ? 600 : 500,
                    color: LIB_NAV_ICON_IDLE,
                    fontSize: '0.72rem',
                    letterSpacing: '0.03em',
                    lineHeight: 1.25,
                    px: 0.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: reducedMotion ? 'none' : 'opacity 0.35s ease',
                    opacity: selected ? 1 : 0.72,
                    pointerEvents: 'none',
                  }}
                >
                  {item.label}
                </SoftTypography>
              </LibraryTabButton>
            );
          })}
        </SoftBox>
      </LibraryPillBar>
    </LibraryPillOuter>
  );
};

const TabNavList: React.FC<TabNavListProps> = ({ items, value, onChange, sx = {}, variant = 'default' }) => {
  if (variant === 'library') {
    return (
      <SoftBox
        sx={{
          flexShrink: 0,
          width: '100%',
          minWidth: 0,
          ...libraryVariantSx,
          ...sx,
        }}
      >
        <LibraryPillNav items={items} value={value} onChange={onChange} />
      </SoftBox>
    );
  }

  return (
    <SoftBox
      sx={{
        flexShrink: 0,
        color: '#292F4D',
        mb: 2,
        px: 3,
        pt: 0,
        py: 1,
        backgroundColor: 'transparent',
        ...sx,
      }}
    >
      <Tabs
        value={value}
        onChange={onChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={tabStyles}
      >
        {items.map((item) => (
          <Tab
            key={item.value}
            label={
              <SoftBox component="span" sx={{ position: 'relative' }}>
                {item.label}
              </SoftBox>
            }
            icon={
              item.icon ? (
                <SoftBox
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                  }}
                >
                  <Icon sx={{ fontSize: 20 }}>{item.icon}</Icon>
                </SoftBox>
              ) : undefined
            }
            iconPosition={item.icon ? 'start' : undefined}
            value={item.value}
          />
        ))}
      </Tabs>
    </SoftBox>
  );
};

/** Simple tab panel - renders children only when value matches index */
export interface TabNavPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  /** Optional sx for the panel wrapper (e.g. flex: 1 for scroll containment) */
  sx?: object;
}

export const TabNavPanel: React.FC<TabNavPanelProps> = ({ children, value, index, sx }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    style={{
      display: value === index ? 'flex' : 'none',
      flex: 1,
      flexDirection: 'column',
      minHeight: 0,
      overflow: 'hidden',
    }}
  >
    {value === index && <SoftBox pt={0} pb={3} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', ...sx }}>{children}</SoftBox>}
  </div>
);

export default TabNavList;
