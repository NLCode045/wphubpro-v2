import type { LibraryItem, LibraryItemType } from '@/types';

/** Canonical slug for grouping library items (plugins + themes). */
export function getLibraryItemSlug(item: LibraryItem): string {
  if (item.wpSlug) return item.wpSlug.toLowerCase();
  return item.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function filterLibraryItemsBySlugAndType(
  items: LibraryItem[],
  slug: string,
  type: LibraryItemType,
): LibraryItem[] {
  const s = slug.toLowerCase();
  return items.filter((i) => {
    if (i.type !== type) return false;
    return getLibraryItemSlug(i) === s;
  });
}
