import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { functions } from '../services/appwrite';
import { useAuth } from '../domains/auth';
import { useSite } from '../domains/sites';
import { useToast } from '../contexts/ToastContext';
import { executeFunctionWithMeta } from '../integrations/appwrite/executeFunction';

function wpProxy<T>(
  siteId: string,
  userId: string | undefined,
  endpoint: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): Promise<T> {
  const qs = new URLSearchParams();
  qs.set('siteId', siteId);
  qs.set('endpoint', endpoint);
  if (userId) qs.set('userId', userId);
  qs.set('useApiKey', '1');
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') qs.set('method', method);
  if (options.body && Object.keys(options.body).length > 0) {
    qs.set('body', JSON.stringify(options.body));
  }
  const path = `/?${qs.toString()}`;
  const payload = options.body && method !== 'GET' ? options.body : undefined;
  return executeFunctionWithMeta<T>(
    'wp-proxy',
    payload as any,
    { path, method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', throwOnHttpError: true }
  ).then((r) => r.data);
}

async function getSiteLogs(siteId: string, userId?: string): Promise<BridgeLogEntry[]> {
  const res = await wpProxy<{ logs?: BridgeLogEntry[] }>(siteId, userId, 'wphubpro/v1/logs');
  return res?.logs ?? [];
}

async function getSiteErrorLog(siteId: string, userId?: string): Promise<{ lines: string[]; file?: string; error?: string }> {
  return wpProxy(siteId, userId, 'wphubpro/v1/error-log');
}

async function getSiteExecutionLogs(siteId: string): Promise<AppwriteExecution[]> {
  const { functions } = await import('../services/appwrite');
  const { Query } = await import('appwrite');
  const list = await (functions as any).listExecutions?.('wp-proxy', [
    Query.equal('requestPath', `?siteId=${siteId}`),
    Query.limit(50),
    Query.orderDesc('$createdAt'),
  ]);
  return (list?.executions ?? []).map((e: any) => ({
    $id: e.$id,
    $createdAt: e.$createdAt,
    status: e.status,
    responseStatusCode: e.responseStatusCode,
    responseBody: e.responseBody ?? '',
    logs: e.logs ?? '',
    errors: e.errors ?? '',
    duration: e.duration ?? 0,
    requestMethod: e.requestMethod ?? '',
    requestPath: e.requestPath ?? '',
  }));
}

/**
 * WordPress plugin file path for the bridge API (e.g. wp-test-crash/wp-test-crash.php).
 * Do not replace slashes — the bridge expects the real path; query params use encodeURIComponent.
 */
function pluginFileForBridge(pluginFile: string): string {
  return (pluginFile || '').trim();
}

async function updatePluginStatus(siteId: string, slug: string, active: boolean, userId?: string): Promise<unknown> {
  const path = active ? 'wphubpro/v1/plugins/manage/activate' : 'wphubpro/v1/plugins/manage/deactivate';
  const pluginParam = pluginFileForBridge(slug);
  return wpProxy(siteId, userId, `${path}?plugin=${encodeURIComponent(pluginParam)}`, { method: 'POST', body: { plugin: pluginParam } });
}

async function updateThemeStatus(siteId: string, slug: string, active: boolean, userId?: string): Promise<unknown> {
  const path = active ? 'wphubpro/v1/themes/manage/activate' : 'wphubpro/v1/themes/manage/deactivate';
  return wpProxy(siteId, userId, path, { method: 'POST', body: { slug } });
}

async function deletePlugin(siteId: string, slug: string, userId?: string): Promise<unknown> {
  const pluginParam = pluginFileForBridge(slug);
  return wpProxy(siteId, userId, `wphubpro/v1/plugins/manage/uninstall?plugin=${encodeURIComponent(pluginParam)}`, {
    method: 'POST',
    body: { plugin: pluginParam },
  });
}

async function deleteTheme(siteId: string, slug: string, userId?: string): Promise<unknown> {
  return wpProxy(siteId, userId, 'wphubpro/v1/themes/manage/delete', { method: 'POST', body: { slug } });
}

async function syncSiteData(siteId: string, userId?: string): Promise<unknown> {
  const path = `/?siteId=${siteId}&endpoint=wphubpro/v1/plugins&userId=${userId || ''}&useApiKey=1`;
  const exec = await executeFunctionWithMeta('wp-proxy', undefined, { path, throwOnHttpError: false });
  return exec.statusCode >= 200 && exec.statusCode < 400 ? {} : Promise.reject(new Error('Sync failed'));
}

export interface BridgeLogEntry {
  time: string;
  endpoint: string;
  type: string;
  code: number;
  request: any;
  response: any;
}

export interface AppwriteExecution {
  $id: string;
  $createdAt: string;
  status: string;
  responseStatusCode: number;
  responseBody: string;
  logs: string;
  errors: string;
  duration: number;
  requestMethod: string;
  requestPath: string;
}

export interface WordPressPlugin {
  plugin: string;
  name: string;
  version: string;
  status: 'active' | 'inactive';
  update: string | null;
}

export interface WordPressTheme {
  stylesheet: string;
  name: string;
  version: string;
  status: 'active' | 'inactive';
  update?: string | null;
}

function parsePluginsMeta(meta: string | undefined): WordPressPlugin[] {
  if (!meta || typeof meta !== 'string') return [];
  try {
    const arr = JSON.parse(meta);
    if (!Array.isArray(arr)) return [];
    return arr.map((p: any) => {
      const isActive = p.active === true || p.active === 1 || p.status === 'active';
      return {
        plugin: p.file ?? p.plugin ?? '',
        name: p.name ?? '',
        version: p.version ?? '',
        status: (isActive ? 'active' : 'inactive') as 'active' | 'inactive',
        update: p.update ?? null,
      };
    });
  } catch {
    return [];
  }
}

function parseThemesMeta(meta: string | undefined): WordPressTheme[] {
  if (!meta || typeof meta !== 'string') return [];
  try {
    const arr = JSON.parse(meta);
    if (!Array.isArray(arr)) return [];
    return arr.map((t: any) => ({
      stylesheet: t.stylesheet ?? t.file ?? t.slug ?? '',
      name: t.name ?? '',
      version: t.version ?? '',
      status: (t.active ? 'active' : 'inactive') as 'active' | 'inactive',
      update: t.update ?? null,
    }));
  } catch {
    return [];
  }
}

/** Plugin list - from site.pluginsMeta (synced by bridge). Set enabled: false when site is off. */
export const usePlugins = (siteId: string | undefined, options?: { enabled?: boolean }) => {
  const queryEnabled = !!siteId && (options?.enabled !== false);
  const siteQuery = useSite(queryEnabled ? siteId : undefined);
  return {
    ...siteQuery,
    data: parsePluginsMeta(siteQuery.data?.pluginsMeta) ?? [],
  };
};

/** Theme list - from site.themesMeta (synced by bridge). Set enabled: false when site is off. */
export const useThemes = (siteId: string | undefined, options?: { enabled?: boolean }) => {
  const queryEnabled = !!siteId && (options?.enabled !== false);
  const siteQuery = useSite(queryEnabled ? siteId : undefined);
  return {
    ...siteQuery,
    data: parseThemesMeta(siteQuery.data?.themesMeta) ?? [],
  };
};

export function hasUpdate(p: { update?: string | { new_version?: string } | null }): boolean {
  if (p.update == null) return false;
  if (typeof p.update === 'object') return !!(p.update.new_version && String(p.update.new_version).trim());
  return String(p.update).trim() !== '';
}

/** Plugins/themes on a site that have an available update (from synced meta). */
export function getSitePendingUpdates(site: { pluginsMeta?: string; themesMeta?: string }) {
  const plugins = parsePluginsMeta(site.pluginsMeta);
  const themes = parseThemesMeta(site.themesMeta);
  const pluginsNeedingUpdate = plugins.filter(hasUpdate);
  const themesNeedingUpdate = themes.filter(hasUpdate);
  return {
    pluginsNeedingUpdate,
    themesNeedingUpdate,
    pluginUpdateCount: pluginsNeedingUpdate.length,
    themeUpdateCount: themesNeedingUpdate.length,
  };
}

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
  sites: { $id: string; status: string; pluginsMeta?: string; themesMeta?: string; siteName?: string }[],
  options?: { isLoading?: boolean }
) => {
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

  const pluginUpdatesList = Array.from(pluginUpdatesMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

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

/** Toggle plugin active/inactive – pass siteId in variables when hook was created with undefined (e.g. library site management). */
export const useTogglePlugin = (siteId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      siteId: sid,
      pluginSlug,
      status,
    }: {
      siteId?: string;
      pluginSlug: string;
      status: 'active' | 'inactive';
      pluginName: string;
    }) => {
      const id = sid ?? siteId;
      if (!id) throw new Error('Site ID required');
      const path = status === 'active' ? 'wphubpro/v1/plugins/manage/deactivate' : 'wphubpro/v1/plugins/manage/activate';
      const pluginParam = pluginFileForBridge(pluginSlug);
      return wpProxy(id, user?.$id, `${path}?plugin=${encodeURIComponent(pluginParam)}`, { method: 'POST', body: { plugin: pluginParam } });
    },
    onSuccess: async (_, variables) => {
      const id = variables.siteId ?? siteId;
      if (id) {
        await queryClient.refetchQueries({ queryKey: ['site', id] });
        setTimeout(() => queryClient.refetchQueries({ queryKey: ['site', id] }), 2000);
      }
      if (user?.$id) queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
      toast({ title: 'Success', description: `Plugin "${variables.pluginName}" has been ${variables.status === 'active' ? 'deactivated' : 'activated'}.`, variant: 'success' });
    },
    onError: (err, variables) => {
      toast({ title: 'Action Failed', description: `Could not toggle plugin "${variables.pluginName}": ${(err as Error).message}`, variant: 'destructive' });
    },
  });
};

