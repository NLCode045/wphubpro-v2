import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases } from '../../services/appwrite';
import { Query } from 'appwrite';
import { Site } from '../../types';
import { useAuth } from '../auth';
import { useToast } from '../../contexts/ToastContext';
import { account, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_HEARTBEAT_URL } from '../../services/appwrite';
import { executeFunction, executeFunctionWithMeta } from '../../integrations/appwrite/executeFunction';
import { mapSiteDocumentToSite } from './mappers';

/** Check if plugins_meta or themes_meta is effectively empty */
function isMetaEmpty(s: string | undefined | null): boolean {
  if (!s || typeof s !== 'string') return true;
  const t = s.trim();
  return t.length <= 2 || t === '[]' || t === '{}';
}

const DATABASE_ID = 'platform_db';
const SITES_COLLECTION_ID = 'sites';

const STATUS_POLL_INTERVAL_MS = 60_000; // Poll site doc for fresh bridge_status

/** Probe bridge via wp-proxy and update bridge_status on success. Used for manual "Check connection" and Reconnect. */
async function probeSiteConnection(
  siteId: string,
  userId: string,
  options?: { throwOnFail?: boolean }
): Promise<boolean> {
  const path = `/?siteId=${siteId}&endpoint=wphubpro/v1/plugins&userId=${userId}&useApiKey=1`;
  const exec = await executeFunctionWithMeta<unknown>('wp-proxy', undefined, {
    path,
    throwOnHttpError: false,
  });
  const status = exec.statusCode || 0;
  const success = exec.executionStatus === 'completed' && status >= 200 && status < 400;

  const now = new Date().toISOString();
  const updates: Record<string, string> = {
    health_status: success ? 'healthy' : 'bad',
    last_checked: now,
  };

  if (success) {
    updates.bridge_status = 'connected';
    updates.heartbeat_updated_at = now;
  }

  await databases.updateDocument(DATABASE_ID, SITES_COLLECTION_ID, siteId, updates);

  if (!success && options?.throwOnFail) {
    const parsed = exec.data as any;
    const msg = parsed && parsed.message ? parsed.message : 'Connection failed';
    throw new Error(msg);
  }
  return success;
}

export const useSites = () => {
  const { user } = useAuth();

  return useQuery<Site[], Error>({
    queryKey: ['sites', user?.$id],
    queryFn: async () => {
      if (!user?.$id) return [];
      const response = await databases.listDocuments(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        [Query.equal('user_id', user.$id), Query.limit(100)]
      );
      return response.documents.map((doc: any) => mapSiteDocumentToSite(doc));
    },
    enabled: !!user?.$id,
  });
};

export const useSite = (siteId: string | undefined) => {
  const { user } = useAuth();

  return useQuery<Site, Error>({
    queryKey: ['site', siteId],
    queryFn: async () => {
      if (!siteId) throw new Error('Site ID is required.');

      const document = await databases.getDocument(
        DATABASE_ID,
        SITES_COLLECTION_ID,
        siteId
      );

      // Check if the site belongs to the current user
      if ((document as any).user_id !== user?.$id) {
        throw new Error('No access to this site.');
      }

      return mapSiteDocumentToSite(document as any);
    },
    enabled: !!siteId && !!user,
    retry: 1, // Voorkom eindeloze retries bij 404
  });
};

