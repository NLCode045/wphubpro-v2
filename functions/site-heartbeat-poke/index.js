/**
 * site-heartbeat-poke: Runs every minute.
 * Loops over active sites with bridge_status=connected and sends GET to
 * /wp-json/wphubpro/v1/heartbeat/poke on each (WordPress plugin endpoint).
 */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const crypto = require('crypto');

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

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
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

  try {
    const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new sdk.Databases(client);

    const sites = await databases.listDocuments('platform_db', 'sites', [sdk.Query.limit(500)]);
    const toPoke = sites.documents.filter(
      (s) =>
        (s.bridge_status || s.bridgeStatus) === 'connected' &&
        isSiteEnabled(s) &&
        (s.site_url || s.siteUrl) &&
        (s.api_key || s.apiKey)
    );

    let okCount = 0;
    let errCount = 0;

    for (const site of toPoke) {
      let wpApiKey = site.api_key ?? site.apiKey ?? '';
      // const looksEncrypted = wpApiKey && typeof wpApiKey === 'string' && wpApiKey.includes(':') && wpApiKey.split(':').length === 3;
      // if (wpApiKey && looksEncrypted) {
      //   wpApiKey = decryptApiKey(wpApiKey, ENCRYPTION_KEY);
      // }
      if (!wpApiKey || typeof wpApiKey !== 'string' || !wpApiKey.trim()) {
        log(`[site-heartbeat-poke] Site ${site.$id} has no api_key, skip`);
        errCount++;
        continue;
      }

      const encryptedApiKeyForWp = encrypt(wpApiKey, ENCRYPTION_KEY);
      let siteUrl = (site.site_url || site.siteUrl || '').trim().replace(/\/$/, '');
      if (!siteUrl.startsWith('http')) {
        siteUrl = `https://${siteUrl}`;
      }
      const pokeUrl = `${siteUrl}/wp-json/wphubpro/v1/heartbeat/poke`;

      try {
        const resp = await fetch(pokeUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            // WP validates against the encrypted secret stored by the bridge.
            'X-WPHub-Key': encryptedApiKeyForWp,
          },
          timeout: 10000,
        });
        if (resp.status >= 200 && resp.status < 400) {
          okCount++;
        } else {
          errCount++;
          log(`[site-heartbeat-poke] Site ${site.$id} poke failed: HTTP ${resp.status}`);
        }
      } catch (e) {
        errCount++;
        log(`[site-heartbeat-poke] Site ${site.$id} poke error: ${e.message}`);
      }
    }

    log(`[site-heartbeat-poke] Poked ${toPoke.length} sites: ${okCount} ok, ${errCount} failed`);
    return ok(res, { success: true, poked: toPoke.length, ok: okCount, failed: errCount });
  } catch (e) {
    error(`[site-heartbeat-poke] Error: ${e.message}`);
    return fail(res, e.message, 500);
  }
};
