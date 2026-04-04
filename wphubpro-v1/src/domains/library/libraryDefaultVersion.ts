import type { WpPluginInfo } from '../../services/wordpress';
import { LibraryItem, LibraryItemSource, LibraryItemType } from '../../types';
import { pickDefaultVersionStringForPluginItems, splitPluginItemsBySource } from './buildPluginInstallOptions';
import { compareSemverLike } from './semverLike';

export { compareSemverLike } from './semverLike';

/**
 * True when the library’s default for this plugin should be refreshed:
 * official row is "latest", or pinned below WordPress.org latest; or only local/remote and WP.org has a newer stable.
 */
export function pluginGroupNeedsLibraryDefaultUpdate(
  items: LibraryItem[],
  wpInfo: WpPluginInfo | null | undefined,
): boolean {
  if (!items.length || items[0].type !== LibraryItemType.Plugin) return false;
  const wpLatest = (wpInfo?.version ?? '').trim();
  if (!wpLatest) return false;

  const { officialItems, localItems, remoteItems } = splitPluginItemsBySource(items);

  if (officialItems.length > 0) {
    for (const o of officialItems) {
      if (o.version === 'latest') return true;
      if (compareSemverLike(o.version, wpLatest) < 0) return true;
    }
    return false;
  }

  if (localItems.length > 0 && remoteItems.length === 0) {
    const localV = localItems.reduce<string>((best, i) => {
      if (!best) return i.version;
      return compareSemverLike(i.version, best) > 0 ? i.version : best;
    }, '');
    if (localV && compareSemverLike(localV, wpLatest) < 0) return true;
  }

  if (remoteItems.length > 0 && officialItems.length === 0) {
    const rv = remoteItems.reduce<string>((best, i) => {
      if (!best) return i.version;
      return compareSemverLike(i.version, best) > 0 ? i.version : best;
    }, '');
    if (rv && compareSemverLike(rv, wpLatest) < 0) return true;
  }

  return false;
}

/** All official (WordPress.org) plugin rows for this slug group. */
export function findOfficialItemsForPluginGroup(items: LibraryItem[]): LibraryItem[] {
  return items.filter((i) => i.source === LibraryItemSource.Official && i.type === LibraryItemType.Plugin);
}

/** First official row (legacy); prefer `findOfficialItemsForPluginGroup` when multiple pins exist. */
export function findOfficialItemForPluginGroup(items: LibraryItem[]): LibraryItem | undefined {
  return findOfficialItemsForPluginGroup(items)[0];
}

export function wpVersionKeysFromInfo(wp: WpPluginInfo | null | undefined): string[] {
  if (!wp?.versions || typeof wp.versions !== 'object') return [];
  return Object.keys(wp.versions).filter((v) => v !== 'trunk');
}

/**
 * True when the effective library default for this plugin is older than WordPress.org latest
 * (only for groups that include at least one official row).
 */
export function pluginDefaultIsBehindWpOrg(
  items: LibraryItem[],
  wpInfo: WpPluginInfo | null | undefined,
): boolean {
  if (!items.length || items[0].type !== LibraryItemType.Plugin) return false;
  const wpLatest = (wpInfo?.version ?? '').trim();
  if (!wpLatest) return false;
  const { officialItems } = splitPluginItemsBySource(items);
  if (officialItems.length === 0) return false;
  const explicit = items.find((i) => i.isDefault === true);
  if (explicit && explicit.source !== LibraryItemSource.Official) return false;
  const wpVersionList = wpVersionKeysFromInfo(wpInfo ?? null);
  const effective = pickDefaultVersionStringForPluginItems(items, wpInfo ?? null, wpVersionList);
  if (!effective) return false;
  return compareSemverLike(effective, wpLatest) < 0;
}
