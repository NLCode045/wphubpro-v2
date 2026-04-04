/**
 * Parse site.pluginsMeta JSON (bridge format) for library filters and plugin matching.
 */

export interface ParsedSitePlugin {
  plugin: string;
  version: string;
  update: string | null;
}

export function parseSitePluginsMeta(meta: string | undefined): ParsedSitePlugin[] {
  if (!meta || typeof meta !== 'string') return [];
  try {
    const arr = JSON.parse(meta);
    if (!Array.isArray(arr)) return [];
    return arr.map((p: { file?: string; plugin?: string; version?: string; update?: string | null }) => ({
      plugin: p.file ?? p.plugin ?? '',
      version: p.version ?? '',
      update: p.update ?? null,
    }));
  } catch {
    return [];
  }
}

export function slugFromPluginFile(pluginFile: string): string {
  if (!pluginFile || !pluginFile.includes('/')) return '';
  return pluginFile.split('/')[0];
}

export function sitePluginEntryHasUpdate(p: ParsedSitePlugin): boolean {
  if (p.update == null) return false;
  if (typeof p.update === 'object') {
    const o = p.update as { new_version?: string };
    return !!(o?.new_version && String(o.new_version).trim());
  }
  return String(p.update).trim() !== '';
}

/** One theme row from site.themes_meta (bridge JSON). */
export interface ParsedSiteTheme {
  stylesheet: string;
  name: string;
  version: string;
  update?: string | null;
}

export function parseSiteThemesMeta(meta: string | undefined): ParsedSiteTheme[] {
  if (!meta || typeof meta !== 'string') return [];
  try {
    const arr = JSON.parse(meta);
    if (!Array.isArray(arr)) return [];
    return arr.map(
      (t: {
        stylesheet?: string;
        file?: string;
        slug?: string;
        name?: string;
        version?: string;
        update?: string | null;
      }) => ({
        stylesheet: String(t.stylesheet ?? t.file ?? t.slug ?? '').trim(),
        name: String(t.name ?? ''),
        version: String(t.version ?? ''),
        update: t.update ?? null,
      }),
    );
  } catch {
    return [];
  }
}

export function siteThemeEntryHasUpdate(t: ParsedSiteTheme): boolean {
  if (t.update == null) return false;
  if (typeof t.update === 'object') {
    const o = t.update as { new_version?: string };
    return !!(o?.new_version && String(o.new_version).trim());
  }
  return String(t.update).trim() !== '';
}
