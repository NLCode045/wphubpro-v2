/* eslint-disable no-unused-vars */
/**
 * wp-proxy: Proxies Hub requests to the WordPress bridge REST API.
 *
 * Auth (dual secret flow):
 * - Hub→Bridge: X-WPHub-Key = encrypted(bridge_secret). Bridge validates against stored key.
 * - bridge_secret is stored in site document as api_key (encrypted with ENCRYPTION_KEY).
 * - Bridge→Hub (heartbeat, sync): uses site_secret; bridge pushes plugins_meta, themes_meta, wp_meta on changes.
 */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const crypto = require('crypto');

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (req.payload && typeof req.payload === "object") return req.payload;
  const raw = req.payload || req.bodyRaw || req.body;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    return JSON.parse(trimmed);
  }
  return {};
}

function createClient(sdkLib, { endpoint, projectId, apiKey }) {
  const client = new sdkLib.Client().setEndpoint(endpoint).setProject(projectId);
  if (apiKey) client.setKey(apiKey);
  return client;
}

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

/**
 * Decrypt api_key stored in format iv:encrypted:tag (Hub ENCRYPTION_KEY).
 * On failure returns null — never return ciphertext (WordPress would always 401).
 */
function decryptApiKey(encrypted, key) {
  if (!encrypted || typeof encrypted !== 'string' || !key) return null;
  const parts = encrypted.split(':');
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedBuf = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const derivedKey = crypto.createHash('sha256').update(String(key), 'utf8').digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encryptedBuf), decipher.final()]).toString('utf8');
  } catch (e) {
    return null;
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

/** Strip bridge secrets from URLs for logging (never log query tokens). */
function redactUrlForLog(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    const keys = ['bridge_secret', 'api_key', 'bridgeSecret', 'apiKey'];
    for (const k of keys) {
      if (u.searchParams.has(k)) u.searchParams.set(k, '[REDACTED]');
    }
    return u.toString();
  } catch {
    return url.replace(/([?&])(bridge_secret|api_key)=([^&]+)/gi, '$1$2=[REDACTED]');
  }
}

