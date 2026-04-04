import { Site, ConnectionStatus } from '../../types';

function parseMetaData(doc: Record<string, any>): Record<string, unknown> {
  const raw = doc.meta_data ?? doc.metaData;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function parseConnectionStatus(doc: Record<string, any>): ConnectionStatus | undefined {
  const status = doc.bridge_status ?? doc.bridgeStatus;
  const heartbeatAt = doc.heartbeat_updated_at ?? doc.heartbeatUpdatedAt ?? '';
  if (!status || status !== 'connected') {
    return status === 'disconnected'
      ? { status: 'disconnected', heartbeatUpdatedAt: String(heartbeatAt) }
      : undefined;
  }
  return {
    status: 'connected',
    heartbeatUpdatedAt: String(heartbeatAt),
  };
}

export const mapSiteDocumentToSite = (doc: Record<string, any>): Site => {
  const hasCredentials = !!(doc.api_key || doc.apiKey);
  const meta = parseMetaData(doc);
  const connStatus = parseConnectionStatus(doc);

  const status: 'connected' | 'disconnected' = connStatus
    ? connStatus.status
    : doc.bridge_status === 'connected' || doc.bridgeStatus === 'connected'
      ? 'connected'
      : doc.bridge_status === 'disconnected' || doc.bridgeStatus === 'disconnected'
        ? 'disconnected'
        : doc.status === 'connected'
          ? 'connected'
          : doc.status === 'disconnected'
            ? 'disconnected'
            : 'disconnected';

  const healthStatus: 'healthy' | 'bad' =
    doc.health_status === 'healthy' || doc.health_status === 'bad'
      ? doc.health_status
      : hasCredentials
        ? 'healthy'
        : 'bad';

  const enabled = meta.enabled !== false;

  const rawLog = doc.log_data ?? doc.logData ?? doc.incoming_log ?? doc.incomingLog;
  let logData: { incoming: any[]; outgoing: any[] } = { incoming: [], outgoing: [] };
  if (rawLog && typeof rawLog === 'string') {
    try {
      const parsed = JSON.parse(rawLog);
      if (Array.isArray(parsed)) {
        logData.incoming = parsed;
      } else if (parsed && typeof parsed === 'object') {
        logData.incoming = Array.isArray(parsed.incoming) ? parsed.incoming : [];
        logData.outgoing = Array.isArray(parsed.outgoing) ? parsed.outgoing : [];
      }
    } catch {}
  }

  const actionLog = Array.isArray(doc.action_log) ? doc.action_log : undefined;

  return {
    ...(doc as Site),
    userId: doc.user_id ?? doc.userId ?? '',
    siteName: doc.site_name ?? doc.siteName ?? '',
    siteUrl: doc.site_url ?? doc.siteUrl ?? '',
    status,
    healthStatus,
    lastChecked: doc.last_checked ?? doc.lastChecked ?? '',
    metaData: doc.meta_data ?? doc.metaData ?? undefined,
    enabled,
    pluginsMeta: doc.plugins_meta ?? doc.pluginsMeta ?? undefined,
    themesMeta: doc.themes_meta ?? doc.themesMeta ?? undefined,
    wpMeta: doc.wp_meta ?? doc.wpMeta ?? undefined,
    healthMeta: doc.health_meta ?? doc.healthMeta ?? undefined,
    connectionStatus: connStatus,
    logData,
    actionLog,
  };
};
