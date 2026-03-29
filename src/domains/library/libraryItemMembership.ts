import type { LibraryCollection, LibraryFamily, LibraryItemType } from '@/types';

/** Families where `slug` appears in member_slugs (case-insensitive). */
export function filterFamiliesContainingSlug(families: LibraryFamily[], slug: string): LibraryFamily[] {
  const s = slug.trim().toLowerCase();
  if (!s) return [];
  return families.filter((f) => f.memberSlugs.some((m) => m.toLowerCase() === s));
}

/** Collections that reference this logical slug (optionally scoped by item type). */
export function filterCollectionsContainingSlug(
  collections: LibraryCollection[],
  slug: string,
  type?: LibraryItemType,
): LibraryCollection[] {
  const s = slug.trim().toLowerCase();
  return collections.filter((c) =>
    c.items.some((m) => {
      if (m.slug.toLowerCase() !== s) return false;
      if (type !== undefined && m.type !== type) return false;
      return true;
    }),
  );
}
