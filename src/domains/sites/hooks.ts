import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Query } from 'appwrite';
import { account, COLLECTIONS, databases, DATABASE_ID } from '../../services/appwrite';
import { executeFunctionWithMeta } from '../../integrations/appwrite/executeFunction';
import type {
  Site,
  SiteAppIconPreviewResult,
  SitePagespeedResult,
  SitePagespeedScores,
} from '../../types';
import { useAuth } from '../auth';
import {
  forEachStoredPagespeed,
  getPagespeedFromSession,
  isSitePagespeedSessionComplete,
  setPagespeedInSession,
} from './pagespeedSessionCache';
import { mapSiteDocumentToSite } from './mappers';
import {
  hasBothPagespeedStrategiesInPerformanceMeta,
  pagespeedResultFromPerformanceMeta,
} from './performanceMeta';

function isMetaEmpty(s: string | undefined | null): boolean {
  if (!s || typeof s !== 'string') return true;
  const t = s.trim();
  return t.length <= 2 || t === '[]' || t === '{}';
}

const STATUS_POLL_INTERVAL_MS = 60_000;

const SITE_HEARTBEAT_POKE_FUNCTION_ID = 'site-heartbeat-poke';

const WP_PROXY_FUNCTION_ID = import.meta.env.VITE_APPWRITE_FUNCTION_WP_PROXY ?? 'wp-proxy';

type HeartbeatPokeResponse = {
  success?: boolean;
  message?: string;
  httpStatus?: number;
};

/**
 * Calls `site-heartbeat-poke` with `{ siteId, jwt }` so the platform GETs the WordPress
 * `/heartbeat/poke` endpoint (nudges the bridge to send a heartbeat).
 */
export const useRequestBridgeHeartbeatPoke = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<HeartbeatPokeResponse, Error, string>({
    mutationFn: async (siteId: string) => {
      const jwtRes = await account.createJWT();
      const jwt = typeof jwtRes === 'string' ? jwtRes : (jwtRes as { jwt?: string }).jwt ?? '';
      const { data, statusCode } = await executeFunctionWithMeta<HeartbeatPokeResponse>(
        SITE_HEARTBEAT_POKE_FUNCTION_ID,
        { siteId, jwt },
        { throwOnHttpError: false },
      );
      if (statusCode < 200 || statusCode >= 300) {
        const msg =
          typeof data?.message === 'string' && data.message
            ? data.message
            : `Request failed (${statusCode})`;
        throw new Error(msg);
      }
      if (!data?.success) {
        throw new Error(data?.message || 'Heartbeat poke did not succeed.');
      }
      return data;
    },
    onSuccess: (_, siteId) => {
      void queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      if (user?.$id) void queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
    },
  });
};

/**
 * Proxies `POST wphubpro/v1/health/push` on the site so the bridge sends fresh health data to the Hub.
 */
export const useRequestSiteHealthRefresh = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: async (siteId: string) => {
      const { statusCode, data } = await executeFunctionWithMeta<Record<string, unknown>>(
        WP_PROXY_FUNCTION_ID,
        {
          siteId,
          endpoint: 'wphubpro/v1/health/push',
          method: 'POST',
          body: {},
        },
        { throwOnHttpError: false, longRunning: true, maxAsyncWaitMs: 120_000 },
      );
      if (statusCode < 200 || statusCode >= 300) {
        const raw = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
        const msg =
          typeof raw.message === 'string' && raw.message.trim()
            ? raw.message.trim()
            : `Request failed (${statusCode})`;
        throw new Error(msg);
      }
      const raw = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
      const message =
        typeof raw.message === 'string' && raw.message.trim()
          ? raw.message.trim()
          : 'Updated health data was sent from the site to the hub.';
      return { message };
    },
    onSuccess: (_, siteId) => {
      void queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      if (user?.$id) void queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
    },
  });
};

export const useSites = () => {
  const { user } = useAuth();

  return useQuery<Site[], Error>({
    queryKey: ['sites', user?.$id],
    queryFn: async () => {
      if (!user?.$id) return [];
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SITES, [
        Query.equal('user_id', user.$id),
        Query.limit(100),
      ]);
      return response.documents.map((doc) => mapSiteDocumentToSite(doc as Record<string, unknown>));
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

      const document = await databases.getDocument(DATABASE_ID, COLLECTIONS.SITES, siteId);

      if ((document as { user_id?: string }).user_id !== user?.$id) {
        throw new Error('No access to this site.');
      }

      return mapSiteDocumentToSite(document as Record<string, unknown>);
    },
    enabled: !!siteId && !!user,
    retry: 1,
  });
};

