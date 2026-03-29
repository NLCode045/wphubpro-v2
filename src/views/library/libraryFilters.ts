import type { LibraryDashboardRow } from '@/domains/library';
import type { LibraryFavouritesKindParam, LibraryViewParam } from './components/libraryUrlState';
import type { CategoryFolderCounts } from './components/LibraryCategoryFolders';

export function collectAllTagsFromRows(rows: LibraryDashboardRow[]): string[] {
  const s = new Set<string>();
  for (const r of rows) {
    for (const t of r.tags) {
      const x = String(t).trim();
      if (x) s.add(x);
    }
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

export function computeSidebarCounts(rows: LibraryDashboardRow[]) {
  return {
    plugins: rows.filter((r) => r.kind === 'plugin').length,
    themes: rows.filter((r) => r.kind === 'theme').length,
    local: rows.filter((r) => r.hasLocalVersion).length,
    favourites: rows.filter((r) => r.isFavourite).length,
  };
}

export function computeCategoryFolderCounts(rows: LibraryDashboardRow[]): CategoryFolderCounts {
  const byCategoryId: Record<string, number> = {};
  let uncategorized = 0;
  for (const r of rows) {
    if (!r.categoryId) uncategorized += 1;
    else {
      byCategoryId[r.categoryId] = (byCategoryId[r.categoryId] ?? 0) + 1;
    }
  }
  return { byCategoryId, uncategorized };
}

export function filterLibraryRows(
  rows: LibraryDashboardRow[],
  opts: {
    view: LibraryViewParam;
    tag: string | null;
    categoryId: string | null;
    q: string;
    /** When view is favourites, narrow to favourited plugins or themes (folder drill). */
    favouritesKind?: LibraryFavouritesKindParam | null;
  },
): LibraryDashboardRow[] {
  let r = rows;
  const { view, tag, categoryId, q, favouritesKind } = opts;

  if (view === 'all') {
    /* no kind / local / favourites filter — plugins and themes */
  } else if (view === 'plugins') r = r.filter((x) => x.kind === 'plugin');
  else if (view === 'themes') r = r.filter((x) => x.kind === 'theme');
  else if (view === 'local') r = r.filter((x) => x.hasLocalVersion);
  else if (view === 'favourites') {
    r = r.filter((x) => x.isFavourite);
    if (favouritesKind === 'plugins') r = r.filter((x) => x.kind === 'plugin');
    else if (favouritesKind === 'themes') r = r.filter((x) => x.kind === 'theme');
  }

  if (tag) {
    const tl = tag.toLowerCase();
    r = r.filter((x) => x.tags.some((t) => t.toLowerCase() === tl));
  }

  if (categoryId === 'uncategorized') r = r.filter((x) => !x.categoryId);
  else if (categoryId) r = r.filter((x) => x.categoryId === categoryId);

  const qq = q.trim().toLowerCase();
  if (qq) {
    r = r.filter(
      (row) =>
        row.name.toLowerCase().includes(qq) ||
        row.tags.some((t) => t.toLowerCase().includes(qq)) ||
        row.versionLabel.toLowerCase().includes(qq) ||
        row.author.toLowerCase().includes(qq) ||
        (row.categoryName?.toLowerCase().includes(qq) ?? false),
    );
  }

  return r;
}
