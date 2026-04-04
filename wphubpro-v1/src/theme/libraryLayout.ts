/**
 * Shared layout for library list + detail pages: main column (8fr) + blue sidebar (4fr).
 * Use the list grid when tabs/title sit above the content paper; sidebar aligns with paper row only.
 */

import { contentPaperSurfaceSx } from './contentPaper';

export const libraryListPageGridSx = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  display: 'grid',
  columnGap: { xs: 0, lg: 2 },
  rowGap: { xs: 2, lg: 0 },
  /** Main column flexible; sidebar fixed narrow width */
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(280px, 360px)' },
  /** xs: tabs, paper, filters; lg: tabs row, then paper | sidebar */
  gridTemplateRows: { xs: 'auto 1fr auto', lg: 'auto 1fr' },
  alignItems: 'stretch',
} as const;

/** Room for magic-nav circle (`top` offset ~ half of 56px) inside grids/shells that use overflow: hidden. */
export const libraryMagicTabStripWrapperSx = {
  pt: 3,
  overflow: 'visible',
  minWidth: 0,
} as const;

export const libraryListMainTabsSx = {
  gridColumn: { xs: '1', lg: '1' },
  gridRow: { xs: '1', lg: '1' },
  ...libraryMagicTabStripWrapperSx,
};

export const libraryListMainPaperSx = {
  gridColumn: { xs: '1', lg: '1' },
  gridRow: { xs: '2', lg: '2' },
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

/** Sidebar aligned with paper row; sticky card inside. */
export const libraryListSidebarSx = {
  gridColumn: { xs: '1', lg: '2' },
  gridRow: { xs: '3', lg: '2' },
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  pr: { lg: 4 },
  alignSelf: 'stretch',
};

/** List pages without tab strip: title row, then paper | sidebar (sidebar top aligns with paper). */
export const libraryListPageNoTabsGridSx = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  display: 'grid',
  columnGap: { xs: 0, lg: 2 },
  rowGap: { xs: 2, lg: 0 },
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(280px, 360px)' },
  gridTemplateRows: { xs: 'auto 1fr auto', lg: 'auto 1fr' },
  alignItems: 'stretch',
} as const;

export const libraryListNoTabsTitleSx = {
  gridColumn: { xs: '1', lg: '1' },
  gridRow: { xs: '1', lg: '1' },
  minWidth: 0,
};

export const libraryListNoTabsPaperSx = {
  gridColumn: { xs: '1', lg: '1' },
  gridRow: { xs: '2', lg: '2' },
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

export const libraryListNoTabsSidebarSx = {
  gridColumn: { xs: '1', lg: '2' },
  gridRow: { xs: '3', lg: '2' },
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  pr: { lg: 4 },
};

/** Classic detail page: main | sidebar, same top (stacked content in main). */
export const libraryDetailGridSx = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  display: 'grid',
  columnGap: { xs: 0, lg: 3 },
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 8fr) minmax(0, 4fr)' },
  gridTemplateAreas: {
    xs: '"main" "sidebar"',
    lg: '"main sidebar"',
  },
  alignItems: 'start',
} as const;

export const libraryDetailMainColumnSx = {
  gridArea: 'main',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minHeight: 0,
  minWidth: 0,
};

export const libraryDetailSidebarColumnSx = {
  gridArea: 'sidebar',
  pr: { lg: 4 },
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

export const libraryContentPaperSx = {
  ...contentPaperSurfaceSx,
};
