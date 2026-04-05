/**
 * site-heartbeat-poke: Scheduled batch + optional manual single-site poke.
 * Batch: loops connected sites, GET /wp-json/wphubpro/v1/heartbeat/poke on each.
 * Manual: body `{ siteId, jwt }` — verifies JWT user owns site, pokes one site (any bridge_status).
 */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const crypto = require('crypto');

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'platform_db';
const SITES_COLLECTION_ID = process.env.APPWRITE_SITES_COLLECTION_ID || 'sites';

function parsePayload(req) {
  if (!req) return {};
  let body = req.body;
  if (body && typeof body === 'object') {
    if (body.siteId || body.site_id || body.jwt) return body;
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

function isSiteEnabled(site) {
  const meta = site.meta_data ?? site.metaData;
  if (!meta || typeof meta !== 'string') return true;
  try {
    const parsed = JSON.parse(meta);
    return parsed && typeof parsed === 'object' && parsed.enabled !== false;
  } catch {
    return true;
  }
}

function isValidJwtFormat(t) {
  const parts = t ? t.split('.') : [];
  return parts.length === 3 && parts.every((p) => p && p.length >= 10);
}

/**
 * @returns {Promise<{ ok: true, httpStatus: number } | { ok: false, reason: string, detail?: string, httpStatus?: number }>}
 */
async function pokeSingleSite(site, ENCRYPTION_KEY, log) {
  let wpApiKey = site.api_key ?? site.apiKey ?? '';
  const looksEncrypted =
    wpApiKey && typeof wpApiKey === 'string' && wpApiKey.includes(':') && wpApiKey.split(':').length === 3;
  if (wpApiKey && looksEncrypted) {
    wpApiKey = decryptApiKey(wpApiKey, ENCRYPTION_KEY);
  }
  if (!wpApiKey || typeof wpApiKey !== 'string' || !wpApiKey.trim()) {
    return {
      ok: false,
      reason: 'no_api_key',
      detail: 'Site has no API key. Reconnect the WPHub Pro bridge from WordPress.',
    };
  }

  // Bridge compares X-WPHub-Key to stored plaintext bridge_secret (hash_equals). Same as wp-proxy:
  // re-encrypting with a new IV would never match.
  const bridgeSecretForWp = wpApiKey.trim();
  let siteUrl = (site.site_url || site.siteUrl || '').trim().replace(/\/$/, '');
  if (!siteUrl.startsWith('http')) {
    siteUrl = `https://${siteUrl}`;
  }
  const pokeUrl = `${siteUrl}/wp-json/wphubpro/v1/heartbeat/poke`;

  try {
    const resp = await fetch(pokeUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-WPHub-Key': bridgeSecretForWp,
      },
      timeout: 10000,
    });
    const httpStatus = resp.status;
    if (httpStatus >= 200 && httpStatus < 400) {
      return { ok: true, httpStatus };
    }
    return {
      ok: false,
      reason: 'http_error',
      httpStatus,
      detail: `WordPress returned HTTP ${httpStatus}`,
    };
  } catch (e) {
    log(`[site-heartbeat-poke] fetch error: ${e.message}`);
    return { ok: false, reason: 'network', detail: e.message || String(e) };
  }
}

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

  if (!endpoint || !projectId || !apiKey) {
    error('[site-heartbeat-poke] Missing env.');
    return fail(res, 'Function environment is not configured.', 500);
  }
  if (!ENCRYPTION_KEY) {
    error('[site-heartbeat-poke] Missing ENCRYPTION_KEY.');
    return fail(res, 'Function environment is not configured. Missing: ENCRYPTION_KEY.', 500);
  }

  let body = {};
  try {
    body = parsePayload(req);
  } catch (e) {
    return fail(res, 'Invalid JSON body.', 400);
  }

  const siteIdManual = body.siteId || body.site_id;
  const authHeader =
    req.headers?.authorization ||
    req.headers?.Authorization ||
    req.headers?.['x-appwrite-user-jwt'] ||
    req.headers?.['x-appwrite-jwt'] ||
    '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  const bodyToken = typeof body.jwt === 'string' ? body.jwt.trim() : '';
  const token = isValidJwtFormat(bodyToken) ? bodyToken : isValidJwtFormat(headerToken) ? headerToken : headerToken || bodyToken;

  const adminClient = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new sdk.Databases(adminClient);

  if (siteIdManual) {
    if (!token || !isValidJwtFormat(token)) {
      return fail(res, 'Missing or invalid JWT. Use body.jwt when header is truncated.', 401);
    }

    try {
      const jwtClient = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setJWT(token);
      const account = new sdk.Account(jwtClient);
      let jwtUser;
      try {
        jwtUser = await account.get();
      } catch (e) {
        log(`[site-heartbeat-poke] JWT verification failed: ${e.message}`);
        return fail(res, 'Invalid or expired JWT.', 401);
      }
      const userId = jwtUser?.$id;
      if (!userId) {
        return fail(res, 'Could not determine user from JWT.', 401);
      }

      let siteDoc;
      try {
        siteDoc = await databases.getDocument(DATABASE_ID, SITES_COLLECTION_ID, siteIdManual);
      } catch (e) {
        if (e.code === 404) {
          return fail(res, 'Site not found.', 404);
        }
        throw e;
      }

      const siteUserId = siteDoc.user_id || siteDoc.userId;
      if (siteUserId !== userId) {
        return fail(res, 'Site does not belong to this user.', 403);
      }
      if (!isSiteEnabled(siteDoc)) {
        return fail(res, 'Site is disabled.', 400);
      }
      const rawUrl = (siteDoc.site_url || siteDoc.siteUrl || '').trim();
      if (!rawUrl) {
        return fail(res, 'Site has no site URL.', 400);
      }

      const result = await pokeSingleSite(siteDoc, ENCRYPTION_KEY, log);
      if (result.ok) {
        log(`[site-heartbeat-poke] Manual poke site ${siteIdManual} ok HTTP ${result.httpStatus}`);
        return ok(res, {
          success: true,
          message:
            'Bridge ping sent. If the plugin is reachable, the connection should refresh in a few seconds.',
          httpStatus: result.httpStatus,
        });
      }

      if (result.reason === 'no_api_key') {
        return fail(res, result.detail || 'Site has no API key.', 400);
      }

      const msg =
        result.reason === 'http_error' && result.httpStatus != null
          ? `WordPress returned HTTP ${result.httpStatus}. Check that the bridge plugin is active and the site URL is correct.`
          : result.detail || 'Could not reach the WordPress site.';
      log(`[site-heartbeat-poke] Manual poke site ${siteIdManual} failed: ${msg}`);
      return fail(res, msg, 502, { httpStatus: result.httpStatus });
    } catch (e) {
      error(`[site-heartbeat-poke] Manual poke error: ${e.message}`);
      return fail(res, e.message || 'Poke failed.', 500);
    }
  }

  try {
    const sites = await databases.listDocuments(DATABASE_ID, SITES_COLLECTION_ID, [sdk.Query.limit(500)]);
    const toPoke = sites.documents.filter(
      (s) =>
        (s.bridge_status || s.bridgeStatus) === 'connected' &&
        isSiteEnabled(s) &&
        (s.site_url || s.siteUrl) &&
        (s.api_key || s.apiKey),
    );

    let okCount = 0;
    let errCount = 0;

    for (const site of toPoke) {
      const result = await pokeSingleSite(site, ENCRYPTION_KEY, log);
      if (result.ok) {
          okCount++;
        } else {
        errCount++;
        log(
          `[site-heartbeat-poke] Site ${site.$id} poke failed: ${result.detail || result.httpStatus || result.reason}`,
        );
      }
    }

    log(`[site-heartbeat-poke] Poked ${toPoke.length} sites: ${okCount} ok, ${errCount} failed`);
    return ok(res, { success: true, poked: toPoke.length, ok: okCount, failed: errCount });
  } catch (e) {
    error(`[site-heartbeat-poke] Error: ${e.message}`);
    return fail(res, e.message, 500);
  }
};