export const useAddSite = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  type NewSiteInput = {
    siteName: string;
    siteUrl: string;
    username: string;
    apiKey?: string;
    bridgeSecret?: string;
    metaData?: string;
  };

  return useMutation<Site & { siteSecret?: string }, Error, NewSiteInput>({
    mutationFn: async (newSiteData) => {
      if (!user) throw new Error('User not authenticated.');

      const payload: Record<string, unknown> = {
        action: 'create',
        site_url: newSiteData.siteUrl,
        site_name: newSiteData.siteName,
        username: newSiteData.username,
      };
      const bridgeSecret = newSiteData.bridgeSecret ?? newSiteData.apiKey;
      if (bridgeSecret) payload.bridge_secret = bridgeSecret;
      if (newSiteData.metaData !== undefined) payload.meta_data = newSiteData.metaData;

      const path = '/';
      const parsed = await executeFunction<{ document?: Site & { encrypted_api_key?: string }; site_secret?: string }>('wphub-sites', payload, { path });
      const rawSite = parsed?.document ?? parsed;
      const site = mapSiteDocumentToSite(rawSite as any);
      return { ...site, siteSecret: parsed?.site_secret, encrypted_api_key: (rawSite as any)?.encrypted_api_key };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sites', user?.$id] });
      queryClient.invalidateQueries({ queryKey: ['usage', user?.$id] });
      toast({
        title: 'Site added',
        description: `Site ${data.siteName} has been successfully created.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error adding site',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateSite = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation<any, Error, {
    siteId: string;
    username?: string;
    apiKey?: string;
    bridgeSecret?: string;
    siteName?: string;
    siteUrl?: string;
    status?: 'connected' | 'disconnected';
    healthStatus?: 'healthy' | 'bad';
    lastChecked?: string;
    metaData?: string;
    /** When true, skip success toast (e.g. for background connection-status corrections) */
    silent?: boolean;
  }>({
    mutationFn: async ({ siteId, silent: _silent, ...updates }) => {
      if (!user) throw new Error('User not authenticated.');

      const hasOwn = (obj: any, key: string) => Object.prototype.hasOwnProperty.call(obj || {}, key);
      const needsServerProcessing = hasOwn(updates, 'username') || hasOwn(updates, 'apiKey') || hasOwn(updates, 'bridgeSecret');

      if (!needsServerProcessing) {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.siteName !== undefined) dbUpdates.site_name = updates.siteName;
        if (updates.siteUrl !== undefined) dbUpdates.site_url = updates.siteUrl;
        if (updates.healthStatus !== undefined) dbUpdates.health_status = updates.healthStatus;
        if (updates.lastChecked !== undefined) dbUpdates.last_checked = updates.lastChecked;
        if (updates.metaData !== undefined) dbUpdates.meta_data = updates.metaData;
        if (updates.status !== undefined) dbUpdates.bridge_status = updates.status;

        if (Object.keys(dbUpdates).length === 0) {
          throw new Error('No fields to update.');
        }
        const updated = await databases.updateDocument(DATABASE_ID, SITES_COLLECTION_ID, siteId, dbUpdates);
        return mapSiteDocumentToSite(updated as any);
      }

      // Map camelCase to snake_case for wphub-sites API
      const apiUpdates: Record<string, unknown> = {};
      if (updates.username !== undefined) apiUpdates.username = updates.username;
      if (updates.apiKey !== undefined) apiUpdates.api_key = updates.apiKey;
      if (updates.bridgeSecret !== undefined) apiUpdates.bridge_secret = updates.bridgeSecret;
      if (updates.siteName !== undefined) apiUpdates.site_name = updates.siteName;
      if (updates.siteUrl !== undefined) apiUpdates.site_url = updates.siteUrl;
      const payload = { action: 'update', siteId, updates: apiUpdates };
      const path = '/';
      const parsed = await executeFunction<{ document?: any; site_secret?: string }>('wphub-sites', payload, { path });
      const rawSite = parsed?.document ?? parsed;
      const site = mapSiteDocumentToSite(rawSite as any);
      return { ...site, site_secret: parsed?.site_secret, encrypted_api_key: (rawSite as any)?.encrypted_api_key };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sites', user?.$id] });
      queryClient.invalidateQueries({ queryKey: ['site', variables.siteId] });
      // Invalidate plugins/themes for this site so the UI refetches using updated credentials
      queryClient.invalidateQueries({ queryKey: ['plugins', variables.siteId] });
      queryClient.invalidateQueries({ queryKey: ['themes', variables.siteId] });
      if (!variables.silent) {
        toast({ title: 'Site bijgewerkt', description: 'De gegevens zijn succesvol opgeslagen.', variant: 'success' });
      }
    },
    onError: (err) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    },
  });
};

export const useCheckSiteHealth = (siteId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation<void, Error, { silent?: boolean } | void>({
    mutationFn: async () => {
      if (!siteId || !user) throw new Error('Site ID required.');
      await probeSiteConnection(siteId, user.$id, { throwOnFail: true });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sites', user?.$id] });
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      const silent = typeof variables === 'object' && variables?.silent;
      if (!silent) toast({ title: 'Connection OK', description: 'The site responds correctly.', variant: 'success' });
    },
    onError: (err, _variables) => {
      queryClient.invalidateQueries({ queryKey: ['sites', user?.$id] });
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      const silent = typeof _variables === 'object' && _variables?.silent;
      if (!silent) toast({ title: 'Connection failed', description: err.message, variant: 'destructive' });
    },
  });
};

export const useDeleteSite = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation<void, Error, string>({
    mutationFn: async (siteId: string) => {
      if (!user) throw new Error('User not authenticated.');
      await databases.deleteDocument(DATABASE_ID, SITES_COLLECTION_ID, siteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', user?.$id] });
      toast({ title: 'Site removed', description: 'The site has been successfully removed.', variant: 'success' });
    },
    onError: (err) => {
      toast({ title: 'Remove failed', description: err.message, variant: 'destructive' });
    },
  });
};

/** Reconnect: send connection data to bridge via wp-proxy (save-connection). wp-proxy injects api_key. Use when disconnected. */
export const useReconnectSite = (siteId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!siteId || !user) throw new Error('Site ID required.');
      await executeFunctionWithMeta('wp-proxy', {
        siteId,
        endpoint: 'wphubpro/v1/save-connection',
        method: 'POST',
        body: {
          endpoint: APPWRITE_ENDPOINT,
          project_id: APPWRITE_PROJECT_ID,
          site_id: siteId,
          heartbeat_url: APPWRITE_HEARTBEAT_URL || undefined,
        },
      });
      // Probe to immediately update bridge_status (heartbeat may take up to 1 min)
      await probeSiteConnection(siteId, user.$id);
      // Refresh plugins_meta and themes_meta so the site document stays in sync
      const jwtRes = await account.createJWT();
      const jwt = typeof jwtRes === 'string' ? jwtRes : (jwtRes as { jwt?: string }).jwt ?? '';
      await executeFunctionWithMeta('fetch-site-meta', { siteId, jwt, force: true }, { throwOnHttpError: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', user?.$id] });
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      queryClient.invalidateQueries({ queryKey: ['plugins', siteId] });
      queryClient.invalidateQueries({ queryKey: ['themes', siteId] });
      toast({ title: 'Opnieuw verbonden', description: 'De bridge ontvangt de nieuwe verbinding.', variant: 'success' });
    },
    onError: (err) => {
      toast({ title: 'Reconnect mislukt', description: err.message, variant: 'destructive' });
    },
  });
};

/** Poll site document for fresh bridge_status (heartbeat-driven). Use on Site Detail. */
export const useSiteStatusPoll = (siteId: string | undefined, intervalMs = STATUS_POLL_INTERVAL_MS) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!siteId || !user) return;
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
    }, intervalMs);
    return () => clearInterval(id);
  }, [siteId, user?.$id, intervalMs, queryClient]);
};

/** Poll site documents for fresh bridge_status. Use on Dashboard/Sites. */
export const useSitesStatusPoll = (siteIds: string[], intervalMs = STATUS_POLL_INTERVAL_MS) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || siteIds.length === 0) return;
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
      siteIds.forEach((sid) => queryClient.invalidateQueries({ queryKey: ['site', sid] }));
    }, intervalMs);
    return () => clearInterval(id);
  }, [siteIds.join(','), user?.$id, intervalMs, queryClient]);
};

/** One-time fetch of plugins/themes when bridge_status is connected but plugins_meta/themes_meta are empty.
 * Skip when wp_meta exists – bridge sync sends wp_meta + plugins_meta + themes_meta together, so we already have the data. */
const triggeredSiteIds = new Set<string>();

export const useFetchSiteMetaIfNeeded = (sites: Site[] | Site | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const sitesArray = Array.isArray(sites) ? sites : sites ? [sites] : [];

  useEffect(() => {
    if (!user) return;
    for (const site of sitesArray) {
      if (!site?.$id || triggeredSiteIds.has(site.$id)) continue;
      if (site.status !== 'connected') continue;
      // If wpMeta exists, bridge has synced – skip fetch (sync provides plugins/themes too)
      if (site.wpMeta && String(site.wpMeta).trim().length > 2) continue;
      const needsPlugins = isMetaEmpty(site.pluginsMeta);
      const needsThemes = isMetaEmpty(site.themesMeta);
      if (!needsPlugins && !needsThemes) continue;

      triggeredSiteIds.add(site.$id);
      account
        .createJWT()
        .then((res) => {
          const jwt = typeof res === 'string' ? res : (res as { jwt?: string }).jwt ?? '';
          return executeFunctionWithMeta('fetch-site-meta', { siteId: site.$id, jwt }, { throwOnHttpError: false });
        })
        .then((res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
            queryClient.invalidateQueries({ queryKey: ['site', site.$id] });
            queryClient.invalidateQueries({ queryKey: ['plugins', site.$id] });
            queryClient.invalidateQueries({ queryKey: ['themes', site.$id] });
          }
        })
        .catch(() => {
          triggeredSiteIds.delete(site.$id);
        });
    }
  }, [sitesArray.map((s) => s?.$id).join(','), user?.$id, queryClient]);
};