/** Update plugin - exported for PluginsTab. Pass siteId in variables to update any site (e.g. from dashboard list). */
export const useUpdatePlugin = (siteId?: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ siteId: sid, pluginFile }: { siteId?: string; pluginFile: string; pluginName: string }) => {
      const id = sid ?? siteId;
      if (!id) throw new Error('Site ID required');
      const pluginParam = pluginFileForBridge(pluginFile);
      return wpProxy(id, user?.$id, `wphubpro/v1/plugins/manage/update?plugin=${encodeURIComponent(pluginParam)}`, { method: 'POST', body: { plugin: pluginParam } });
    },
    onSuccess: async (_, variables) => {
      const id = variables.siteId ?? siteId;
      if (id) {
        await queryClient.refetchQueries({ queryKey: ['site', id] });
        setTimeout(() => queryClient.refetchQueries({ queryKey: ['site', id] }), 2000);
      }
      if (user?.$id) queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
      toast({ title: 'Success', description: `Plugin "${variables.pluginName}" is bijgewerkt.`, variant: 'success' });
    },
    onError: (err, variables) => {
      toast({ title: 'Update failed', description: `Could not update plugin "${variables.pluginName}": ${(err as Error).message}`, variant: 'destructive' });
    },
  });
};

/** Install/rollback plugin to a specific version from WordPress.org - exported for PluginsTab. Pass siteId in variables for any site. */
export const useInstallPluginVersion = (siteId?: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      siteId: sid,
      pluginFile,
      version,
    }: {
      siteId?: string;
      pluginFile: string;
      pluginName: string;
      version: string;
      siteDisplayName?: string;
    }) => {
      const id = sid ?? siteId;
      if (!id) throw new Error('Site ID required');
      const pluginParam = pluginFileForBridge(pluginFile);
      return wpProxy(id, user?.$id, `wphubpro/v1/plugins/manage/install-version?plugin=${encodeURIComponent(pluginParam)}`, {
        method: 'POST',
        body: { plugin: pluginParam, version },
      });
    },
    onSuccess: async (_, variables) => {
      const id = variables.siteId ?? siteId;
      if (id) {
        await queryClient.refetchQueries({ queryKey: ['site', id] });
        setTimeout(() => queryClient.refetchQueries({ queryKey: ['site', id] }), 2000);
      }
      if (user?.$id) queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
      const where = variables.siteDisplayName ? ` on site "${variables.siteDisplayName}"` : '';
      toast({
        title: 'Success',
        description: `Installed plugin "${variables.pluginName}"${where} (version ${variables.version}).`,
        variant: 'success',
      });
    },
    onError: (err, variables) => {
      toast({ title: 'Update failed', description: `Could not update "${variables.pluginName}": ${(err as Error).message}`, variant: 'destructive' });
    },
  });
};

