/**
 * bridge-site-log-action: Appends a log_action entry to sites.action_log (JSON array in string column).
 * Body: siteId, secret, log_action: { timestamp, action, endpoint, request, response } (matches WPHubPro bridge PHP).
 */
const sdk = require('node-appwrite');
const crypto = require('crypto');
const { hasAppwriteBootstrap } = require('../../subscriptions/stripe-consumer/lib/appwriteEnv');
const { createServerClientAndDatabases } = require('../../database/fetchAppwriteCredentialsFromGateway');

const ACTION_LOG_MAX_LEN = 3950;

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

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

function decryptApiKey(encrypted, key) {
  if (!encrypted || typeof encrypted !== 'string' || !key) return encrypted;
  const parts = encrypted.split(':');
  if (parts.length !== 3) return encrypted;
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedBuf = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const derivedKey = crypto.createHash('sha256').update(String(key), 'utf8').digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encryptedBuf), decipher.final()]).toString('utf8');
  } catch {
    return encrypted;
  }
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function looksEncrypted(s) {
  return s && typeof s === 'string' && s.includes(':') && s.split(':').length === 3;
}

function capPart(value, maxJson = 900) {
  if (value === undefined) return null;
  let serialized;
  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    serialized = String(value);
  }
  if (serialized.length <= maxJson) {
    return typeof value === 'string' ? value : JSON.parse(serialized);
  }
  return {
    _truncated: true,
    _len: serialized.length,
    preview: serialized.slice(0, Math.floor(maxJson * 0.6)),
  };
}

function parseActionLog(raw) {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

module.exports = async ({ req, res, log, error }) => {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

  if (!hasAppwriteBootstrap()) {
    error('[bridge-site-log-action] Missing Appwrite bootstrap env.');
    return fail(res, 'Function environment is not configured.', 500);
  }

  if (!ENCRYPTION_KEY) {
    error('[bridge-site-log-action] Missing ENCRYPTION_KEY.');
    return fail(res, 'Function environment is not configured. Missing: ENCRYPTION_KEY.', 500);
  }

  let body;
  try {
    body = parsePayload(req);
  } catch {
    return fail(res, 'Invalid JSON body.', 400);
  }

  const siteId = body.siteId || body.site_id;
  const secret = body.secret;

  const src = body.log_action && typeof body.log_action === 'object' ? body.log_action : body;
  const timestamp = src.timestamp;
  const action = src.action;
  const endpointPath = src.endpoint;
  const requestPart = src.request;
  const responsePart = src.response;

  if (!siteId) {
    return fail(res, 'siteId is required.', 400);
  }
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    return fail(res, 'secret is required in request body.', 400);
  }
  if (timestamp === undefined || timestamp === null || String(timestamp).trim() === '') {
    return fail(res, 'log_action.timestamp is required.', 400);
  }
  if (action === undefined || action === null || String(action).trim() === '') {
    return fail(res, 'log_action.action is required.', 400);
  }
  if (endpointPath === undefined || endpointPath === null || String(endpointPath).trim() === '') {
    return fail(res, 'log_action.endpoint is required.', 400);
  }
  if (requestPart === undefined) {
    return fail(res, 'log_action.request is required.', 400);
  }
  if (responsePart === undefined) {
    return fail(res, 'log_action.response is required.', 400);
  }

  const entry = {
    timestamp: typeof timestamp === 'string' ? timestamp : String(timestamp),
    action: String(action),
    endpoint: String(endpointPath),
    request: capPart(requestPart),
    response: capPart(responsePart),
  };

  try {
    const { databases } = await createServerClientAndDatabases(log, error);

    const siteDoc = await databases.getDocument('platform_db', 'sites', siteId);
    let storedSiteSecret = siteDoc.site_secret ?? '';
    let storedApiKey = siteDoc.api_key ?? siteDoc.apiKey ?? siteDoc.password ?? '';

    if (storedSiteSecret && looksEncrypted(storedSiteSecret)) {
      storedSiteSecret = decryptApiKey(storedSiteSecret, ENCRYPTION_KEY);
    }
    if (storedApiKey && looksEncrypted(storedApiKey)) {
      storedApiKey = decryptApiKey(storedApiKey, ENCRYPTION_KEY);
    }

    const validSecret =
      (storedSiteSecret && typeof storedSiteSecret === 'string' && storedSiteSecret.trim()) ||
      (storedApiKey && typeof storedApiKey === 'string' && storedApiKey.trim());
    if (!validSecret) {
      log(`[bridge-site-log-action] Site ${siteId} has no site_secret or api_key.`);
      return fail(res, 'Site has no API key. Connect via WPHubPro Bridge first.', 400);
    }

    let incomingSecret = secret;
    if (incomingSecret && looksEncrypted(incomingSecret)) {
      incomingSecret = decryptApiKey(incomingSecret, ENCRYPTION_KEY);
    }

    const matchesSiteSecret =
      storedSiteSecret && timingSafeEqual((incomingSecret || '').trim(), storedSiteSecret.trim());
    const matchesApiKey = storedApiKey && timingSafeEqual((incomingSecret || '').trim(), storedApiKey.trim());
    if (!incomingSecret || typeof incomingSecret !== 'string' || (!matchesSiteSecret && !matchesApiKey)) {
      log(`[bridge-site-log-action] Secret mismatch for site ${siteId}.`);
      return fail(res, 'Invalid secret.', 401);
    }

    let actionLog = parseActionLog(siteDoc.action_log);
    actionLog.push(entry);

    let serialized = JSON.stringify(actionLog);
    while (serialized.length > ACTION_LOG_MAX_LEN && actionLog.length > 1) {
      actionLog.shift();
      serialized = JSON.stringify(actionLog);
    }

    if (serialized.length > ACTION_LOG_MAX_LEN && actionLog.length === 1) {
      const e = actionLog[0];
      const shrunk = {
        timestamp: e.timestamp,
        action: e.action,
        endpoint: e.endpoint,
        request: capPart(e.request, 200),
        response: capPart(e.response, 200),
      };
      actionLog = [shrunk];
      serialized = JSON.stringify(actionLog);
      if (serialized.length > ACTION_LOG_MAX_LEN) {
        return fail(res, 'log_action entry too large for action_log column.', 413);
      }
    }

    await databases.updateDocument('platform_db', 'sites', siteId, {
      action_log: serialized,
    });

    log(`[bridge-site-log-action] Appended action "${entry.action}" for site ${siteId}`);
    return ok(res, { success: true, message: 'Log appended.' });
  } catch (e) {
    error(`[bridge-site-log-action] Error: ${e.message}`);
    return fail(res, e.message, 500);
  }
};
