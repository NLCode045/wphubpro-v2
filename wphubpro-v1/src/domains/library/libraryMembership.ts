import {
  LibraryCollection,
  LibraryFamily,
  LibraryFamilyMemberPreference,
  LibraryItem,
  LibraryItemSource,
  LibraryItemType,
} from '../../types';
import { getLibraryItemSlug } from './libraryItemSlug';
import { getPluginSlug } from './libraryPluginGroups';

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

/** True when no other library row shares the same canonical slug + type (after removing `item`). */
export function isLastLibraryRowForSlugAndType(item: LibraryItem, allItems: LibraryItem[]): boolean {
  const slug = getLibraryItemSlug(item);
  const type = item.type;
  return !allItems.some(
    (i) =>
      i.$id !== item.$id && getLibraryItemSlug(i) === slug && i.type === type,
  );
}

/** True when deleting `itemsBeingDeleted` removes the last library row for that slug + type. */
export function willDeleteRemoveLastSlugTypeRow(
  itemsBeingDeleted: LibraryItem[],
  slug: string,
  type: LibraryItemType,
  allItems: LibraryItem[],
): boolean {
  const s = slug.trim().toLowerCase();
  const removing = new Set(itemsBeingDeleted.map((i) => i.$id));
  const remaining = allItems.filter(
    (i) => i.type === type && getLibraryItemSlug(i) === s && !removing.has(i.$id),
  );
  return remaining.length === 0;
}

function sourceLabelSingle(item: LibraryItem): string {
  if (item.source === LibraryItemSource.Remote) return 'Remote URL';
  if (item.source === LibraryItemSource.Local) return 'Local';
  return 'Official';
}

/** Representative row for a member slug (prefer official source). */
export function pickRepresentativeItemForSlug(
  slug: string,
  libraryItems: LibraryItem[],
): LibraryItem | null {
  const s = slug.trim().toLowerCase();
  const matches = libraryItems.filter((i) => getLibraryItemSlug(i) === s);
  if (matches.length === 0) return null;
  const official = matches.find((i) => i.source === LibraryItemSource.Official);
  return official ?? matches[0];
}

export function memberVersionAndSourceLabels(
  slug: string,
  libraryItems: LibraryItem[],
): { version: string; source: string } {
  const item = pickRepresentativeItemForSlug(slug, libraryItems);
  if (!item) return { version: '—', source: 'Not in library' };
  return { version: item.version || '—', source: sourceLabelSingle(item) };
}

function tokenizeFamilyName(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

export type PotentialFamilyMemberRow = {
  slug: string;
  displayName: string;
  matchHint: string;
};

/** Library items whose plugin name or slug matches family name tokens (for pick list). */
export function listPotentialFamilyMembers(
  familyName: string,
  libraryItems: LibraryItem[],
  currentMemberSlugs: string[],
): PotentialFamilyMemberRow[] {
  const tokens = tokenizeFamilyName(familyName);
  if (tokens.length === 0) return [];
  const exclude = new Set(currentMemberSlugs.map((x) => x.toLowerCase()));
  const scored: { slug: string; score: number; displayName: string; hint: string }[] = [];
  const seen = new Set<string>();
  for (const item of libraryItems) {
    const slug = getLibraryItemSlug(item);
    if (exclude.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    const rawName = (item.name || '').toLowerCase();
    const nameSlug = slug.toLowerCase();
    const hints: string[] = [];
    let score = 0;
    for (const t of tokens) {
      if (nameSlug.includes(t)) {
        score += 2;
        hints.push(`slug “${t}”`);
      }
      if (rawName.includes(t)) {
        score += 1;
        if (!hints.some((h) => h.includes('name'))) hints.push(`name “${t}”`);
      }
    }
    if (score > 0) {
      const displayName = (item.name || '').replace(/<[^>]+>/g, '') || slug;
      scored.push({
        slug,
        score,
        displayName,
        hint: hints.length ? hints.join(' · ') : 'match',
      });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
  return scored.slice(0, 48).map((x) => ({
    slug: x.slug,
    displayName: x.displayName,
    matchHint: x.hint,
  }));
}

/** Suggest library slugs that plausibly belong in this family (by name tokens). */
export function suggestFamilyMemberSlugs(
  familyName: string,
  libraryItems: LibraryItem[],
  currentMemberSlugs: string[],
): string[] {
  return listPotentialFamilyMembers(familyName, libraryItems, currentMemberSlugs)
    .slice(0, 12)
    .map((r) => r.slug);
}

/** Drop preference entries when slugs are removed from the family. */
export function pruneFamilyMemberPreferences(
  prefs: Record<string, LibraryFamilyMemberPreference> | undefined,
  memberSlugs: string[],
): Record<string, LibraryFamilyMemberPreference> {
  const allowed = new Set(memberSlugs.map((s) => s.trim().toLowerCase()));
  const out: Record<string, LibraryFamilyMemberPreference> = {};
  if (!prefs) return out;
  for (const [k, v] of Object.entries(prefs)) {
    const key = k.trim().toLowerCase();
    if (allowed.has(key)) out[key] = v;
  }
  return out;
}

/** Query string for Library page deep-link (plugin detail or theme row focus). */
export function libraryQueryForMemberSlug(slug: string, libraryItems: LibraryItem[]): string {
  const s = slug.trim().toLowerCase();
  const plugin = libraryItems.find(
    (i) => i.type === LibraryItemType.Plugin && getLibraryItemSlug(i) === s,
  );
  if (plugin) {
    return `plugin=${encodeURIComponent(getPluginSlug(plugin))}`;
  }
  const theme = libraryItems.find(
    (i) => i.type === LibraryItemType.Theme && getLibraryItemSlug(i) === s,
  );
  if (theme) {
    return `themeFocus=${encodeURIComponent(theme.$id)}`;
  }
  return '';
}

export function buildMembershipDeleteWarningLines(
  slug: string,
  type: LibraryItemType,
  families: LibraryFamily[],
  collections: LibraryCollection[],
): string[] {
  const fams = filterFamiliesContainingSlug(families, slug);
  const colls = filterCollectionsContainingSlug(collections, slug, type);
  const lines: string[] = [];
  if (fams.length) {
    lines.push(
      `Families: ${fams.map((f) => f.name?.trim() || f.memberSlugs.join(', ') || 'Untitled').join(', ')}`,
    );
  }
  if (colls.length) {
    lines.push(`Collections: ${colls.map((c) => c.name).join(', ')}`);
  }
  return lines;
}
