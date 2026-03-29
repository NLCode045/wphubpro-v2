import type { LibraryItem } from '@/types';
import { getLibraryItemSlug } from './libraryItemSlug';
import { getPluginGroups } from './libraryPluginGroups';

export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  if (typeof document === 'undefined') return text;
  const el = document.createElement('div');
  el.innerHTML = text;
  return el.textContent || el.innerText || text;
}

function tagsForGroup(group: { items: LibraryItem[] }): string[] {
  const s = new Set<string>();
  group.items.forEach((i) =>
    (i.tags ?? []).forEach((t) => {
      const x = String(t).trim();
      if (x) s.add(x);
    }),
  );
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

function tagsForThemeItem(item: LibraryItem): string[] {
  return (item.tags ?? [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

/** Flat list row aligned with wphubpro Library page “Library items” table (plugin groups + theme rows). */
export type LibraryDashboardRow = {
  id: string;
  kind: 'plugin' | 'theme';
  name: string;
  tags: string[];
  versionLabel: string;
  author: string;
  /** Appwrite `library` document id for patch/delete/favourite/category. */
  libraryDocumentId: string;
  /** Lowercased slug for `/library/items/:kind/:slug` routes. */
  routeSlug: string;
  categoryId?: string;
  categoryName?: string;
  isFavourite: boolean;
  /** True if any version uses local (uploaded) source. */
  hasLocalVersion: boolean;
};

export function buildLibraryDashboardRows(
  libraryItems: LibraryItem[],
  categoryNameById: Record<string, string> = {},
): LibraryDashboardRow[] {
  const pluginItems = libraryItems.filter((i) => i.type === 'plugin');
  const themeItems = libraryItems.filter((i) => i.type === 'theme');
  const pluginGroups = getPluginGroups(pluginItems);
  const rows: LibraryDashboardRow[] = [];

  for (const g of pluginGroups) {
    const first = g.items[0];
    const versionLabel = g.items.length > 1 ? `${g.items.length} versions` : String(first?.version ?? '');
    const libraryDocumentId = first?.libraryDocumentId ?? parseThemeDocId(first?.$id ?? '');
    const routeSlug = getLibraryItemSlug(first!).toLowerCase();
    const categoryId = first?.categoryId;
    const isFavourite = !!first?.isFavourite;
    const hasLocalVersion = g.items.some((i) => i.source === 'local');
    rows.push({
      id: `plugin:${g.slug}`,
      kind: 'plugin',
      name: decodeHtmlEntities(g.displayName),
      tags: tagsForGroup(g),
      versionLabel,
      author: first?.author || '—',
      libraryDocumentId,
      routeSlug,
      ...(categoryId ? { categoryId } : {}),
      ...(categoryId && categoryNameById[categoryId] ? { categoryName: categoryNameById[categoryId] } : {}),
      isFavourite,
      hasLocalVersion,
    });
  }

  for (const item of themeItems) {
    const libraryDocumentId = item.libraryDocumentId ?? parseThemeDocId(item.$id);
    const routeSlug = getLibraryItemSlug(item).toLowerCase();
    rows.push({
      id: `theme:${item.$id}`,
      kind: 'theme',
      name: decodeHtmlEntities(item.name),
      tags: tagsForThemeItem(item),
      versionLabel: item.version || '—',
      author: item.author || '—',
      libraryDocumentId,
      routeSlug,
      ...(item.categoryId ? { categoryId: item.categoryId } : {}),
      ...(item.categoryId && categoryNameById[item.categoryId]
        ? { categoryName: categoryNameById[item.categoryId] }
        : {}),
      isFavourite: !!item.isFavourite,
      hasLocalVersion: item.source === 'local',
    });
  }

  return rows;
}

function parseThemeDocId(itemId: string): string {
  const sep = '::';
  const idx = itemId.indexOf(sep);
  return idx > 0 ? itemId.slice(0, idx) : itemId;
}