/** Install plugin from a remote ZIP URL. */
export const useInstallPluginFromZipUrl = (siteId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      siteId: sid,
      pluginFile,
      zipUrl,
    }: {
      siteId?: string;
      pluginFile: string;
      zipUrl: string;
      pluginName: string;
      siteDisplayName?: string;
    }) => {
      const id = sid ?? siteId;
      if (!id) throw new Error('Site ID required');
      const pluginParam = pluginFileForBridge(pluginFile);
      return wpProxy(id, user?.$id, `wphubpro/v1/plugins/manage/install-version?plugin=${encodeURIComponent(pluginParam)}`, {
        method: 'POST',
        body: { plugin: pluginParam, zip_url: zipUrl },
      });
    },
    onSuccess: async (_, variables) => {
      const id = variables.siteId ?? siteId;
      if (id) {
        await queryClient.refetchQueries({ queryKey: ['site', id] });
        setTimeout(() => queryClient.refetchQueries({ queryKey: ['site', id] }), 2000);
      }
      if (user?.$id) queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
      const where = variables.siteDisplayName ? ` on site "${variables.siteDisplayName}"` : '';
      toast({
        title: 'Success',
        description: `Installed plugin "${variables.pluginName}" from remote URL${where}.`,
        variant: 'success',
      });
    },
    onError: (err, variables) => {
      toast({ title: 'Install failed', description: `Could not install "${variables.pluginName}": ${(err as Error).message}`, variant: 'destructive' });
    },
  });
};

