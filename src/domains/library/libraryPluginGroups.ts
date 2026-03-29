import type { LibraryItem } from '@/types';

export function getPluginSlug(item: LibraryItem): string {
  if (item.wpSlug) return item.wpSlug;
  return item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function getThemeGroupKey(item: LibraryItem): string {
  if (item.wpSlug) return item.wpSlug.toLowerCase();
  return item.name.toLowerCase();
}

export function getItemsForGrouping(item: LibraryItem, libraryItems: LibraryItem[]): LibraryItem[] {
  if (item.type === 'theme') {
    const tk = getThemeGroupKey(item);
    return libraryItems.filter((i) => i.type === 'theme' && getThemeGroupKey(i) === tk);
  }
  return libraryItems.filter(
    (i) =>
      i.type === 'plugin' &&
      (i.wpSlug?.toLowerCase() === getPluginSlug(item).toLowerCase() ||
        getPluginSlug(i) === getPluginSlug(item)),
  );
}

/** Slugs that have at least one WordPress.org plugin row (for WP API queries). */
export function pluginGroupSlugsWithOfficial(
  pluginGroups: { slug: string; items: LibraryItem[] }[],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const g of pluginGroups) {
    const hasOfficial = g.items.some((i) => i.type === 'plugin' && i.source === 'official');
    if (!hasOfficial) continue;
    const sl = g.slug.toLowerCase();
    if (seen.has(sl)) continue;
    seen.add(sl);
    out.push(g.slug);
  }
  return out;
}

/** One entry per plugin slug for list/sync views. */
export function getPluginGroups(
  pluginItems: LibraryItem[],
): { slug: string; displayName: string; items: LibraryItem[] }[] {
  const seen = new Set<string>();
  const groups: { slug: string; displayName: string; items: LibraryItem[] }[] = [];
  for (const item of pluginItems) {
    const slug = getPluginSlug(item);
    if (seen.has(slug.toLowerCase())) continue;
    seen.add(slug.toLowerCase());
    const items = getItemsForGrouping(item, pluginItems);
    const displayName = items.find((i) => i.source === 'official')?.name ?? items[0]?.name ?? slug;
    groups.push({ slug, displayName, items });
  }
  return groups;
}
