/**
 * site-health: Bridge POSTs Health::get_health_status() + site_id + secret.
 * Validates secret, stores the health payload as JSON string in sites.health_meta.
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

function extractHealthSnapshot(body) {
  const skip = new Set(['site_id', 'siteId', 'secret']);
  const out = {};
  for (const [k, v] of Object.entries(body)) {
    if (!skip.has(k)) out[k] = v;
  }
  return out;
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
    error(`[site-health] Missing env: ${missing.join(', ')}.`);
    return fail(res, `Function environment is not configured. Missing: ${missing.join(', ')}.`, 500);
  }

  if (!ENCRYPTION_KEY) {
    error('[site-health] Missing ENCRYPTION_KEY.');
    return fail(res, 'Function environment is not configured. Missing: ENCRYPTION_KEY.', 500);
  }

  let body;
  try {
    body = parsePayload(req);
  } catch (e) {
    return fail(res, 'Invalid JSON body.', 400);
  }

  const siteId = body.siteId || body.site_id;
  const secret = body.secret;

  if (!siteId) {
    return fail(res, 'siteId or site_id is required.', 400);
  }

  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    return fail(res, 'secret is required in request body.', 400);
  }

  const healthSnapshot = extractHealthSnapshot(body);
  if (!healthSnapshot || Object.keys(healthSnapshot).length === 0) {
    return fail(res, 'Health payload is empty (expected fields from get_health_status).', 400);
  }

  try {
    const adminClient = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new sdk.Databases(adminClient);

    const siteDoc = await databases.getDocument('platform_db', 'sites', siteId);
    let storedSiteSecret = siteDoc.site_secret ?? '';
    let storedApiKey = siteDoc.api_key ?? siteDoc.apiKey ?? '';

    const looksEncrypted = (s) => s && typeof s === 'string' && s.includes(':') && s.split(':').length === 3;
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
      log(`[site-health] Site ${siteId} has no site_secret or api_key.`);
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
      log(`[site-health] Secret mismatch for site ${siteId}.`);
      return fail(res, 'Invalid secret.', 401);
    }

    const healthMetaJson = JSON.stringify(healthSnapshot);
    const lastChecked =
      typeof healthSnapshot.timestamp_utc === 'string' && healthSnapshot.timestamp_utc.trim()
        ? healthSnapshot.timestamp_utc.trim()
        : new Date().toISOString();

    await databases.updateDocument('platform_db', 'sites', siteId, {
      health_meta: healthMetaJson,
      last_checked: lastChecked,
    });

    log(`[site-health] Stored health snapshot for site ${siteId} (${healthMetaJson.length} chars)`);
    return ok(res, { success: true, message: 'Site health saved.' });
  } catch (e) {
    error(`[site-health] Error: ${e.message}`);
    return fail(res, e.message, 500);
  }
};