/** Install theme from HTTPS zip URL (library / remote). wp-proxy may convert to zip_base64. */
export const useInstallThemeFromZipUrl = (siteId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      siteId: sid,
      zipUrl,
      themeName,
    }: {
      siteId?: string;
      zipUrl: string;
      themeName: string;
      siteDisplayName?: string;
    }) => {
      const id = sid ?? siteId;
      if (!id) throw new Error('Site ID required');
      if (!zipUrl.startsWith('https://')) throw new Error('Theme zip URL must use HTTPS.');
      return wpProxy(id, user?.$id, 'wphubpro/v1/themes/manage/install-from-zip', {
        method: 'POST',
        body: { zip_url: zipUrl },
      });
    },
    onSuccess: async (_, variables) => {
      const id = variables.siteId ?? siteId;
      if (id) {
        await queryClient.refetchQueries({ queryKey: ['site', id] });
        setTimeout(() => queryClient.refetchQueries({ queryKey: ['site', id] }), 2000);
      }
      if (user?.$id) queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
      const where = variables.siteDisplayName ? ` on "${variables.siteDisplayName}"` : '';
      toast({
        title: 'Success',
        description: `Installed theme "${variables.themeName}"${where}.`,
        variant: 'success',
      });
    },
    onError: (err, variables) => {
      toast({
        title: 'Install failed',
        description: `Could not install theme "${variables.themeName}": ${(err as Error).message}`,
        variant: 'destructive',
      });
    },
  });
};

