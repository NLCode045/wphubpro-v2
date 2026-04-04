/**
 * Shared “content paper” chrome: main column surfaces, page offset from the navbar,
 * and default title/description typography for list/detail pages.
 */
import type { SxProps, Theme } from '@mui/material/styles';

/** Theme spacing units — top margin for main page content below the app bar. */
export const CONTENT_PAGE_MARGIN_TOP = 3;

/** Card / main panel surface: background, radius, hairline border, light shadow. */
export const contentPaperSurfaceSx: SxProps<Theme> = {
  bgcolor: 'background.paper',
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
};

/** Standard page wrapper: top margin + horizontal padding + bottom padding before footer. */
export const contentPageShellSx: SxProps<Theme> = {
  mt: CONTENT_PAGE_MARGIN_TOP,
  px: 3,
  pb: 3,
};

/** Same as `contentPageShellSx` plus flex column fill (library, site detail, admin). */
export const contentPageShellFlexSx: SxProps<Theme> = {
  ...contentPageShellSx,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
};

/** Primary heading inside a content card / page header (replaces ad-hoc h4/h5 sizes). */
export const contentPaperPageTitleSx: SxProps<Theme> = {
  fontSize: '1.125rem',
  fontWeight: 700,
  lineHeight: 1.35,
  letterSpacing: '0.01em',
};

/** Subtitle / helper under the page title. */
export const contentPaperPageDescriptionSx: SxProps<Theme> = {
  fontSize: '0.8125rem',
  lineHeight: 1.4,
  color: 'text.secondary',
};
