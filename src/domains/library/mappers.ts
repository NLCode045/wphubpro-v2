import type {
  LibraryCollection,
  LibraryCollectionMember,
  LibraryCollectionVersionMode,
  LibraryFamily,
  LibraryFamilyMemberPreference,
  LibraryItemType,
} from '@/types';

const toCollectionMember = (raw: Record<string, unknown>): LibraryCollectionMember | null => {
  const slug = String(raw.slug ?? '').trim().toLowerCase();
  if (!slug) return null;
  const typeStr = String(raw.type ?? 'plugin');
  const type: LibraryItemType = typeStr === 'theme' ? 'theme' : 'plugin';
  const vm = raw.versionMode === 'manual' ? 'manual' : 'default';
  const manualVersionKey =
    typeof raw.manualVersionKey === 'string' && raw.manualVersionKey.trim()
      ? raw.manualVersionKey.trim()
      : undefined;
  return {
    slug,
    type,
    versionMode: vm as LibraryCollectionVersionMode,
    ...(manualVersionKey ? { manualVersionKey } : {}),
  };
};

export const parseLibraryCollectionItemsJson = (json: string | undefined | null): LibraryCollectionMember[] => {
  if (!json || typeof json !== 'string') return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: LibraryCollectionMember[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue;
      const m = toCollectionMember(row as Record<string, unknown>);
      if (m) out.push(m);
    }
    return out;
  } catch {
    return [];
  }
};

export const serializeLibraryCollectionItems = (items: LibraryCollectionMember[]): string => {
  return JSON.stringify(items);
};

function parseMemberPreferencesJson(raw: unknown): Record<string, LibraryFamilyMemberPreference> | undefined {
  if (raw == null || raw === '') return undefined;
  const str = typeof raw === 'string' ? raw : String(raw);
  try {
    const parsed = JSON.parse(str) as unknown;
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const out: Record<string, LibraryFamilyMemberPreference> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const slug = k.trim().toLowerCase();
      if (!slug) continue;
      if (
        v &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        typeof (v as { versionKey?: unknown }).versionKey === 'string'
      ) {
        out[slug] = { versionKey: String((v as { versionKey: string }).versionKey) };
      }
    }
    return Object.keys(out).length ? out : undefined;
  } catch {
    return undefined;
  }
}

export const mapLibraryFamilyDocument = (doc: Record<string, unknown>): LibraryFamily => {
  const raw = doc.member_slugs ?? doc.memberSlugs;
  const memberSlugs = Array.isArray(raw)
    ? raw.map((s: unknown) => String(s).trim().toLowerCase()).filter(Boolean)
    : [];
  const prefsRaw = doc.member_preferences_json ?? doc.memberPreferencesJson;
  const memberPreferences = parseMemberPreferencesJson(prefsRaw);
  return {
    $id: String(doc.$id),
    userId: String(doc.userId || doc.user_id || ''),
    ...(doc.name != null && String(doc.name).trim() ? { name: String(doc.name).trim() } : {}),
    memberSlugs,
    ...(memberPreferences ? { memberPreferences } : {}),
  };
};

export const mapLibraryCollectionDocument = (doc: Record<string, unknown>): LibraryCollection => {
  const itemsJson = doc.items_json ?? doc.itemsJson ?? '[]';
  return {
    $id: String(doc.$id),
    userId: String(doc.userId || doc.user_id || ''),
    name: String(doc.name ?? '').trim() || 'Collection',
    items: parseLibraryCollectionItemsJson(typeof itemsJson === 'string' ? itemsJson : '[]'),
  };
};