/** Update WPHubPro Bridge plugin – same as normal plugin update, but package URL from bucket. */
export const useUpdateBridgeFromZip = (siteId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ zipUrl, pluginFile }: { zipUrl: string; pluginFile: string }) => {
      const pluginParam = pluginFileForBridge(pluginFile);
      return wpProxy(siteId!, user?.$id, `wphubpro/v1/plugins/manage/update?plugin=${encodeURIComponent(pluginParam)}`, {
        method: 'POST',
        body: { plugin: pluginParam, zip_url: zipUrl },
      });
    },
    onSuccess: async () => {
      if (siteId) {
        await queryClient.refetchQueries({ queryKey: ['site', siteId] });
        setTimeout(() => queryClient.refetchQueries({ queryKey: ['site', siteId] }), 2000);
      }
      if (user?.$id) queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
      queryClient.invalidateQueries({ queryKey: ['plugins', siteId] });
      toast({ title: 'Success', description: 'WPHubPro Bridge updated.', variant: 'success' });
    },
    onError: (err) => {
      toast({ title: 'Update failed', description: (err as Error).message, variant: 'destructive' });
    },
  });
};

/** Delete plugin - exported for PluginsTab. Pass siteId in variables to uninstall from any site. */
export const useDeletePlugin = (siteId?: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ siteId: sid, pluginFile }: { siteId?: string; pluginFile: string; pluginName: string }) => {
      const id = sid ?? siteId;
      if (!id) throw new Error('Site ID required');
      const pluginParam = pluginFileForBridge(pluginFile);
      return wpProxy(id, user?.$id, `wphubpro/v1/plugins/manage/uninstall?plugin=${encodeURIComponent(pluginParam)}`, { method: 'POST', body: { plugin: pluginParam } });
    },
    onSuccess: async (_, variables) => {
      const id = variables.siteId ?? siteId;
      if (id) {
        await queryClient.refetchQueries({ queryKey: ['site', id] });
        setTimeout(() => queryClient.refetchQueries({ queryKey: ['site', id] }), 2000);
      }
      if (user?.$id) queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
      toast({ title: 'Success', description: `Plugin "${variables.pluginName}" has been removed.`, variant: 'success' });
    },
    onError: (err, variables) => {
      toast({ title: 'Remove failed', description: `Could not remove plugin "${variables.pluginName}": ${(err as Error).message}`, variant: 'destructive' });
    },
  });
};

const themeEndpoints: Record<string, string> = {
  activate: 'wphubpro/v1/themes/manage/activate',
  update: 'wphubpro/v1/themes/manage/update',
  delete: 'wphubpro/v1/themes/manage/delete',
};

/** Manage theme (activate/update/delete) - exported for ThemesTab. Pass `siteId` in `mutate` when hook was created with `undefined` (e.g. dashboard). */
export const useManageTheme = (siteId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      siteId: sid,
      themeSlug,
      action,
    }: {
      siteId?: string;
      themeSlug: string;
      action: 'activate' | 'delete' | 'update';
      themeName: string;
    }) => {
      const id = sid ?? siteId;
      if (!id) return Promise.reject(new Error('Site ID required'));
      const endpoint = themeEndpoints[action];
      if (!endpoint) return Promise.reject(new Error(`Theme action "${action}" is not supported.`));
      return wpProxy(id, user?.$id, endpoint, { method: 'POST', body: { slug: themeSlug } });
    },
    onSuccess: async (_, variables) => {
      const id = variables.siteId ?? siteId;
      if (id) {
        await queryClient.refetchQueries({ queryKey: ['site', id] });
        setTimeout(() => queryClient.refetchQueries({ queryKey: ['site', id] }), 2000);
      }
      if (user?.$id) queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
      toast({ title: 'Success', description: `Theme "${variables.themeName}" ${variables.action}d successfully.`, variant: 'success' });
    },
    onError: (err, variables) => {
      toast({ title: 'Action Failed', description: `Could not ${variables.action} theme "${variables.themeName}": ${(err as Error).message}`, variant: 'destructive' });
    },
  });
};