export const useSitesStatusPoll = (siteIds: string[], intervalMs = STATUS_POLL_INTERVAL_MS) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || siteIds.length === 0) return;
    const id = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
      siteIds.forEach((sid) => void queryClient.invalidateQueries({ queryKey: ['site', sid] }));
    }, intervalMs);
    return () => clearInterval(id);
  }, [siteIds.join(','), user?.$id, intervalMs, queryClient, user, siteIds]);
};

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
      if (site.wpMeta && String(site.wpMeta).trim().length > 2) continue;
      const needsPlugins = isMetaEmpty(site.pluginsMeta);
      const needsThemes = isMetaEmpty(site.themesMeta);
      if (!needsPlugins && !needsThemes) continue;

      triggeredSiteIds.add(site.$id);
      void account
        .createJWT()
        .then((res) => {
          const jwt = typeof res === 'string' ? res : (res as { jwt?: string }).jwt ?? '';
          return executeFunctionWithMeta(
            'fetch-site-meta',
            { siteId: site.$id, jwt },
            { throwOnHttpError: false, longRunning: true, maxAsyncWaitMs: 60_000 },
          );
        })
        .then((res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            void queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
            void queryClient.invalidateQueries({ queryKey: ['site', site.$id] });
            void queryClient.invalidateQueries({ queryKey: ['plugins', site.$id] });
            void queryClient.invalidateQueries({ queryKey: ['themes', site.$id] });
          }
        })
        .catch(() => {
          triggeredSiteIds.delete(site.$id);
        });
    }
  }, [sitesArray.map((s) => s?.$id).join(','), user?.$id, queryClient, sitesArray, user]);
};

/** PageSpeed is refreshed only manually or by session prefetch — not time-based. */
const PAGESPEED_STALE_MS = Infinity;

export type SitePagespeedStrategy = 'desktop' | 'mobile';

export const sitePagespeedQueryKey = (siteId: string, strategy: SitePagespeedStrategy) =>
  ['site-pagespeed', siteId, strategy] as const;

type LegacyStrategyBlock = {
  ok?: boolean;
  scores?: SitePagespeedScores;
  coreWebVitals?: SitePagespeedResult['coreWebVitals'];
  analyzedUrl?: string;
  lighthouseVersion?: string;
  message?: string;
};

/** Appwrite occasionally returns a JSON string body; unwrap once. */
function unwrapJsonBody(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  const t = raw.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return raw;
  }
}

/**
 * New `site-pagespeed` returns one strategy per call. Older deployments returned `{ desktop, mobile }` in one response.
 */
function normalizeSitePagespeedPayload(raw: unknown, strategy: SitePagespeedStrategy): SitePagespeedResult {
  const data = unwrapJsonBody(raw);
  if (!data || typeof data !== 'object') {
    throw new Error('PageSpeed returned an empty or invalid response.');
  }
  const o = data as Record<string, unknown>;

  if (o.success === true && o.scores && typeof o.scores === 'object') {
    const st: SitePagespeedStrategy =
      o.strategy === 'mobile' || o.strategy === 'desktop' ? o.strategy : strategy;
    return {
      success: true,
      strategy: st,
      scores: o.scores as SitePagespeedScores,
      coreWebVitals: o.coreWebVitals as SitePagespeedResult['coreWebVitals'],
      analyzedUrl: typeof o.analyzedUrl === 'string' ? o.analyzedUrl : undefined,
      lighthouseVersion: typeof o.lighthouseVersion === 'string' ? o.lighthouseVersion : undefined,
      message: typeof o.message === 'string' ? o.message : undefined,
    };
  }

  const legacy = o[strategy] as LegacyStrategyBlock | undefined;
  if (legacy) {
    if (legacy.ok === true && legacy.scores && typeof legacy.scores === 'object') {
      return {
        success: true,
        strategy,
        scores: legacy.scores,
        coreWebVitals: legacy.coreWebVitals,
        analyzedUrl:
          (typeof legacy.analyzedUrl === 'string' ? legacy.analyzedUrl : undefined) ||
          (typeof o.analyzedUrl === 'string' ? o.analyzedUrl : undefined),
        lighthouseVersion: typeof legacy.lighthouseVersion === 'string' ? legacy.lighthouseVersion : undefined,
      };
    }
    if (legacy.ok === false && typeof legacy.message === 'string' && legacy.message) {
      throw new Error(legacy.message);
    }
  }

  const topMsg = typeof o.message === 'string' ? o.message : '';
  const legacyHint =
    o.desktop != null || o.mobile != null
      ? ' If this persists, redeploy the latest site-pagespeed function and hard-refresh the app (old bundles expected both strategies in one response).'
      : '';
  throw new Error(
    (topMsg || `PageSpeed did not return ${strategy} scores.`) + legacyHint,
  );
}

