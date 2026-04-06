import { InstallVersionInfo, InstallVersionOption, LibraryItem, LibraryItemSource } from '../../types';
import type { WpPluginInfo } from '../../services/wordpress';
import { compareSemverLike } from './semverLike';

export function splitPluginItemsBySource(libraryItems: LibraryItem[]) {
  const officialItems = libraryItems.filter((i) => i.source === LibraryItemSource.Official);
  const localItems = libraryItems.filter((i) => i.source === LibraryItemSource.Local);
  const remoteItems = libraryItems.filter((i) => i.source === LibraryItemSource.Remote);
  /** First official row (legacy helpers); multiple WP.org pins are separate documents. */
  const officialItem = officialItems[0];
  return { officialItems, officialItem, localItems, remoteItems };
}

/** Build install dropdown options for a grouped plugin (same logic as LibraryPluginDetailView). */
export function buildInstallVersionOptionsForPluginItems(
  libraryItems: LibraryItem[],
  wpInfoVersion: string | undefined,
): InstallVersionOption[] {
  const { officialItems, localItems, remoteItems } = splitPluginItemsBySource(libraryItems);
  const opts: InstallVersionOption[] = [];
  officialItems.forEach((item) => {
    const v = item.version === 'latest' ? wpInfoVersion ?? 'latest' : item.version;
    opts.push({
      key: `official-${item.$id}`,
      label: `WordPress.org — ${v}`,
      info: { source: 'official', version: v },
    });
  });
  localItems.forEach((item) => {
    opts.push({
      key: `local-${item.$id}`,
      label: `Local upload — ${item.version}`,
      info: { source: 'local', version: item.version },
    });
  });
  remoteItems.forEach((item) => {
    if (item.remoteUrl) {
      opts.push({
        key: `remote-${item.$id}`,
        label: `Remote — ${item.version}`,
        info: { source: 'remote', version: item.version, remoteUrl: item.remoteUrl },
      });
    }
  });
  return opts;
}

/** Resolve default install payload from the library default version string and items. */
/** Default version label for a plugin group (mirrors LibraryPluginDetailView heuristics). */
export function pickDefaultVersionStringForPluginItems(
  libraryItems: LibraryItem[],
  wpInfo: WpPluginInfo | null,
  wpVersionList: string[],
): string {
  const { officialItems, localItems, remoteItems } = splitPluginItemsBySource(libraryItems);
  const explicit = libraryItems.filter((i) => i.isDefault === true);
  if (explicit.length === 1) {
    const it = explicit[0];
    if (it.source === LibraryItemSource.Official) {
      return it.version === 'latest' ? (wpInfo?.version ?? '').trim() : it.version;
    }
    return it.version;
  }
  if (officialItems.length > 0) {
    const wpLatest = (wpInfo?.version ?? '').trim();
    const resolved = officialItems
      .map((o) => (o.version === 'latest' ? wpLatest : o.version))
      .filter(Boolean);
    if (resolved.length > 0) {
      let best = resolved[0];
      for (const v of resolved) {
        if (compareSemverLike(v, best) > 0) best = v;
      }
      return best;
    }
    if (wpVersionList.length > 0) return wpVersionList[0];
  }
  if (localItems.length > 0) return localItems[0].version;
  if (remoteItems.length > 0) return remoteItems[0].version;
  return '';
}

export function resolveDefaultInstallInfoForPlugin(
  libraryItems: LibraryItem[],
  defaultVersion: string,
  wpInfo: WpPluginInfo | null,
  wpVersionList: string[],
): InstallVersionInfo | null {
  if (!defaultVersion) return null;
  const { officialItems, localItems, remoteItems } = splitPluginItemsBySource(libraryItems);
  const local = localItems.find((l) => l.version === defaultVersion);
  if (local) return { source: 'local', version: local.version };
  const remote = remoteItems.find((r) => r.version === defaultVersion);
  if (remote?.remoteUrl) return { source: 'remote', version: remote.version, remoteUrl: remote.remoteUrl };
  for (const o of officialItems) {
    const resolvedOfficial = o.version === 'latest' ? (wpInfo?.version ?? '').trim() : o.version;
    if (resolvedOfficial && defaultVersion === resolvedOfficial) {
      return { source: 'official', version: resolvedOfficial };
    }
  }
  if (wpVersionList.includes(defaultVersion)) {
    return { source: 'official', version: defaultVersion };
  }
  return null;
}