/** Standalone hook for Bridge logs - exported for LogsTab */
export const useSiteLogs = (siteId: string, options?: { enabled?: boolean }) => {
  const { user } = useAuth();
  const queryEnabled = !!siteId && (options?.enabled !== false);
  return useQuery<BridgeLogEntry[]>({
    queryKey: ['site-logs', siteId],
    queryFn: () => getSiteLogs(siteId, user?.$id),
    enabled: queryEnabled,
    refetchInterval: 30000,
  });
};

/** Standalone hook for error log - exported for LogsTab */
export const useSiteErrorLog = (siteId: string, options?: { enabled?: boolean }) => {
  const { user } = useAuth();
  const queryEnabled = !!siteId && (options?.enabled !== false);
  return useQuery<{ lines: string[]; file?: string; error?: string }>({
    queryKey: ['site-error-log', siteId],
    queryFn: () => getSiteErrorLog(siteId, user?.$id),
    enabled: queryEnabled,
  });
};

/** Standalone hook for execution logs - exported for LogsTab */
export const useSiteExecutionLogs = (siteId: string, options?: { enabled?: boolean }) => {
  const queryEnabled = !!siteId && (options?.enabled !== false);
  return useQuery<AppwriteExecution[]>({
    queryKey: ['site-execution-logs', siteId],
    queryFn: () => getSiteExecutionLogs(siteId),
    enabled: queryEnabled,
  });
};

/** Emergency recovery actions via recovery-manager Appwrite Function - exported for LogsTab */
export const executeRecovery = async (
  siteId: string,
  action: 'get_error_log' | 'rollback_plugin',
  pluginSlug?: string
) => {
  try {
    const execution = await functions.createExecution(
      'recovery-manager',
      JSON.stringify({ siteId, action, plugin_slug: pluginSlug }),
      false,
      '/',
      'POST' as any
    );
    const result = JSON.parse(execution.responseBody);
    if (!result.success) {
      throw new Error(result.message || 'Recovery action failed');
    }
    return result.data;
  } catch (err: any) {
    console.error('Recovery execution error:', err);
    throw err;
  }
};

export const useWordPress = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const useUpdatePlugin = () => {
    return useMutation({
      mutationFn: ({ siteId, slug, status }: { siteId: string; slug: string; status: boolean }) =>
        updatePluginStatus(siteId, slug, status, user?.$id),
      onSuccess: (_, { siteId }) => {
        queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      },
    });
  };

  const useDeletePlugin = () => {
    return useMutation({
      mutationFn: ({ siteId, slug }: { siteId: string; slug: string }) =>
        deletePlugin(siteId, slug, user?.$id),
      onSuccess: (_, { siteId }) => {
        queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      },
    });
  };

  const useUpdateTheme = () => {
    return useMutation({
      mutationFn: ({ siteId, slug, status }: { siteId: string; slug: string; status: boolean }) =>
        updateThemeStatus(siteId, slug, status, user?.$id),
      onSuccess: (_, { siteId }) => {
        queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      },
    });
  };

  const useDeleteTheme = () => {
    return useMutation({
      mutationFn: ({ siteId, slug }: { siteId: string; slug: string }) =>
        deleteTheme(siteId, slug, user?.$id),
      onSuccess: (_, { siteId }) => {
        queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      },
    });
  };

  const useSyncSite = () => {
    return useMutation({
      mutationFn: (siteId: string) => syncSiteData(siteId, user?.$id),
      onSuccess: (_, siteId) => {
        queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      },
    });
  };

  return {
    useSiteLogs,
    useSiteErrorLog,
    useSiteExecutionLogs,
    executeRecovery,
    useUpdatePlugin,
    useDeletePlugin,
    useUpdateTheme,
    useDeleteTheme,
    useSyncSite,
  };
};

// Behoud individuele exports voor backwards compatibility in LogsTab.tsx
export { 
  getSiteLogs as fetchSiteLogs,
  getSiteErrorLog as fetchSiteErrorLog,
  getSiteExecutionLogs as fetchSiteExecutionLogs
};