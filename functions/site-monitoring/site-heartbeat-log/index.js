/**
 * site-heartbeat-log: Logs incoming heartbeats to sites.log_data.incoming.
 * Called by site-heartbeat after successful validation.
 */
const sdk = require('node-appwrite');
const { hasAppwriteBootstrap } = require('../../subscriptions/stripe-consumer/lib/appwriteEnv');
const { createServerClientAndDatabases } = require('../../database/fetchAppwriteCredentialsFromGateway');

function parsePayload(req) {
  if (!req) return {};
  let body = req.body;
  if (body && typeof body === 'object') {
    if (body.siteId || body.site_id) return body;
    if (typeof body.body === 'string') {
      try {
        const parsed = JSON.parse(body.body.trim());
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }
    if (typeof body.data === 'string') {
      try {
        const parsed = JSON.parse(body.data.trim());
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }
    return body;
  }
  if (req.payload && typeof req.payload === 'object') return req.payload;
  const raw = req.payload || req.bodyRaw || req.body;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      return JSON.parse(trimmed);
    } catch {
      return {};
    }
  }
  return {};
}

module.exports = async ({ req, res, log, error }) => {
  if (!hasAppwriteBootstrap()) {
    error('[site-heartbeat-log] Missing env.');
    return res.json({ success: false, message: 'Function not configured' }, 500);
  }

  let body;
  try {
    body = parsePayload(req);
  } catch (e) {
    return res.json({ success: false, message: 'Invalid JSON' }, 400);
  }

  const siteId = body.siteId || body.site_id;
  const time = body.time || new Date().toISOString();

  if (!siteId) {
    log('[site-heartbeat-log] Missing siteId');
    return res.json({ success: false, message: 'siteId required' }, 400);
  }

  try {
    const { databases } = await createServerClientAndDatabases(log, error);

    const siteDoc = await databases.getDocument('platform_db', 'sites', siteId);
    const raw = siteDoc.log_data || siteDoc.incoming_log || '{}';
    let logData = { incoming: [], outgoing: [] };
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        logData.incoming = parsed;
      } else if (parsed && typeof parsed === 'object') {
        logData.incoming = Array.isArray(parsed.incoming) ? parsed.incoming : [];
        logData.outgoing = Array.isArray(parsed.outgoing) ? parsed.outgoing : [];
      }
    } catch {}

    const MAX_LOG_DATA_SIZE = 19500;

    logData.incoming.push({ type: 'heartbeat', time });
    if (logData.incoming.length > 50) {
      logData.incoming = logData.incoming.slice(-50);
    }

    let logStr = JSON.stringify(logData);
    while (logStr.length > MAX_LOG_DATA_SIZE) {
      if (logData.incoming.length > logData.outgoing.length && logData.incoming.length > 0) {
        logData.incoming.shift();
      } else if (logData.outgoing.length > 0) {
        logData.outgoing.shift();
      } else if (logData.incoming.length > 0) {
        logData.incoming.shift();
      } else {
        logData = { incoming: [], outgoing: [] };
        logStr = '{"incoming":[],"outgoing":[]}';
        break;
      }
      logStr = JSON.stringify(logData);
    }

    await databases.updateDocument('platform_db', 'sites', siteId, {
      log_data: logStr,
    });

    log(`[site-heartbeat-log] Site ${siteId} heartbeat logged at ${time}`);
    return res.json({ success: true });
  } catch (e) {
    error(`[site-heartbeat-log] Error: ${e.message}`);
    return res.json({ success: false, message: e.message }, 500);
  }
};