export async function fetchSitePagespeedResult(
  siteId: string,
  strategy: SitePagespeedStrategy,
): Promise<SitePagespeedResult> {
  const jwtRes = await account.createJWT();
  const jwt = typeof jwtRes === 'string' ? jwtRes : (jwtRes as { jwt?: string }).jwt ?? '';
  const { data, statusCode } = await executeFunctionWithMeta<unknown>(
    'site-pagespeed',
    { siteId, jwt, strategy },
    { throwOnHttpError: false, longRunning: true, maxAsyncWaitMs: 240_000 },
  );
  if (statusCode < 200 || statusCode >= 300) {
    const parsed = unwrapJsonBody(data);
    const msg =
      parsed && typeof parsed === 'object' && typeof (parsed as { message?: string }).message === 'string'
        ? (parsed as { message: string }).message
        : `PageSpeed request failed (${statusCode})`;
    throw new Error(msg);
  }
  return normalizeSitePagespeedPayload(data, strategy);
}

/**
 * Hydrates PageSpeed from sessionStorage, prefetches desktop+mobile for sites missing data (new tab / new site).
 * Call from the authenticated shell (e.g. MainLayout) with the user’s site list.
 */
export const useSitesPagespeedSessionBootstrap = (sites: Site[] | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const prefetchGen = useRef(0);

  const eligibleKey = useMemo(() => {
    return (sites ?? [])
      .filter((s) => s.enabled !== false && Boolean(s.siteUrl?.trim()))
      .map((s) => s.$id)
      .sort()
      .join('\u0001');
  }, [sites]);

  useEffect(() => {
    if (!user?.$id) return;
    forEachStoredPagespeed(user.$id, (siteId, strategy, data) => {
      queryClient.setQueryData(sitePagespeedQueryKey(siteId, strategy), data);
    });
  }, [user?.$id, queryClient]);

  useEffect(() => {
    if (!user?.$id || !eligibleKey) return;
    const eligible = eligibleKey.split('\u0001').filter(Boolean);
    if (eligible.length === 0) return;

    const pending = eligible.filter((id) => {
      if (isSitePagespeedSessionComplete(user.$id, id)) return false;
      const row = (sites ?? []).find((s) => s.$id === id);
      if (row && hasBothPagespeedStrategiesInPerformanceMeta(row.performanceMeta)) return false;
      return true;
    });
    if (pending.length === 0) return;

    const gen = ++prefetchGen.current;
    void (async () => {
      for (const siteId of pending) {
        if (gen !== prefetchGen.current) return;
        for (const strategy of ['desktop', 'mobile'] as const) {
          if (gen !== prefetchGen.current) return;
          const cached = getPagespeedFromSession(user.$id, siteId, strategy);
          if (cached) {
            queryClient.setQueryData(sitePagespeedQueryKey(siteId, strategy), cached);
            continue;
          }
          const siteRow = (sites ?? []).find((s) => s.$id === siteId);
          const fromMeta = pagespeedResultFromPerformanceMeta(siteRow?.performanceMeta, strategy);
          if (fromMeta) {
            queryClient.setQueryData(sitePagespeedQueryKey(siteId, strategy), fromMeta);
            continue;
          }
          try {
            const data = await fetchSitePagespeedResult(siteId, strategy);
            if (gen !== prefetchGen.current) return;
            setPagespeedInSession(user.$id, siteId, strategy, data);
            queryClient.setQueryData(sitePagespeedQueryKey(siteId, strategy), data);
            void queryClient.invalidateQueries({ queryKey: ['site', siteId] });
            void queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
          } catch {
            /* skip failed strategy; user can retry from site detail */
          }
        }
      }
    })();
  }, [user?.$id, eligibleKey, queryClient, sites]);

  useEffect(() => {
    if (!user?.$id || !sites?.length) return;
    for (const site of sites) {
      if (!site.$id || site.enabled === false) continue;
      for (const strategy of ['desktop', 'mobile'] as const) {
        if (getPagespeedFromSession(user.$id, site.$id, strategy)) continue;
        const fromDoc = pagespeedResultFromPerformanceMeta(site.performanceMeta, strategy);
        if (fromDoc) {
          queryClient.setQueryData(sitePagespeedQueryKey(site.$id, strategy), fromDoc);
        }
      }
    }
  }, [user?.$id, sites, queryClient]);
};

