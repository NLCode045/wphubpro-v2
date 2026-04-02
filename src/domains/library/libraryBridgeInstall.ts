import { executeFunctionWithMeta } from '@/integrations/appwrite/executeFunction';
import type { WpPluginInfo, WpThemeInfo } from '@/services/wordpress';
import type { LibraryItem } from '@/types';

const WP_PROXY_FUNCTION_ID = import.meta.env.APPWRITE_FUNCTION_WP_PROXY ?? 'wp-proxy';

export type LibraryBridgeInstallPlan =
  | { kind: 'plugin-install-version'; slug: string; version: string }
  | { kind: 'theme-install-zip'; zipUrl: string }
  | { kind: 'unsupported'; message: string };

function normalizeHttpsZipUrl(url: string): string | null {
  const t = url.trim();
  if (!t.startsWith('https://')) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** WordPress.org theme packages: `https://downloads.wordpress.org/theme/{slug}.{version}.zip` */
function themeOrgZipFallback(slug: string, version: string): string | null {
  const s = slug.trim().toLowerCase();
  const v = version.trim();
  if (!s || !v || v === 'latest') return null;
  return `https://downloads.wordpress.org/theme/${encodeURIComponent(s)}.${encodeURIComponent(v)}.zip`;
}

/**
 * Maps a library row to a wp-proxy → bridge call. Unsupported combinations return a user-facing reason.
 */
export function planLibraryBridgeInstall(
  item: LibraryItem,
  itemKind: 'plugin' | 'theme',
  routeSlug: string,
  wpPluginInfo: WpPluginInfo | null | undefined,
  wpThemeInfo: WpThemeInfo | null | undefined,
): LibraryBridgeInstallPlan {
  const wpSlug = (item.wpSlug ?? routeSlug).trim().toLowerCase();
  if (!wpSlug) {
    return { kind: 'unsupported', message: 'Missing plugin or theme slug for this library item.' };
  }

  if (itemKind === 'plugin') {
    if (item.source === 'official') {
      const v =
        item.version === 'latest'
          ? (wpPluginInfo?.version ?? '').trim()
          : (item.version ?? '').trim();
      if (!v || v === 'latest') {
        return {
          kind: 'unsupported',
          message:
            'Could not resolve a concrete plugin version. Wait for WordPress.org data to load or pin an exact version.',
        };
      }
      return { kind: 'plugin-install-version', slug: wpSlug, version: v };
    }
    return {
      kind: 'unsupported',
      message:
        'One-click install from the Hub supports WordPress.org plugins only. For uploaded or custom ZIP plugins, install from the WordPress admin or the site screen.',
    };
  }

  if (item.source === 'remote') {
    const zipUrl = normalizeHttpsZipUrl(item.remoteUrl ?? '');
    if (!zipUrl) {
      return {
        kind: 'unsupported',
        message: 'Theme remote source must be an HTTPS URL to a ZIP file.',
      };
    }
    return { kind: 'theme-install-zip', zipUrl };
  }

  if (item.source === 'official') {
    let zipUrl = '';
    if (item.version === 'latest') {
      const dl = wpThemeInfo?.download_link ? normalizeHttpsZipUrl(wpThemeInfo.download_link) : null;
      if (dl) zipUrl = dl;
      if (!zipUrl && wpThemeInfo?.version && wpThemeInfo.versions) {
        const u = wpThemeInfo.versions[wpThemeInfo.version];
        zipUrl = u ? normalizeHttpsZipUrl(u) ?? '' : '';
      }
    } else {
      const ver = (item.version ?? '').trim();
      const fromMap = wpThemeInfo?.versions?.[ver];
      if (fromMap) zipUrl = normalizeHttpsZipUrl(fromMap) ?? '';
      if (!zipUrl && wpThemeInfo?.version === ver && wpThemeInfo.download_link) {
        zipUrl = normalizeHttpsZipUrl(wpThemeInfo.download_link) ?? '';
      }
      if (!zipUrl) {
        const fb = themeOrgZipFallback(wpSlug, ver);
        if (fb) zipUrl = fb;
      }
    }
    if (!zipUrl) {
      return {
        kind: 'unsupported',
        message:
          'Could not resolve a theme ZIP for this version. Pin a WordPress.org version or add an HTTPS ZIP URL.',
      };
    }
    return { kind: 'theme-install-zip', zipUrl };
  }

  return {
    kind: 'unsupported',
    message:
      'Uploaded theme ZIPs cannot be fetched by the bridge yet. Add an HTTPS ZIP (remote) or install from the site.',
  };
}

function parseWpProxyFailureMessage(data: unknown, statusCode: number): string {
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
    if (typeof o.error === 'string' && o.error.trim()) return o.error.trim();
  }
  if (statusCode > 0) return `Install failed (HTTP ${statusCode}).`;
  return 'Install failed.';
}

export async function runLibraryBridgeInstallOnSite(
  siteId: string,
  plan: LibraryBridgeInstallPlan,
): Promise<{ ok: boolean; message: string }> {
  if (plan.kind === 'unsupported') {
    return { ok: false, message: plan.message };
  }

  const payload =
    plan.kind === 'plugin-install-version'
      ? {
          siteId,
          endpoint: 'wphubpro/v1/plugins/manage/install-version',
          method: 'POST',
          body: { slug: plan.slug, version: plan.version },
        }
      : {
          siteId,
          endpoint: 'wphubpro/v1/themes/manage/install-from-zip',
          method: 'POST',
          body: { zip_url: plan.zipUrl },
        };

  try {
    const { statusCode, data } = await executeFunctionWithMeta<unknown>(
      WP_PROXY_FUNCTION_ID,
      payload,
      {
        throwOnHttpError: false,
        longRunning: true,
        maxAsyncWaitMs: 180_000,
      },
    );

    if (statusCode >= 200 && statusCode < 300) {
      return { ok: true, message: 'Installed.' };
    }

    return { ok: false, message: parseWpProxyFailureMessage(data, statusCode) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
