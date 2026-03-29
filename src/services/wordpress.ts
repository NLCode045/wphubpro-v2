/** WordPress.org plugins API (public). */

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

const WP_ORG_EXCLUDED_SLUGS = ['wphubpro-bridge'];

function buildPluginInformationUrl(slug: string): string {
  const params = new URLSearchParams();
  params.set('action', 'plugin_information');
  params.set('request[slug]', slug);
  params.set('request[fields][versions]', '1');
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
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (!data || data.error) return null;
    const authorRaw = typeof data.author === 'string' ? data.author : '';
    const authorMatch = authorRaw.match(/<a\s+[^>]*href=["']([^"']+)["']/i);
    return {
      name: String(data.name ?? ''),
      slug: String(data.slug ?? trimmed),
      version: String(data.version ?? ''),
      author: authorRaw.replace(/<[^>]*>/g, '').trim(),
      authorUri: authorMatch?.[1] ?? (data.homepage as string | undefined),
      description: (data.sections as { description?: string } | undefined)?.description,
      homepage: data.homepage as string | undefined,
      requires: data.requires as string | undefined,
      tested: data.tested as string | undefined,
      requires_php: data.requires_php as string | undefined,
      download_link: data.download_link as string | undefined,
      versions:
        data.versions && typeof data.versions === 'object' && !Array.isArray(data.versions)
          ? (data.versions as Record<string, string>)
          : undefined,
    };
  } catch {
    return null;
  }
};

export const searchWpPlugins = async (searchTerm: string) => {
  if (!searchTerm) return [];
  const url = `${API_BASE}?action=query_plugins&request[search]=${encodeURIComponent(searchTerm)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`WordPress.org API returned status ${response.status}`);
  }
  const data = (await response.json()) as { plugins?: unknown[] };
  return data.plugins || [];
};

/** WordPress.org themes API (public). */
const THEMES_API_BASE = 'https://api.wordpress.org/themes/info/1.2/';

function themeAuthorToString(author: unknown): string {
  if (typeof author === 'string') return author.replace(/<[^>]*>/g, '').trim();
  if (author && typeof author === 'object') {
    const o = author as Record<string, unknown>;
    const raw = o.author ?? o.display_name ?? o.user_nicename ?? '';
    return String(raw).replace(/<[^>]*>/g, '').trim();
  }
  return '';
}

export type WpThemeSearchRow = {
  name: string;
  slug: string;
  version: string;
  author: string;
  short_description?: string;
};

export interface WpThemeInfo {
  name: string;
  slug: string;
  version: string;
  author: string;
  description?: string;
  homepage?: string;
  download_link?: string;
  versions?: Record<string, string>;
}

export const getWpThemeInfo = async (slug: string): Promise<WpThemeInfo | null> => {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  const params = new URLSearchParams();
  params.set('action', 'theme_information');
  params.set('request[slug]', trimmed);
  params.set('request[fields][versions]', '1');
  params.set('request[fields][sections]', '1');
  const url = `${THEMES_API_BASE}?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (!data || data.error) return null;
    const sections = data.sections as { description?: string } | undefined;
    const descRaw = sections?.description ?? '';
    const description =
      typeof descRaw === 'string'
        ? descRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        : undefined;
    return {
      name: String(data.name ?? trimmed),
      slug: String(data.slug ?? trimmed),
      version: String(data.version ?? ''),
      author: themeAuthorToString(data.author) || 'Unknown',
      homepage: typeof data.homepage === 'string' ? data.homepage : undefined,
      description: description || undefined,
      download_link: typeof data.download_link === 'string' ? data.download_link : undefined,
      versions:
        data.versions && typeof data.versions === 'object' && !Array.isArray(data.versions)
          ? (data.versions as Record<string, string>)
          : undefined,
    };
  } catch {
    return null;
  }
};

export const searchWpThemes = async (searchTerm: string): Promise<WpThemeSearchRow[]> => {
  if (!searchTerm) return [];
  const params = new URLSearchParams();
  params.set('action', 'query_themes');
  params.set('request[per_page]', '40');
  params.set('request[search]', searchTerm.trim());
  const url = `${THEMES_API_BASE}?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`WordPress.org themes API returned status ${response.status}`);
  }
  const data = (await response.json()) as { themes?: Record<string, unknown>[] };
  const themes = data.themes || [];
  const out: WpThemeSearchRow[] = [];
  for (const t of themes) {
    const s = String(t.slug ?? '').trim();
    if (!s) continue;
    const desc = typeof t.description === 'string' ? t.description : '';
    const row: WpThemeSearchRow = {
      name: String(t.name ?? s),
      slug: s,
      version: String(t.version ?? ''),
      author: themeAuthorToString(t.author),
    };
    if (desc) row.short_description = desc.slice(0, 500);
    out.push(row);
  }
  return out;
};