/**
 * Runs PageSpeed for one strategy when `fetchEnabled` is true (typically the active Sitespeed tab).
 * Inactive tab still shows data from React Query cache / session hydration without refetching.
 */
export const useSitePagespeedStrategy = (
  siteId: string | undefined,
  strategy: SitePagespeedStrategy,
  fetchEnabled: boolean,
  /** Latest `sites.performance_meta` from the site document (hydrates cache when session is empty). */
  performanceMeta?: string,
) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const initialFromSession =
    user?.$id && siteId ? getPagespeedFromSession(user.$id, siteId, strategy) : undefined;
  const initialFromDocument = pagespeedResultFromPerformanceMeta(performanceMeta, strategy);

  return useQuery<SitePagespeedResult, Error>({
    queryKey: sitePagespeedQueryKey(siteId ?? '__none__', strategy),
    queryFn: async () => {
      if (!siteId) throw new Error('Site ID is required.');
      const result = await fetchSitePagespeedResult(siteId, strategy);
      if (user?.$id) setPagespeedInSession(user.$id, siteId, strategy, result);
      void queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      if (user?.$id) void queryClient.invalidateQueries({ queryKey: ['sites', user.$id] });
      return result;
    },
    initialData: initialFromSession ?? initialFromDocument,
    enabled: Boolean(siteId && user && fetchEnabled),
    staleTime: PAGESPEED_STALE_MS,
    retry: 0,
  });
};

const APP_ICON_STALE_MS = 10 * 60_000;

export const siteAppIconPreviewQueryKey = (siteId: string) => ['site-app-icon-preview', siteId] as const;

/**
 * Fetches `img#app-icon-preview` src from the site’s public HTML (server-side in Appwrite; avoids CORS).
 */
export const useSiteAppIconPreview = (siteId: string | undefined, siteUrl: string | undefined) => {
  const { user } = useAuth();
  const urlOk = Boolean(siteUrl?.trim());

  return useQuery<SiteAppIconPreviewResult, Error>({
    queryKey: siteAppIconPreviewQueryKey(siteId ?? '__none__'),
    queryFn: async () => {
      if (!siteId) throw new Error('Site ID is required.');
      const jwtRes = await account.createJWT();
      const jwt = typeof jwtRes === 'string' ? jwtRes : (jwtRes as { jwt?: string }).jwt ?? '';
      const { data, statusCode } = await executeFunctionWithMeta<unknown>(
        'site-app-icon-preview',
        { siteId, jwt },
        { throwOnHttpError: false, longRunning: true, maxAsyncWaitMs: 60_000 },
      );
      if (statusCode < 200 || statusCode >= 300) {
        const parsed = unwrapJsonBody(data) as Record<string, unknown> | null;
        const msg =
          parsed && typeof parsed.message === 'string'
            ? parsed.message
            : `App icon preview request failed (${statusCode})`;
        return { success: false as const, message: msg };
      }
      const parsed = unwrapJsonBody(data) as Record<string, unknown> | null;
      if (parsed && parsed.success === true && typeof parsed.src === 'string' && parsed.src.trim()) {
        return {
          success: true as const,
          src: parsed.src.trim(),
          fetchedUrl: typeof parsed.fetchedUrl === 'string' ? parsed.fetchedUrl : undefined,
          source: typeof parsed.source === 'string' ? parsed.source : undefined,
        };
      }
      const msg =
        parsed && typeof parsed.message === 'string' ? parsed.message : 'No app icon preview on this site.';
      return { success: false as const, message: msg };
    },
    enabled: Boolean(siteId && user && urlOk),
    staleTime: APP_ICON_STALE_MS,
    retry: 0,
  });
};
