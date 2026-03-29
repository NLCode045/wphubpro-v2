import type { WordPressPlugin, WordPressTheme } from '@/types';

export function hasUpdate(p: { update?: string | { new_version?: string } | null }): boolean {
  if (p.update == null) return false;
  if (typeof p.update === 'object') return !!(p.update.new_version && String(p.update.new_version).trim());
  return String(p.update).trim() !== '';
}

export function parsePluginsMeta(meta: string | undefined): WordPressPlugin[] {
  if (!meta || typeof meta !== 'string') return [];
  try {
    const arr = JSON.parse(meta) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.map((p: Record<string, unknown>) => {
      const isActive = p.active === true || p.active === 1 || p.status === 'active';
      const file = String(p.file ?? p.plugin ?? '');
      return {
        plugin: file,
        name: String(p.name ?? ''),
        version: String(p.version ?? ''),
        status: (isActive ? 'active' : 'inactive') as 'active' | 'inactive',
        update: (p.update ?? null) as string | null,
        author: p.author != null ? String(p.author) : undefined,
        description: p.description != null ? String(p.description) : undefined,
      };
    });
  } catch {
    return [];
  }
}

export function parseThemesMeta(meta: string | undefined): WordPressTheme[] {
  if (!meta || typeof meta !== 'string') return [];
  try {
    const arr = JSON.parse(meta) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.map((t: Record<string, unknown>) => ({
      stylesheet: String(t.stylesheet ?? t.file ?? t.slug ?? ''),
      name: String(t.name ?? ''),
      version: String(t.version ?? ''),
      status: (t.active ? 'active' : 'inactive') as 'active' | 'inactive',
      update: (t.update ?? null) as string | null,
    }));
  } catch {
    return [];
  }
}
