import type {
  LibraryItem,
  LibraryItemSource,
  LibraryItemType,
  LibraryVersionEntry,
} from '@/types';

const COMPOSITE_SEP = '::';

export function normalizeWpSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function pickDefaultVersionKey(versions: Record<string, LibraryVersionEntry>): string | null {
  const keys = Object.keys(versions);
  if (!keys.length) return null;
  const def = keys.find((k) => versions[k].isDefault);
  return def ?? keys[0];
}

/** Encode version key for use in composite LibraryItem.$id (doc id is UUID, never contains ::). */
export function makeCompositeLibraryItemId(libraryDocumentId: string, versionKey: string): string {
  return `${libraryDocumentId}${COMPOSITE_SEP}${encodeURIComponent(versionKey)}`;
}

export function parseCompositeLibraryItemId(
  id: string,
): { libraryDocumentId: string; versionKey: string } | null {
  const idx = id.indexOf(COMPOSITE_SEP);
  if (idx <= 0) return null;
  const libraryDocumentId = id.slice(0, idx);
  const enc = id.slice(idx + COMPOSITE_SEP.length);
  try {
    const versionKey = decodeURIComponent(enc);
    return { libraryDocumentId, versionKey };
  } catch {
    return null;
  }
}

export function parseVersionsJson(raw: string | undefined | null): Record<string, LibraryVersionEntry> | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    const out: Record<string, LibraryVersionEntry> = {};
    for (const [k, v] of Object.entries(o)) {
      if (!k || !v || typeof v !== 'object') continue;
      const src = (v as { source?: string }).source;
      if (src !== 'official' && src !== 'local' && src !== 'remote') {
        continue;
      }
      out[k] = {
        source: src as LibraryItemSource,
        ...((v as { location?: string }).location != null && String((v as { location?: string }).location).trim()
          ? { location: String((v as { location?: string }).location).trim() }
          : {}),
        ...((v as { is_default?: boolean; isDefault?: boolean }).is_default === true ||
        (v as { isDefault?: boolean }).isDefault === true
          ? { isDefault: true }
          : {}),
      };
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

export function serializeVersionsJson(versions: Record<string, LibraryVersionEntry>): string {
  return JSON.stringify(versions);
}

function toLibraryItemSource(value: string): LibraryItemSource {
  if (value === 'local') return 'local';
  if (value === 'remote') return 'remote';
  return 'official';
}

function toLibraryItemType(value: string): LibraryItemType {
  return value === 'theme' ? 'theme' : 'plugin';
}

/** Build versions map from `versions_json` or legacy flat fields on one document. */
export function getOrBuildVersionsMap(doc: Record<string, unknown>): Record<string, LibraryVersionEntry> {
  const raw = doc.versions_json ?? doc.versionsJson;
  const p = parseVersionsJson(typeof raw === 'string' ? raw : null);
  if (p && Object.keys(p).length > 0) return { ...p };
  const v = doc.version != null ? String(doc.version) : '';
  if (!v) return {};
  const source = toLibraryItemSource(String(doc.source ?? 'official'));
  const loc =
    String(doc.s3Path || doc.s3_path || doc.s3_key || '').trim() ||
    String(doc.remoteUrl || doc.remote_url || '').trim() ||
    undefined;
  return {
    [v]: {
      source,
      ...(loc ? { location: loc } : {}),
      isDefault: true,
    },
  };
}

/** One Appwrite row → one or many LibraryItems (multi-version documents expand). */
export function expandLibraryDocumentToItems(doc: Record<string, unknown>): LibraryItem[] {
  const userId = String(doc.userId || doc.user_id || '');
  const rawTags = doc.tags;
  const tags = Array.isArray(rawTags)
    ? rawTags.map((t: unknown) => String(t).trim()).filter(Boolean)
    : undefined;
  const name = String(doc.name ?? '');
  const author = String(doc.author ?? '');
  const description = String(doc.description ?? '');
  const type = toLibraryItemType(String(doc.type ?? 'plugin'));
  const wpSlug = (doc.wpSlug || doc.wp_slug) as string | undefined;
  const categoryIdRaw = doc.category_id ?? doc.categoryId;
  const categoryId =
    categoryIdRaw != null && String(categoryIdRaw).trim() ? String(categoryIdRaw).trim() : undefined;
  const isFavourite =
    doc.is_favourite === true || doc.isFavourite === true || doc.is_favourite === 'true';

  const versionsJsonRaw =
    typeof doc.versions_json === 'string'
      ? doc.versions_json
      : typeof doc.versionsJson === 'string'
        ? doc.versionsJson
        : null;
  const parsed = parseVersionsJson(versionsJsonRaw);

  if (parsed && Object.keys(parsed).length > 0) {
    const items: LibraryItem[] = [];
    for (const [versionKey, entry] of Object.entries(parsed)) {
      const id = makeCompositeLibraryItemId(String(doc.$id), versionKey);
      const source = entry.source;
      let s3Path: string | undefined;
      let remoteUrl: string | undefined;
      const loc = entry.location?.trim();
      if (loc) {
        if (source === 'local') s3Path = loc;
        if (source === 'remote') remoteUrl = loc;
      }
      items.push({
        $id: id,
        userId,
        name,
        type,
        source,
        version: versionKey,
        author,
        description,
        ...(wpSlug ? { wpSlug } : {}),
        ...(s3Path ? { s3Path } : {}),
        ...(remoteUrl ? { remoteUrl } : {}),
        ...(tags && tags.length > 0 ? { tags } : {}),
        ...(entry.isDefault === true ? { isDefault: true } : {}),
        libraryDocumentId: String(doc.$id),
        versionKey,
        ...(categoryId ? { categoryId } : {}),
        ...(isFavourite ? { isFavourite: true } : {}),
      });
    }
    return items;
  }

  return [
    {
      $id: String(doc.$id),
      userId,
      name,
      type,
      source: toLibraryItemSource(String(doc.source ?? 'official')),
      version: String(doc.version ?? ''),
      author,
      description,
      libraryDocumentId: String(doc.$id),
      ...(doc.s3Path || doc.s3_path || doc.s3_key ? { s3Path: String(doc.s3Path || doc.s3_path || doc.s3_key) } : {}),
      ...(wpSlug ? { wpSlug } : {}),
      ...(doc.remoteUrl || doc.remote_url ? { remoteUrl: String(doc.remoteUrl || doc.remote_url) } : {}),
      ...(tags && tags.length > 0 ? { tags } : {}),
      ...(doc.isDefault === true || doc.is_default === true ? { isDefault: true } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(isFavourite ? { isFavourite: true } : {}),
    },
  ];
}

/** First expanded row; prefer `expandLibraryDocumentToItems` for multi-version docs. */
export function mapLibraryDocumentToItem(doc: Record<string, unknown>): LibraryItem {
  const items = expandLibraryDocumentToItems(doc);
  return items[0] as LibraryItem;
}

/** Ensure exactly one version has isDefault in the map (optional explicit defaultVersionKey). */
export function setDefaultVersionInMap(
  versions: Record<string, LibraryVersionEntry>,
  defaultVersionKey: string,
): Record<string, LibraryVersionEntry> {
  const next: Record<string, LibraryVersionEntry> = {};
  for (const [k, v] of Object.entries(versions)) {
    next[k] = { ...v, isDefault: k === defaultVersionKey };
  }
  return next;
}

/** Top-level legacy fields Appwrite still expects for older indexes / UI. */
export function mirrorLegacyFieldsFromVersions(versions: Record<string, LibraryVersionEntry>): {
  version: string;
  source: LibraryItemSource;
  is_default: boolean;
} {
  const key = pickDefaultVersionKey(versions);
  if (!key) return { version: '', source: 'official', is_default: false };
  const e = versions[key];
  return { version: key, source: e.source, is_default: !!e.isDefault };
}
