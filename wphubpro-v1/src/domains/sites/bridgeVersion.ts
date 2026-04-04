import type { Site } from '../../types';
import { parseSitePluginsMeta } from './parsePluginsMeta';

const BRIDGE_SLUG = 'wphubpro-bridge';

/**
 * Installed WPHubPro Bridge version from the site document's `plugins_meta` JSON (bridge sync / fetch-site-meta).
 */
export function getBridgePluginVersionFromSite(site: Site): string | null {
  const list = parseSitePluginsMeta(site.pluginsMeta);
  for (const p of list) {
    if (p.plugin.includes(BRIDGE_SLUG)) {
      const v = p.version?.trim();
      return v || null;
    }
  }
  return null;
}
