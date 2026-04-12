/**
 * fetch-site-meta: One-time GET to fetch plugins and themes from bridge when plugins_meta/themes_meta are empty and bridge_status is connected.
 * Called by platform with JWT. Verifies user owns site, fetches from bridge REST API, updates site document.
 */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const crypto = require('crypto');
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
    return body;
  }
  const raw = req.payload || req.bodyRaw || req.body;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw.trim());
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

function encrypt(text, key) {
  const iv = crypto.randomBytes(12);
  const derivedKey = crypto.createHash('sha256').update(String(key), 'utf8').digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

module.exports = async ({ req, res, log, error }) => {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

  if (!hasAppwriteBootstrap()) {
    error('[fetch-site-meta] Missing Appwrite bootstrap env.');
    return fail(res, 'Function environment is not configured.', 500);
  }
  if (!ENCRYPTION_KEY) {
    error('[fetch-site-meta] Missing ENCRYPTION_KEY.');
    return fail(res, 'Function environment is not configured. Missing: ENCRYPTION_KEY.', 500);
  }

  let body;
  try {
    body = parsePayload(req);
  } catch (e) {
    return fail(res, 'Invalid JSON body.', 400);
  }

  const siteId = body.siteId || body.site_id;
  const forceRefresh = body.force === true || body.forceRefresh === true;
  if (!siteId) {
    return fail(res, 'siteId is required.', 400);
  }

  // JWT: prefer body.jwt (full token), then headers (may be truncated by proxies)
  const authHeader =
    req.headers?.authorization ||
    req.headers?.Authorization ||
    req.headers?.['x-appwrite-user-jwt'] ||
    req.headers?.['x-appwrite-jwt'] ||
    '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  const bodyToken = typeof body.jwt === 'string' ? body.jwt.trim() : '';
  const isValidFormat = (t) => {
    const parts = t ? t.split('.') : [];
    return parts.length === 3 && parts.every((p) => p && p.length >= 10);
  };
  const token = isValidFormat(bodyToken) ? bodyToken : isValidFormat(headerToken) ? headerToken : headerToken || bodyToken;
  if (!token || !isValidFormat(token)) {
    return fail(res, 'Missing or invalid JWT. Use body.jwt when header is truncated.', 401);
  }

  try {
    const { databases, endpoint, projectId } = await createServerClientAndDatabases(log, error);

    const jwtClient = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setJWT(token);
    const account = new sdk.Account(jwtClient);
    let jwtUser;
    try {
      jwtUser = await account.get();
    } catch (e) {
      log(`[fetch-site-meta] JWT verification failed: ${e.message}`);
      return fail(res, 'Invalid or expired JWT.', 401);
    }
    const userId = jwtUser?.$id;
    if (!userId) {
      return fail(res, 'Could not determine user from JWT.', 401);
    }

    const siteDoc = await databases.getDocument('platform_db', 'sites', siteId);
    const siteUserId = siteDoc.user_id || siteDoc.userId;
    if (siteUserId !== userId) {
      return fail(res, 'Site does not belong to this user.', 403);
    }

    const bridgeStatus = siteDoc.bridge_status || siteDoc.bridgeStatus || '';
    if (bridgeStatus !== 'connected') {
      return fail(res, 'Site bridge_status is not connected.', 400);
    }

    const hasPlugins = siteDoc.plugins_meta && String(siteDoc.plugins_meta).trim().length > 2;
    const hasThemes = siteDoc.themes_meta && String(siteDoc.themes_meta).trim().length > 2;
    if (hasPlugins && hasThemes && !forceRefresh) {
      return ok(res, { success: true, message: 'Site already has plugins and themes meta.', skipped: true });
    }
    const shouldFetchPlugins = !hasPlugins || forceRefresh;
    const shouldFetchThemes = !hasThemes || forceRefresh;

    const siteUrl = (siteDoc.site_url || siteDoc.siteUrl || '').replace(/\/$/, '');
    if (!siteUrl) {
      return fail(res, 'Site has no site_url.', 400);
    }

    let wpApiKey = siteDoc.api_key ?? siteDoc.apiKey;
    const looksEncrypted = wpApiKey && typeof wpApiKey === 'string' && wpApiKey.includes(':') && wpApiKey.split(':').length === 3;
    if (wpApiKey && looksEncrypted) {
      wpApiKey = decryptApiKey(wpApiKey, ENCRYPTION_KEY);
    }
    if (!wpApiKey || typeof wpApiKey !== 'string' || !wpApiKey.trim()) {
      return fail(res, 'Site has no API key. Connect via WPHubPro Bridge first.', 400);
    }

    const encryptedApiKeyForWp = encrypt(wpApiKey, ENCRYPTION_KEY);
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // WP authenticates using the encrypted secret stored by the bridge.
      'X-WPHub-Key': encryptedApiKeyForWp,
      'User-Agent': 'WPHub-FetchMeta/1.0',
    };

    const updates = {};
    let pluginsMeta = null;
    let themesMeta = null;

    if (!hasPlugins) {
      const pluginsUrl = `${siteUrl}/wp-json/wphubpro/v1/plugins`;
      log(`[fetch-site-meta] Fetching plugins from ${pluginsUrl}`);
      const pluginsRes = await fetch(pluginsUrl, { method: 'GET', headers });
      const pluginsText = await pluginsRes.text();
      if (pluginsRes.ok) {
        try {
          pluginsMeta = JSON.parse(pluginsText);
          if (Array.isArray(pluginsMeta)) {
            updates.plugins_meta = JSON.stringify(pluginsMeta);
            log(`[fetch-site-meta] Fetched ${pluginsMeta.length} plugins`);
          }
        } catch (e) {
          log(`[fetch-site-meta] Failed to parse plugins response: ${e.message}`);
        }
      } else {
        log(`[fetch-site-meta] Plugins fetch failed: ${pluginsRes.status} ${pluginsText.slice(0, 200)}`);
      }
    }

    if (shouldFetchThemes) {
      const themesUrl = `${siteUrl}/wp-json/wphubpro/v1/themes`;
      log(`[fetch-site-meta] Fetching themes from ${themesUrl}`);
      const themesRes = await fetch(themesUrl, { method: 'GET', headers });
      const themesText = await themesRes.text();
      if (themesRes.ok) {
        try {
          themesMeta = JSON.parse(themesText);
          if (Array.isArray(themesMeta)) {
            const mapped = themesMeta.map((t) => ({
              stylesheet: t.slug || t.stylesheet,
              name: t.name,
              version: t.version,
              active: t.active,
              update: t.update ?? null,
            }));
            updates.themes_meta = JSON.stringify(mapped);
            log(`[fetch-site-meta] Fetched ${mapped.length} themes`);
          }
        } catch (e) {
          log(`[fetch-site-meta] Failed to parse themes response: ${e.message}`);
        }
      } else {
        log(`[fetch-site-meta] Themes fetch failed: ${themesRes.status} ${themesText.slice(0, 200)}`);
      }
    }

    if (Object.keys(updates).length === 0) {
      return ok(res, { success: true, message: 'No updates (fetch failed or already present).' });
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
    logData.incoming.push({
      type: 'plugin_theme_update',
      time: now,
      plugins: !!updates.plugins_meta,
      themes: !!updates.themes_meta,
      source: 'fetch-site-meta',
    });
    if (logData.incoming.length > 50) logData.incoming = logData.incoming.slice(-50);
    updates.log_data = JSON.stringify(logData);

    await databases.updateDocument('platform_db', 'sites', siteId, updates);
    log(`[fetch-site-meta] Updated site ${siteId}`);
    return ok(res, { success: true, message: 'Meta fetched and updated.' });
  } catch (e) {
    error(`[fetch-site-meta] Error: ${e.message}`);
    return fail(res, e.message, 500);
  }
};
