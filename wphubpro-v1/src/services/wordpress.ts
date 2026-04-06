
// This file will contain functions for interacting with the public WordPress.org API.

const API_BASE = 'https://api.wordpress.org/plugins/info/1.2/';

export interface WpPluginInfo {
  name: string;
  slug: string;
  version: string;
  author: string;
  authorUri?: string;
  description?: string;
  homepage?: string;
  requires?: string;
  tested?: string;
  requires_php?: string;
  download_link?: string;
  versions?: Record<string, string>;
}

/** Plugins not on WordPress.org (e.g. WPHubPro Bridge) – skip API call to avoid 404. */
const WP_ORG_EXCLUDED_SLUGS = ['wphubpro-bridge'];

function buildPluginInformationUrl(slug: string): string {
  const params = new URLSearchParams();
  params.set('action', 'plugin_information');
  params.set('request[slug]', slug);
  params.set('request[fields][versions]', '1');
  /** `sections` includes long description; `description` as a field flag is not valid for all API paths and can confuse caches. */
  params.set('request[fields][sections]', '1');
  return `${API_BASE}?${params.toString()}`;
}

export const getWpPluginInfo = async (slug: string): Promise<WpPluginInfo | null> => {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  if (WP_ORG_EXCLUDED_SLUGS.includes(trimmed.toLowerCase())) return null;
  const url = buildPluginInformationUrl(trimmed);
  try {
    const res = await fetch(url);
    /** Unknown slug → 404 JSON; local-only plugins are expected. */
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;
    const authorRaw = typeof data.author === 'string' ? data.author : '';
    const authorMatch = authorRaw.match(/<a\s+[^>]*href=["']([^"']+)["']/i);
    return {
      name: data.name ?? '',
      slug: data.slug ?? trimmed,
      version: data.version ?? '',
      author: authorRaw.replace(/<[^>]*>/g, '').trim(),
      authorUri: authorMatch?.[1] ?? data.homepage,
      description: data.sections?.description,
      homepage: data.homepage,
      requires: data.requires,
      tested: data.tested,
      requires_php: data.requires_php,
      download_link: data.download_link,
      versions: data.versions && typeof data.versions === 'object' ? data.versions : undefined,
    };
  } catch {
    return null;
  }
};

export const searchWpPlugins = async (searchTerm: string) => {
    if (!searchTerm) return [];

    const url = `${API_BASE}?action=query_plugins&request[search]=${encodeURIComponent(searchTerm)}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`WordPress.org API returned status ${response.status}`);
        }
        const data = await response.json();
        return data.plugins || [];
    } catch (error) {
        console.error("Failed to search WordPress plugins:", error);
        throw error;
    }
};