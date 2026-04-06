import {
  InstallVersionInfo,
  InstallVersionOption,
  LibraryFamilyMemberPreference,
  LibraryItem,
  LibraryItemSource,
  LibraryItemType,
} from '../../types';
import { buildInstallVersionOptionsForPluginItems } from './buildPluginInstallOptions';
import { getLibraryItemSlug } from './libraryItemSlug';

function themeItemToInstallOption(item: LibraryItem): InstallVersionOption {
  let info: InstallVersionInfo;
  if (item.source === LibraryItemSource.Official) {
    info = { source: 'official', version: item.version };
  } else if (item.source === LibraryItemSource.Remote && item.remoteUrl) {
    info = { source: 'remote', version: item.version, remoteUrl: item.remoteUrl };
  } else {
    info = { source: 'local', version: item.version };
  }
  const src =
    item.source === LibraryItemSource.Official
      ? 'WordPress.org'
      : item.source === LibraryItemSource.Remote
        ? 'Remote'
        : 'Uploaded';
  return {
    key: `theme-${item.$id}`,
    label: `${src} — ${item.version}`,
    info,
  };
}

/** Install rows for one family member slug (plugin or theme), aligned with library plugin version keys. */
export function getInstallOptionsForFamilyMemberSlug(
  slug: string,
  libraryItems: LibraryItem[],
  wpInfoVersion: string | undefined,
): InstallVersionOption[] {
  const s = slug.trim().toLowerCase();
  const items = libraryItems.filter((i) => getLibraryItemSlug(i) === s);
  if (items.length === 0) return [];
  if (items[0].type === LibraryItemType.Plugin) {
    return buildInstallVersionOptionsForPluginItems(items, wpInfoVersion);
  }
  return items.map((item) => themeItemToInstallOption(item));
}

/** Drop duplicate `key` values (MUI Select breaks with duplicate MenuItem values). */
export function dedupeInstallOptionsByKey(options: InstallVersionOption[]): InstallVersionOption[] {
  const seen = new Set<string>();
  const out: InstallVersionOption[] = [];
  for (const o of options) {
    if (!o.key || seen.has(o.key)) continue;
    seen.add(o.key);
    out.push(o);
  }
  return out;
}

/**
 * Controlled Select value for family member row: never "" when `options` is non-empty (avoids MUI onEmpty loop).
 */
export function familyMemberSelectValue(options: InstallVersionOption[], resolved: string): string {
  const deduped = dedupeInstallOptionsByKey(options);
  if (deduped.length === 0) return '';
  if (resolved && deduped.some((o) => o.key === resolved)) return resolved;
  return deduped[0].key;
}

/** Pick version key for UI: saved preference, else library default row, else first option. */
export function defaultVersionKeyForFamilyMember(
  slug: string,
  libraryItems: LibraryItem[],
  prefs: Record<string, LibraryFamilyMemberPreference> | undefined,
  options: InstallVersionOption[],
): string {
  const opts = dedupeInstallOptionsByKey(options);
  const s = slug.trim().toLowerCase();
  const stored = prefs?.[s]?.versionKey;
  if (stored && opts.some((o) => o.key === stored)) return stored;

  const items = libraryItems.filter((i) => getLibraryItemSlug(i) === s);
  const explicit = items.find((i) => i.isDefault === true);
  if (explicit) {
    let key: string;
    if (explicit.type === LibraryItemType.Plugin) {
      if (explicit.source === LibraryItemSource.Official) key = `official-${explicit.$id}`;
      else if (explicit.source === LibraryItemSource.Local) key = `local-${explicit.$id}`;
      else key = `remote-${explicit.$id}`;
    } else {
      key = `theme-${explicit.$id}`;
    }
    if (opts.some((o) => o.key === key)) return key;
  }
  const first = opts.find((o) => o.key)?.key;
  return first ?? '';
}
