import { parseActionLogForAudit, useRequestBridgeHeartbeatPoke, useSiteAppIconPreview } from '@/domains/sites';
import { useNotificationContext } from '@/context/useNotificationContext';
import { formatRelativeHeartbeatLabel } from '@/lib/formatRelativeHeartbeat.ts';
import type { PluginMetaItem, Site } from '@/types';
import SiteActionHistoryList from '@/views/sites/detail/SiteActionHistoryList';
import SiteHealthScoreDonut from '@/views/sites/detail/SiteHealthScoreDonut.tsx';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap';
import { MdFlashOff, MdFlashOn } from 'react-icons/md';
import { TbExternalLink, TbWorld } from 'react-icons/tb';

type WpMetaParsed = {
  wp_version?: string;
  php_version?: string;
  bridge_version?: string;
  wphubpro_bridge_version?: string;
};

function parseWpMeta(site: Site): WpMetaParsed | null {
  const raw = site.wpMeta;
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as WpMetaParsed) : null;
  } catch {
    return null;
  }
}

/** Installed bridge version from `plugins_meta` when `wp_meta.bridge_version` is not synced yet. */
function bridgeVersionFromPluginsMeta(pluginsMeta: string | undefined): string | null {
  if (!pluginsMeta?.trim()) return null;
  try {
    const parsed = JSON.parse(pluginsMeta) as unknown;
    if (!Array.isArray(parsed)) return null;
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const o = item as PluginMetaItem;
      const file = typeof o.file === 'string' ? o.file.toLowerCase() : '';
      const name = typeof o.name === 'string' ? o.name.toLowerCase() : '';
      if (
        file.includes('wphubpro-bridge') ||
        name.includes('wphub pro bridge') ||
        name.includes('wphubpro bridge')
      ) {
        const v = typeof o.version === 'string' ? o.version.trim() : '';
        return v || null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeSiteUrl(siteUrl: string): string {
  const t = siteUrl.trim();
  if (!t) return '';
  return t.startsWith('http://') || t.startsWith('https://') ? t : `https://${t}`;
}

function wpAdminUrl(siteUrl: string): string {
  const base = normalizeSiteUrl(siteUrl).replace(/\/$/, '');
  return base ? `${base}/wp-admin` : '';
}

function siteFaviconUrl(normalizedSiteUrl: string): string | null {
  if (!normalizedSiteUrl) return null;
  try {
    const host = new URL(normalizedSiteUrl).hostname;
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  } catch {
    return null;
  }
}

type SiteDetailSidebarCardProps = {
  site: Site;
  onViewFullLogs?: () => void;
};

const CONNECTED_FLASH_COLOR = '#ea580c';

type SidebarFaviconPhase = 'site' | 'globe';

const SiteDetailSidebarCard = ({ site, onViewFullLogs }: SiteDetailSidebarCardProps) => {
  const { showNotification } = useNotificationContext();
  const pokeHeartbeat = useRequestBridgeHeartbeatPoke();
  const [faviconPhase, setFaviconPhase] = useState<SidebarFaviconPhase>('site');
  const [appIconLoadError, setAppIconLoadError] = useState(false);
  const appIconQ = useSiteAppIconPreview(site.$id, site.siteUrl);
  const appIconSrc = appIconQ.data?.success === true ? appIconQ.data.src : undefined;
  const auditLines = useMemo(() => parseActionLogForAudit(site.actionLog), [site.actionLog]);
  const wpMeta = parseWpMeta(site);
  const siteName = site.siteName?.trim() || 'Unnamed site';
  const siteUrl = site.siteUrl?.trim() || '';
  const fullUrl = normalizeSiteUrl(siteUrl);
  const adminUrl = wpAdminUrl(siteUrl);

  useEffect(() => {
    const href = fullUrl ? siteFaviconUrl(fullUrl) : null;
    setFaviconPhase(href ? 'site' : 'globe');
  }, [site.$id, fullUrl]);

  useEffect(() => {
    setAppIconLoadError(false);
  }, [site.$id, appIconSrc]);
  const isConnected = site.status === 'connected';
  const hb = site.connectionStatus?.heartbeatUpdatedAt;
  const { heartbeatRelative, heartbeatAbsoluteTitle } = useMemo(() => {
    if (!hb) return { heartbeatRelative: null as string | null, heartbeatAbsoluteTitle: null as string | null };
    const d = new Date(hb);
    if (Number.isNaN(d.getTime())) return { heartbeatRelative: null, heartbeatAbsoluteTitle: null };
    return {
      heartbeatRelative: formatRelativeHeartbeatLabel(hb),
      heartbeatAbsoluteTitle: d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
    };
  }, [hb]);

  const wpVersion = wpMeta?.wp_version || site.wpVersion || '—';
  const phpVersion = wpMeta?.php_version || site.phpVersion || '—';
  const bridgeVersion =
    (wpMeta?.bridge_version ?? wpMeta?.wphubpro_bridge_version)?.trim() ||
    bridgeVersionFromPluginsMeta(site.pluginsMeta) ||
    '—';

  const canPokeHeartbeat =
    Boolean(site.siteUrl?.trim()) && site.enabled !== false && !pokeHeartbeat.isPending;

  const siteFaviconHref = fullUrl ? siteFaviconUrl(fullUrl) : null;
  const useAppIconAvatar = Boolean(appIconSrc && !appIconLoadError);
  const showSiteFaviconImg = !useAppIconAvatar && faviconPhase === 'site' && Boolean(siteFaviconHref);

  return (
    <>
    <div className="position-sticky align-self-start z-3" style={{ top: '0.75rem' }}>
    <Card className="bg-dark text-white border-secondary border-opacity-25 shadow">
      <CardHeader className="d-flex flex-wrap align-items-start justify-content-between gap-2 border-secondary border-opacity-25 bg-transparent text-white">
        <CardTitle as="h4" className="mb-0 text-white">
          Site details
        </CardTitle>
        <div className="d-flex flex-column align-items-end text-end flex-shrink-0 ms-auto">
          <div
            className="d-flex align-items-center gap-1 flex-wrap justify-content-end"
            title={
              heartbeatAbsoluteTitle
                ? `${heartbeatAbsoluteTitle}. Click the lightning icon to ping the bridge.`
                : 'Click the lightning icon to ping the bridge and refresh the connection.'
            }
          >
            <button
              type="button"
              className="btn btn-link p-0 m-0 border-0 bg-transparent shadow-none lh-1 d-inline-flex align-items-center text-decoration-none"
              style={{ color: 'inherit' }}
              disabled={!canPokeHeartbeat}
              aria-label="Ping bridge: ask WordPress to send a heartbeat and restore connection"
              title="Ping bridge (heartbeat)"
              onClick={() => {
                pokeHeartbeat.mutate(site.$id, {
                  onSuccess: (data) => {
                    showNotification({
                      title: 'Connection ping',
                      message: data?.message ?? 'Bridge ping sent.',
                      variant: 'success',
                      delay: 4000,
                    });
                  },
                  onError: (err) => {
                    showNotification({
                      title: 'Connection ping',
                      message: err instanceof Error ? err.message : 'Request failed.',
                      variant: 'danger',
                      delay: 6000,
                    });
                  },
                });
              }}
            >
              {isConnected ? (
                <MdFlashOn style={{ fontSize: '1.35rem', color: CONNECTED_FLASH_COLOR }} aria-hidden />
              ) : (
                <MdFlashOff style={{ fontSize: '1.35rem', color: 'rgba(255,255,255,0.45)' }} aria-hidden />
              )}
            </button>
            <span className="fs-xs text-white fw-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
              {heartbeatRelative ? (
                <span className="text-white-50 fw-normal"> · {heartbeatRelative}</span>
              ) : null}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="d-flex align-items-center mb-4">
          <div className="me-2 flex-shrink-0">
            <span
              className="rounded-circle bg-white d-inline-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
              style={{ width: 48, height: 48, lineHeight: 0 }}
              aria-hidden
            >
              {useAppIconAvatar ? (
                <img
                  key={appIconSrc}
                  src={appIconSrc}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-circle d-block"
                  style={{ objectFit: 'contain' }}
                  onError={() => setAppIconLoadError(true)}
                />
              ) : showSiteFaviconImg ? (
                <img
                  key={siteFaviconHref}
                  src={siteFaviconHref!}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-circle d-block"
                  style={{ objectFit: 'contain' }}
                  onError={() => setFaviconPhase('globe')}
                />
              ) : (
                <TbWorld
                  size={28}
                  color="#6c757d"
                  aria-hidden
                  style={{ display: 'block', flexShrink: 0 }}
                />
              )}
            </span>
          </div>
          <div className="min-w-0 flex-grow-1">
            <h5 className="mb-1 text-truncate text-white" title={siteName}>
              {siteName}
            </h5>
            <p className="text-white-50 mb-0 fs-xs text-break">Site ID · {site.$id}</p>
          </div>
        </div>

        <div className="d-flex align-items-start gap-3 mb-4">
          <ul className="list-unstyled text-white-50 mb-0 flex-grow-1 min-w-0">
            {fullUrl ? (
              <li className="mb-3">
                <div className="d-flex align-items-start gap-2">
                  <div className="avatar-xs avatar-img-size fs-24 flex-shrink-0">
                    <span className="avatar-title bg-white bg-opacity-10 text-white fs-sm rounded-circle d-inline-flex align-items-center justify-content-center border border-white border-opacity-10">
                      <TbExternalLink />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="fs-xxs text-uppercase text-white-50 mb-0 fw-semibold">Visit site</p>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-light link-offset-1 fw-medium text-break"
                    >
                      {siteUrl}
                    </a>
                  </div>
                </div>
              </li>
            ) : null}
            {adminUrl ? (
              <li className="mb-3">
                <div className="d-flex align-items-start gap-2">
                  <div className="avatar-xs avatar-img-size fs-24 flex-shrink-0">
                    <span className="avatar-title bg-white bg-opacity-10 text-white fs-sm rounded-circle d-inline-flex align-items-center justify-content-center border border-white border-opacity-10">
                      <TbExternalLink />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="fs-xxs text-uppercase text-white-50 mb-0 fw-semibold">WordPress admin</p>
                    <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="link-light link-offset-1 fw-medium">
                      Open wp-admin
                    </a>
                  </div>
                </div>
              </li>
            ) : null}
          </ul>
          <SiteHealthScoreDonut site={site} size={42} ringColor={CONNECTED_FLASH_COLOR} showHeading />
        </div>

        <hr className="my-3 border-secondary border-opacity-50" />

        {site.enabled === false ? (
          <div className="d-flex flex-wrap gap-2 mb-3">
            <span className="badge badge-soft-light badge-label text-dark">Disabled</span>
          </div>
        ) : null}

        <div className="rounded bg-white bg-opacity-10 border border-white border-opacity-10 p-3">
          <p className="fs-xxs text-uppercase text-white-50 fw-semibold mb-2">Technical</p>
          <div className="row g-2 small text-white">
            <div className="col-6">
              <span className="text-white-50 d-block fs-xs">WordPress</span>
              <span className="fw-medium">{wpVersion}</span>
            </div>
            <div className="col-6">
              <span className="text-white-50 d-block fs-xs">PHP</span>
              <span className="fw-medium">{phpVersion}</span>
            </div>
            <div className="col-12">
              <span className="text-white-50 d-block fs-xs">WPHub Pro Bridge</span>
              <span className="fw-medium">{bridgeVersion}</span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
    </div>

    <Card className="mt-3 bg-dark text-white border-secondary border-opacity-25 shadow">
      <CardHeader className="border-secondary border-opacity-25 bg-transparent text-white py-3">
        <CardTitle as="h5" className="mb-0 text-white fs-base">
          Action history
        </CardTitle>
        <p className="text-white-50 fs-xxs mb-0 mt-1">Plugin and theme changes from the bridge</p>
      </CardHeader>
      <CardBody className="pt-0" style={{ maxHeight: '22rem', overflowY: 'auto' }}>
        <SiteActionHistoryList
          lines={auditLines}
          emptyText="No plugin or theme actions recorded yet."
          variant="sidebar-dark"
        />
        {onViewFullLogs ? (
          <Button variant="link" className="link-light p-0 mt-3 fs-xs" onClick={onViewFullLogs}>
            Bridge & API logs →
          </Button>
        ) : null}
      </CardBody>
    </Card>
    </>
  );
};

export default SiteDetailSidebarCard;
