/**
 * sync-site-meta: Bridge pushes plugins_meta and themes_meta to sites collection.
 * Called by WordPress bridge with site_id + secret. Validates secret against decrypted api_key.
 */
const sdk = require('node-appwrite');
const crypto = require('crypto');

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

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

  if (!endpoint || !projectId || !apiKey) {
    const missing = [];
    if (!endpoint) missing.push('APPWRITE_ENDPOINT');
    if (!projectId) missing.push('APPWRITE_PROJECT_ID');
    if (!apiKey) missing.push('APPWRITE_API_KEY');
    error(`[sync-site-meta] Missing env: ${missing.join(', ')}.`);
    return fail(res, `Function environment is not configured. Missing: ${missing.join(', ')}.`, 500);
  }

  if (!ENCRYPTION_KEY) {
    error('[sync-site-meta] Missing ENCRYPTION_KEY.');
    return fail(res, 'Function environment is not configured. Missing: ENCRYPTION_KEY.', 500);
  }

  let body;
  try {
    body = parsePayload(req);
  } catch (e) {
    return fail(res, 'Invalid JSON body.', 400);
  }

  const siteId = body.siteId || body.site_id;
  const { secret, plugins_meta, themes_meta, wp_meta } = body;
  if (!siteId) {
    return fail(res, 'siteId or site_id is required.', 400);
  }

  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    return fail(res, 'secret is required in request body.', 400);
  }

  const hasPlugins = plugins_meta !== undefined && plugins_meta !== null;
  const hasThemes = themes_meta !== undefined && themes_meta !== null;
  const hasWpMeta = wp_meta !== undefined && wp_meta !== null;
  if (!hasPlugins && !hasThemes && !hasWpMeta) {
    return fail(res, 'At least one of plugins_meta, themes_meta or wp_meta is required.', 400);
  }

  try {
    const adminClient = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new sdk.Databases(adminClient);

    const siteDoc = await databases.getDocument('platform_db', 'sites', siteId);
    // Validate against site_secret first (Bridge→Hub), then api_key (legacy)
    let storedSiteSecret = siteDoc.site_secret ?? '';
    let storedApiKey = siteDoc.api_key ?? siteDoc.apiKey ?? '';

    const looksEncrypted = (s) => s && typeof s === 'string' && s.includes(':') && s.split(':').length === 3;
    if (storedSiteSecret && looksEncrypted(storedSiteSecret)) {
      storedSiteSecret = decryptApiKey(storedSiteSecret, ENCRYPTION_KEY);
    }
    if (storedApiKey && looksEncrypted(storedApiKey)) {
      storedApiKey = decryptApiKey(storedApiKey, ENCRYPTION_KEY);
    }

    const validSecret = (storedSiteSecret && typeof storedSiteSecret === 'string' && storedSiteSecret.trim()) || (storedApiKey && typeof storedApiKey === 'string' && storedApiKey.trim());
    if (!validSecret) {
      log(`[sync-site-meta] Site ${siteId} has no site_secret or api_key.`);
      return fail(res, 'Site has no API key. Connect via WPHubPro Bridge first.', 400);
    }

    let incomingSecret = secret;
    if (incomingSecret && looksEncrypted(incomingSecret)) {
      incomingSecret = decryptApiKey(incomingSecret, ENCRYPTION_KEY);
    }

    const matchesSiteSecret = storedSiteSecret && timingSafeEqual((incomingSecret || '').trim(), storedSiteSecret.trim());
    const matchesApiKey = storedApiKey && timingSafeEqual((incomingSecret || '').trim(), storedApiKey.trim());
    if (!incomingSecret || typeof incomingSecret !== 'string' || (!matchesSiteSecret && !matchesApiKey)) {
      log(`[sync-site-meta] Secret mismatch for site ${siteId}.`);
      return fail(res, 'Invalid secret.', 401);
    }

    const updates = {};
    if (hasPlugins) {
      updates.plugins_meta = typeof plugins_meta === 'string' ? plugins_meta : JSON.stringify(plugins_meta);
    }
    if (hasThemes) {
      updates.themes_meta = typeof themes_meta === 'string' ? themes_meta : JSON.stringify(themes_meta);
    }
    if (hasWpMeta) {
      updates.wp_meta = typeof wp_meta === 'string' ? wp_meta : JSON.stringify(wp_meta);
    }

    const now = new Date().toISOString();
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
    logData.incoming.push({ type: 'meta_sync', time: now, plugins: hasPlugins, themes: hasThemes, wp_meta: hasWpMeta });
    if (logData.incoming.length > 50) logData.incoming = logData.incoming.slice(-50);
    updates.log_data = JSON.stringify(logData);

    await databases.updateDocument('platform_db', 'sites', siteId, updates);
    log(`[sync-site-meta] Updated site ${siteId} (plugins: ${hasPlugins}, themes: ${hasThemes}, wp_meta: ${hasWpMeta})`);
    return ok(res, { success: true, message: 'Sync completed.' });
  } catch (e) {
    error(`[sync-site-meta] Error: ${e.message}`);
    return fail(res, e.message, 500);
  }
};
