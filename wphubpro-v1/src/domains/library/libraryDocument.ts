import {
  LibraryItem,
  LibraryItemSource,
  LibraryItemType,
  LibraryVersionEntry,
} from '../../types';

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
      const src = (v as any).source;
      if (src !== LibraryItemSource.Official && src !== LibraryItemSource.Local && src !== LibraryItemSource.Remote) {
        continue;
      }
      out[k] = {
        source: src as LibraryItemSource,
        ...((v as any).location != null && String((v as any).location).trim()
          ? { location: String((v as any).location).trim() }
          : {}),
        ...((v as any).is_default === true || (v as any).isDefault === true ? { isDefault: true } : {}),
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
  if (value === LibraryItemSource.Local) return LibraryItemSource.Local;
  if (value === LibraryItemSource.Remote) return LibraryItemSource.Remote;
  return LibraryItemSource.Official;
}

function toLibraryItemType(value: string): LibraryItemType {
  return value === LibraryItemType.Theme ? LibraryItemType.Theme : LibraryItemType.Plugin;
}

/** Build versions map from `versions_json` or legacy flat fields on one document. */
export function getOrBuildVersionsMap(doc: Record<string, any>): Record<string, LibraryVersionEntry> {
  const raw = doc.versions_json ?? doc.versionsJson;
  const p = parseVersionsJson(typeof raw === 'string' ? raw : null);
  if (p && Object.keys(p).length > 0) return { ...p };
  const v = doc.version != null ? String(doc.version) : '';
  if (!v) return {};
  const source = toLibraryItemSource(String(doc.source ?? 'official'));
  const loc =
    (doc.s3Path || doc.s3_path || doc.s3_key || '').trim() ||
    (doc.remoteUrl || doc.remote_url || '').trim() ||
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
export function expandLibraryDocumentToItems(doc: Record<string, any>): LibraryItem[] {
  const userId = doc.userId || doc.user_id || '';
  const rawTags = doc.tags;
  const tags = Array.isArray(rawTags)
    ? rawTags.map((t: unknown) => String(t).trim()).filter(Boolean)
    : undefined;
  const name = String(doc.name ?? '');
  const author = String(doc.author ?? '');
  const description = String(doc.description ?? '');
  const type = toLibraryItemType(String(doc.type ?? 'plugin'));
  const wpSlug = doc.wpSlug || doc.wp_slug || undefined;

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
      const id = makeCompositeLibraryItemId(doc.$id, versionKey);
      const source = entry.source;
      let s3Path: string | undefined;
      let remoteUrl: string | undefined;
      const loc = entry.location?.trim();
      if (loc) {
        if (source === LibraryItemSource.Local) s3Path = loc;
        if (source === LibraryItemSource.Remote) remoteUrl = loc;
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
        libraryDocumentId: doc.$id,
        versionKey,
      });
    }
    return items;
  }

  // Legacy: single row per version (no versions_json)
  return [
    {
      $id: doc.$id,
      userId,
      name,
      type,
      source: toLibraryItemSource(String(doc.source ?? 'official')),
      version: String(doc.version ?? ''),
      author,
      description,
      ...(doc.s3Path || doc.s3_path || doc.s3_key ? { s3Path: doc.s3Path || doc.s3_path || doc.s3_key } : {}),
      ...(wpSlug ? { wpSlug } : {}),
      ...(doc.remoteUrl || doc.remote_url ? { remoteUrl: doc.remoteUrl || doc.remote_url } : {}),
      ...(tags && tags.length > 0 ? { tags } : {}),
      ...(doc.isDefault === true || doc.is_default === true ? { isDefault: true } : {}),
    },
  ];
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
  if (!key) return { version: '', source: LibraryItemSource.Official, is_default: false };
  const e = versions[key];
  return { version: key, source: e.source, is_default: !!e.isDefault };
}
