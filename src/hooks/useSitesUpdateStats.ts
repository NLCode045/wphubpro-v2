import { hasUpdate, parsePluginsMeta, parseThemesMeta } from '@/domains/sites/installedMeta';

export interface PluginUpdateSite {
  siteId: string;
  siteName: string;
  installedVersion: string;
  pluginFile: string;
}

export interface AggregatedPluginUpdate {
  pluginSlug: string;
  name: string;
  latestVersion: string;
  releaseDate: string | null;
  sites: PluginUpdateSite[];
}

export interface SitesUpdateStats {
  sitesNeedingUpdatesCount: number;
  pluginUpdatesCount: number;
  pluginTotalCount: number;
  themeUpdatesCount: number;
  themeTotalCount: number;
  pluginUpdatesList: AggregatedPluginUpdate[];
  isLoading: boolean;
}

/** Aggregate update stats from sites.pluginsMeta and sites.themesMeta (synced by bridge). */
export const useSitesUpdateStats = (
  sites: {
    $id: string;
    status: string;
    pluginsMeta?: string;
    themesMeta?: string;
    siteName?: string;
  }[],
  options?: { isLoading?: boolean }
): SitesUpdateStats => {
  let pluginUpdatesCount = 0;
  let pluginTotalCount = 0;
  let themeUpdatesCount = 0;
  let themeTotalCount = 0;
  let sitesNeedingUpdatesCount = 0;
  const pluginUpdatesMap = new Map<string, AggregatedPluginUpdate>();
  const connectedSites = sites.filter((s) => s.status === 'connected');

  for (const site of connectedSites) {
    const siteId = site.$id;
    const siteName = site.siteName ?? siteId;
    const plugins = parsePluginsMeta(site.pluginsMeta);
    const themes = parseThemesMeta(site.themesMeta);
    const pluginUpdates = plugins.filter(hasUpdate).length;
    const themeUpdates = themes.filter(hasUpdate).length;
    pluginUpdatesCount += pluginUpdates;
    pluginTotalCount += plugins.length;
    themeUpdatesCount += themeUpdates;
    themeTotalCount += themes.length;
    if (pluginUpdates > 0 || themeUpdates > 0) {
      sitesNeedingUpdatesCount++;
    }

    for (const p of plugins) {
      if (!hasUpdate(p)) continue;
      const slug = p.plugin;
      const upd = p.update as { new_version?: string; last_updated?: string } | null;
      const latestVersion = upd && typeof upd === 'object' ? (upd.new_version ?? '') : String(p.update ?? '');
      const releaseDate = upd && typeof upd === 'object' && upd.last_updated ? upd.last_updated : null;
      const entry = pluginUpdatesMap.get(slug);
      const siteEntry: PluginUpdateSite = {
        siteId,
        siteName,
        installedVersion: p.version ?? '',
        pluginFile: p.plugin ?? slug,
      };
      if (entry) {
        entry.sites.push(siteEntry);
      } else {
        pluginUpdatesMap.set(slug, {
          pluginSlug: slug,
          name: p.name ?? slug,
          latestVersion,
          releaseDate,
          sites: [siteEntry],
        });
      }
    }
  }

  const pluginUpdatesList = Array.from(pluginUpdatesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    sitesNeedingUpdatesCount,
    pluginUpdatesCount,
    pluginTotalCount,
    themeUpdatesCount,
    themeTotalCount,
    pluginUpdatesList,
    isLoading: options?.isLoading ?? false,
  };
};