/** Remove secrets from JSON body string before persisting to site log_data. */
function redactRequestBodyForLog(bodyStr) {
  if (!bodyStr || typeof bodyStr !== 'string') return bodyStr;
  try {
    const o = JSON.parse(bodyStr);
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      const copy = { ...o };
      if ('bridge_secret' in copy) copy.bridge_secret = '[REDACTED]';
      if ('api_key' in copy) copy.api_key = '[REDACTED]';
      return JSON.stringify(copy);
    }
  } catch {}
  return bodyStr;
}

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

  if (!endpoint || !projectId || !apiKey) {
    return fail(res, 'Function environment is not configured.', 500);
  }
  if (!ENCRYPTION_KEY) {
    return fail(res, 'Function environment is not configured. Missing: ENCRYPTION_KEY.', 500);
  }

  const client = createClient(sdk, { endpoint, projectId, apiKey });
  const databases = new sdk.Databases(client);

  let payload = {};
  try {
    payload = parsePayload(req);
  } catch (e) {
    return fail(res, 'Invalid JSON payload.', 400);
  }

  let query = req.query ? { ...req.query } : {};
  const pathStr = req.path || req.url || '';
  if (pathStr.includes('?')) {
    const idx = pathStr.indexOf('?');
    const qs = pathStr.slice(idx + 1);
    try {
      const params = new URLSearchParams(qs);
      params.forEach((v, k) => { if (!query[k]) query[k] = v; });
    } catch (_) {}
  }
  const siteId = payload.siteId || query.siteId;
  const wpPath = payload.endpoint || query.endpoint;
  const method = (payload.method || query.method || 'GET').toUpperCase();

  if (!siteId || !wpPath) {
    return fail(res, 'Missing siteId or endpoint.', 400);
  }

  // --- CRUCIALE FIX: Zoek action/plugin op meerdere niveaus ---
  const wpAction = payload.action || (payload.body && payload.body.action);
  const wpPlugin = payload.plugin || (payload.body && payload.body.plugin);

  try {
    const siteDocument = await databases.getDocument('platform_db', 'sites', siteId);
    const site_url = siteDocument.site_url ?? siteDocument.siteUrl ?? '';
    if (!site_url || typeof site_url !== 'string') {
      return fail(res, 'Site has no site_url.', 400);
    }

    // bridge_secret for Hub→Bridge auth (stored as api_key, encrypted)
    let storedKey = siteDocument.api_key ?? siteDocument.apiKey ?? siteDocument.bridge_secret;
    if (siteDocument.data && typeof siteDocument.data === 'object') {
      storedKey = storedKey ?? siteDocument.data.api_key ?? siteDocument.data.apiKey ?? siteDocument.data.bridge_secret;
    }

    const looksEncrypted = storedKey && typeof storedKey === 'string' && storedKey.includes(':') && storedKey.split(':').length === 3;
    let bridgeSecret = typeof storedKey === 'string' ? storedKey.trim() : '';
    if (storedKey && looksEncrypted) {
      if (!ENCRYPTION_KEY) {
        error('[wp-proxy] api_key is encrypted but ENCRYPTION_KEY is missing.');
        return fail(res, 'Function misconfigured: ENCRYPTION_KEY required for encrypted site api_key.', 500);
      }
      const decrypted = decryptApiKey(storedKey, ENCRYPTION_KEY);
      if (decrypted === null || typeof decrypted !== 'string' || !decrypted.trim()) {
        error('[wp-proxy] api_key decrypt failed (wrong ENCRYPTION_KEY or corrupt value).');
        return fail(res, 'Could not decrypt site API key. Check ENCRYPTION_KEY matches the Hub.', 500);
      }
      bridgeSecret = decrypted.trim();
    }

    if (!bridgeSecret || typeof bridgeSecret !== 'string' || !bridgeSecret.trim()) {
      error('[wp-proxy] No bridge_secret/api_key for site. Connect via WPHubPro Bridge first.');
      return fail(res, 'Site has no API key. Connect via WPHubPro Bridge first.', 400);
    }

    // Bridge expects X-WPHub-Key = plaintext bridge_secret (compares with stored via hash_equals).
    // Sending encrypted would fail: each encrypt() uses a new IV, so stored vs provided never match.

    // Fetch latest bridge version from platform_settings to notify site on each request
    let bridgeLatestVersion = '';
    try {
      const settingsList = await databases.listDocuments('platform_db', 'platform_settings', [
        sdk.Query.equal('key', 'bridge_plugin'),
        sdk.Query.limit(1),
      ]);
      if (settingsList.total > 0 && settingsList.documents[0]?.value) {
        const data = JSON.parse(settingsList.documents[0].value);
        if (data?.version && /^\d+\.\d+\.\d+$/.test(data.version)) {
          bridgeLatestVersion = data.version;
        }
      }
    } catch (e) {
      log(`[wp-proxy] Could not fetch bridge_plugin: ${e.message}`);
    }

    const cleanedEndpoint = String(decodeURIComponent(wpPath)).replace(/^\/+/, '');

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-WPHub-Key': bridgeSecret,
      'X-WPHub-Action': wpAction || '',
      'X-WPHub-Plugin': wpPlugin || '',
      'User-Agent': 'WPHub-Proxy/1.0'
    };
    if (bridgeLatestVersion) {
      headers['X-WPHub-Bridge-Latest'] = bridgeLatestVersion;
    }
    // Bridge impersonates this WP user for plugin/theme manage (matches sites.username in Appwrite).
    const isPluginOrThemeManage =
      cleanedEndpoint.includes('plugins/manage/') || cleanedEndpoint.includes('themes/manage/');
    if (isPluginOrThemeManage) {
      const wpAdminLogin = (siteDocument.username || siteDocument.user_login || '').toString().trim();
      if (wpAdminLogin) {
        headers['X-WPHub-Admin-Login'] = wpAdminLogin;
      }
    }

    const proxyUrl = `${site_url.replace(/\/$/, '')}/wp-json/${cleanedEndpoint}`;

    const fetchOptions = { method, headers };

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
        // Stuur alleen de relevante body door naar WP (zonder proxy metadata)
        let bodyData = payload.body || payload;
        if ((!bodyData || Object.keys(bodyData).length === 0) && query.body) {
          try {
            bodyData = typeof query.body === 'string' ? JSON.parse(query.body) : query.body;
          } catch (e) {
            bodyData = {};
          }
        }
        let normalized = bodyData;
        if (typeof normalized === 'string') {
          try {
            normalized = JSON.parse(normalized || '{}');
          } catch (_) {
            normalized = {};
          }
        }
        if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) {
          normalized = {};
        }
        const { siteId: _s, endpoint: _e, method: _m, userId: _u, zip_url: zipUrl, ...restBody } = normalized;
        // For save-connection: inject api_key (plaintext) so bridge stores it for validation.
        if (cleanedEndpoint.includes('save-connection')) {
          restBody.api_key = bridgeSecret;
          const wpAdminLogin = (siteDocument.username || siteDocument.user_login || '').toString().trim();
          if (wpAdminLogin) {
            restBody.username = wpAdminLogin;
          }
        } else {
          // Duplicate auth: some stacks strip X-WPHub-Key on POST; bridge also reads bridge_secret from JSON.
          restBody.bridge_secret = bridgeSecret;
        }
        // Bridge update proxy: fetch zip from Appwrite and send as base64 so WordPress doesn't need to reach Appwrite
        const isBridgeUpdate = (cleanedEndpoint.includes('install-from-zip') || cleanedEndpoint.includes('plugins/manage/update')) && zipUrl && typeof zipUrl === 'string' && zipUrl.startsWith('https://');
        if (isBridgeUpdate) {
          try {
            log(`[wp-proxy] Proxying bridge zip from Appwrite (${zipUrl.slice(0, 80)}...)`);
            const zipRes = await fetch(zipUrl, { method: 'GET' });
            if (!zipRes.ok) {
              error(`[wp-proxy] Bridge zip fetch failed: ${zipRes.status} ${zipRes.statusText}`);
              return fail(res, `Could not fetch bridge zip: ${zipRes.status}`, 502);
            }
            const arrayBuffer = await zipRes.arrayBuffer();
            const zipBuf = Buffer.from(arrayBuffer);
            const zipBase64 = zipBuf.toString('base64');
            restBody.zip_base64 = zipBase64;
            delete restBody.zip_url;
            log(`[wp-proxy] Bridge zip proxied: ${zipBuf.length} bytes`);
          } catch (zipErr) {
            error(`[wp-proxy] Bridge zip proxy error: ${zipErr.message}`);
            return fail(res, `Could not fetch bridge zip: ${zipErr.message}`, 502);
          }
        }
        fetchOptions.body = JSON.stringify(restBody);
    }

    log(`[wp-proxy] Calling WP: ${method} ${redactUrlForLog(proxyUrl)}`);
    log(`[wp-proxy] Action Header: ${wpAction || '(none)'}`);

    const startMs = Date.now();
    const proxyResponse = await fetch(proxyUrl, fetchOptions);
    const responseText = await proxyResponse.text();
    const durationSec = (Date.now() - startMs) / 1000;
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    if (!proxyResponse.ok) {
        return fail(res, (responseData && responseData.message) ? responseData.message : `WP API Error: ${proxyResponse.status}`, proxyResponse.status, {
            success: false, 
            details: responseData 
        });
    }

    // Bridge sync pushes plugins_meta, themes_meta, wp_meta on plugin/theme changes (activated_plugin, deactivated_plugin, upgrader_process_complete, etc.).
    // No need to refresh plugins_meta here – sync-site-meta receives updates from the bridge.

    // Append to log_data.outgoing
    try {
      const raw = siteDocument.log_data || siteDocument.incoming_log || '{}';
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
      const respPreview = typeof responseData === 'object'
        ? JSON.stringify(responseData).slice(0, 1500)
        : String(responseText || '').slice(0, 1500);
      let reqPreview = '';
      if (fetchOptions.body) {
        try {
          reqPreview = redactRequestBodyForLog(String(fetchOptions.body)).slice(0, 500);
        } catch {}
      }
      logData.outgoing.push({
        time: new Date().toISOString(),
        method,
        endpoint: wpPath,
        statusCode: proxyResponse.status,
        duration: Math.round(durationSec * 100) / 100,
        request: reqPreview || undefined,
        response: respPreview || undefined,
      });
      if (logData.outgoing.length > 50) logData.outgoing = logData.outgoing.slice(-50);
      await databases.updateDocument('platform_db', 'sites', siteId, { log_data: JSON.stringify(logData) });
    } catch (logErr) {
      log(`[wp-proxy] Failed to update log_data: ${logErr.message}`);
    }

    return ok(res, responseData);

  } catch (e) {
    error(`[wp-proxy] Error: ${e.message}`);
    return fail(res, e.message, 500);
  }
};