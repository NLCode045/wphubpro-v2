import type { Site, ConnectionStatus } from '../../types';

/** Appwrite may return large JSON attributes as strings or as already-parsed objects. */
function jsonBlobToOptionalString(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function parseMetaData(doc: Record<string, unknown>): Record<string, unknown> {
  const raw = doc.meta_data ?? doc.metaData;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(String(raw));
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function parseConnectionStatus(doc: Record<string, unknown>): ConnectionStatus | undefined {
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

export const mapSiteDocumentToSite = (doc: Record<string, unknown>): Site => {
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
  let logData: { incoming: unknown[]; outgoing: unknown[] } = { incoming: [], outgoing: [] };
  if (rawLog && typeof rawLog === 'string') {
    try {
      const parsed: unknown = JSON.parse(rawLog);
      if (Array.isArray(parsed)) {
        logData.incoming = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const o = parsed as { incoming?: unknown[]; outgoing?: unknown[] };
        logData.incoming = Array.isArray(o.incoming) ? o.incoming : [];
        logData.outgoing = Array.isArray(o.outgoing) ? o.outgoing : [];
      }
    } catch {
      /* ignore */
    }
  }

  const actionLog = Array.isArray(doc.action_log) ? doc.action_log : undefined;

  return {
    ...(doc as unknown as Site),
    userId: String(doc.user_id ?? doc.userId ?? ''),
    siteName: String(doc.site_name ?? doc.siteName ?? ''),
    siteUrl: String(doc.site_url ?? doc.siteUrl ?? ''),
    status,
    healthStatus,
    lastChecked: String(doc.last_checked ?? doc.lastChecked ?? ''),
    metaData: jsonBlobToOptionalString(doc.meta_data ?? doc.metaData),
    enabled,
    pluginsMeta: jsonBlobToOptionalString(doc.plugins_meta ?? doc.pluginsMeta),
    themesMeta: jsonBlobToOptionalString(doc.themes_meta ?? doc.themesMeta),
    wpMeta: jsonBlobToOptionalString(doc.wp_meta ?? doc.wpMeta),
    healthMeta: jsonBlobToOptionalString(doc.health_meta ?? doc.healthMeta),
    performanceMeta: jsonBlobToOptionalString(doc.performance_meta ?? doc.performanceMeta),
    connectionStatus: connStatus,
    logData: logData as Site['logData'],
    actionLog,
  };
};
