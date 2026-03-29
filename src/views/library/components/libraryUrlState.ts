import type { SetURLSearchParams } from 'react-router';

export type LibraryViewParam =
  | 'all'
  | 'plugins'
  | 'themes'
  | 'families'
  | 'collections'
  | 'local'
  | 'favourites';

const VALID_VIEWS = new Set<LibraryViewParam>([
  'all',
  'plugins',
  'themes',
  'families',
  'collections',
  'local',
  'favourites',
]);

export function parseLibraryView(raw: string | null): LibraryViewParam {
  if (raw && VALID_VIEWS.has(raw as LibraryViewParam)) return raw as LibraryViewParam;
  return 'plugins';
}

/** Favourites folder strip: drill into plugin vs theme buckets before picking a category. */
export type LibraryFavouritesKindParam = 'plugins' | 'themes';

export function parseFavouritesKind(raw: string | null): LibraryFavouritesKindParam | null {
  if (raw === 'plugins' || raw === 'themes') return raw;
  return null;
}

export function setLibraryParams(
  setParams: SetURLSearchParams,
  patch: Partial<{
    view: LibraryViewParam;
    tag: string | null;
    category: string | null;
    q: string;
    favKind: LibraryFavouritesKindParam | null;
  }>,
) {
  setParams(
    (prev) => {
      const p = new URLSearchParams(prev);
      if (patch.view !== undefined) p.set('view', patch.view);
      if (patch.tag !== undefined) {
        if (patch.tag === null || patch.tag === '') p.delete('tag');
        else p.set('tag', patch.tag);
      }
      if (patch.category !== undefined) {
        if (patch.category === null || patch.category === '') p.delete('category');
        else p.set('category', patch.category);
      }
      if (patch.q !== undefined) {
        if (!patch.q.trim()) p.delete('q');
        else p.set('q', patch.q);
      }
      if (patch.favKind !== undefined) {
        if (patch.favKind === null) p.delete('favKind');
        else p.set('favKind', patch.favKind);
      }
      if (!p.has('view')) p.set('view', 'plugins');
      return p;
    },
    { replace: true },
  );
}
