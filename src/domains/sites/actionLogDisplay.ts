import type { ActionLogEntry } from '@/types';

export type ActionAuditLine = {
  id: string;
  atMs: number;
  dateTime: string;
  extensionName: string;
  kind: 'plugin' | 'theme';
  actionLabel: string;
  failed: boolean;
};

function formatActionTimestamp(ts: number | string): string {
  if (typeof ts === 'number') {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString();
  }
  if (typeof ts === 'string' && ts.trim()) {
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  return '—';
}

function entryAtMs(entry: ActionLogEntry): number {
  const t = entry.timestamp;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') {
    const d = Date.parse(t);
    return Number.isNaN(d) ? 0 : d;
  }
  return 0;
}

function isPluginOrThemeManageEndpoint(endpoint: string): boolean {
  const e = endpoint.toLowerCase();
  return e.includes('plugins/manage') || e.includes('themes/manage');
}

function kindFromEndpoint(endpoint: string): 'plugin' | 'theme' {
  return endpoint.toLowerCase().includes('themes/') ? 'theme' : 'plugin';
}

/** Past-tense verb shown in the UI (bridge uses present-tense action names). */
function mapManageVerb(action: string): string | null {
  const a = action.toLowerCase().trim();
  switch (a) {
    case 'activate':
      return 'activated';
    case 'deactivate':
      return 'deactivated';
    case 'update':
      return 'updated';
    case 'install-from-zip':
      return 'installed';
    case 'delete':
      return 'uninstalled';
    default:
      return null;
  }
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function labelFromPluginFile(plugin: string): string {
  const norm = plugin.replace(/\\/g, '/').trim();
  if (!norm) return '';
  const parts = norm.split('/').filter(Boolean);
  const first = parts[0] ?? norm;
  return first.replace(/\.php$/i, '') || norm;
}

function responseThemeName(entry: ActionLogEntry): string | undefined {
  const r = entry.response;
  if (!r || typeof r !== 'object') return undefined;
  const o = r as Record<string, unknown>;
  const name = o.name ?? o.theme_name ?? o.themeName;
  if (typeof name === 'string' && name.trim()) return name.trim();
  return undefined;
}

function pickExtensionName(entry: ActionLogEntry, kind: 'plugin' | 'theme'): string {
  const req =
    entry.request && typeof entry.request === 'object' ? (entry.request as Record<string, unknown>) : {};
  const slug = pickStr(req, ['slug', 'stylesheet']);
  if (slug) return slug;
  const plugin = pickStr(req, ['plugin']);
  if (plugin) return labelFromPluginFile(plugin);
  const name = pickStr(req, ['name']);
  if (name) return name;
  if (kind === 'theme') {
    const fromRes = responseThemeName(entry);
    if (fromRes) return fromRes;
    if (entry.action.toLowerCase() === 'install-from-zip') return 'Theme package';
  }
  if (kind === 'plugin' && entry.action.toLowerCase() === 'install-from-zip') return 'Plugin package';
  return kind === 'theme' ? 'Theme' : 'Plugin';
}

function entryFailed(entry: ActionLogEntry): boolean {
  const r = entry.response;
  if (!r || typeof r !== 'object') return false;
  const err = (r as { error?: unknown }).error;
  return err != null && err !== '' && err !== false;
}

function auditLineFromEntry(entry: ActionLogEntry, index: number): ActionAuditLine | null {
  if (!isPluginOrThemeManageEndpoint(entry.endpoint)) return null;
  const verb = mapManageVerb(entry.action);
  if (!verb) return null;
  const kind = kindFromEndpoint(entry.endpoint);
  const extensionName = pickExtensionName(entry, kind);
  const atMs = entryAtMs(entry);
  return {
    id: `${entry.endpoint}-${String(entry.timestamp)}-${index}`,
    atMs,
    dateTime: formatActionTimestamp(entry.timestamp),
    extensionName,
    kind,
    actionLabel: verb,
    failed: entryFailed(entry),
  };
}

/** Newest first — plugin/theme manage actions only (activate, update, install zip, uninstall, etc.). */
export function parseActionLogForAudit(entries: ActionLogEntry[] | undefined): ActionAuditLine[] {
  if (!Array.isArray(entries)) return [];
  const lines: ActionAuditLine[] = [];
  entries.forEach((entry, index) => {
    const line = auditLineFromEntry(entry, index);
    if (line) lines.push(line);
  });
  lines.sort((a, b) => b.atMs - a.atMs);
  return lines;
}

function extensionKeyMatchesRequest(
  entry: ActionLogEntry,
  kind: 'plugin' | 'theme',
  normalizedKey: string,
): boolean {
  const req = entry.request && typeof entry.request === 'object' ? (entry.request as Record<string, unknown>) : {};
  const nk = normalizedKey.toLowerCase();
  if (kind === 'plugin') {
    const plugin = pickStr(req, ['plugin']);
    if (plugin && plugin.replace(/\\/g, '/').trim().toLowerCase() === nk) return true;
    return false;
  }
  const ss = pickStr(req, ['stylesheet', 'slug']);
  return !!(ss && ss.trim().toLowerCase() === nk);
}

/** Like {@link parseActionLogForAudit} but only lines whose request matches this plugin file or theme stylesheet. */
export function parseActionLogForExtensionAudit(
  entries: ActionLogEntry[] | undefined,
  kind: 'plugin' | 'theme',
  extensionKey: string,
): ActionAuditLine[] {
  if (!Array.isArray(entries)) return [];
  const norm = extensionKey.replace(/\\/g, '/').trim();
  if (!norm) return [];
  const lines: ActionAuditLine[] = [];
  entries.forEach((entry, index) => {
    if (!isPluginOrThemeManageEndpoint(entry.endpoint)) return;
    const entryKind = kindFromEndpoint(entry.endpoint);
    if (entryKind !== kind) return;
    if (!extensionKeyMatchesRequest(entry, kind, norm)) return;
    const line = auditLineFromEntry(entry, index);
    if (line) lines.push(line);
  });
  lines.sort((a, b) => b.atMs - a.atMs);
  return lines;
}
