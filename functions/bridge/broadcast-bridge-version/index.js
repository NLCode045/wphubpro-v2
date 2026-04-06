/**
 * Broadcasts the latest bridge version to all connected sites.
 * Called by bridge-release after uploading a new version to storage.
 * Sends X-WPHub-Bridge-Latest header to each site's heartbeat/poke endpoint.
 */
/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const crypto = require('crypto');

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500) {
  return res.json({ success: false, message }, statusCode);
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
  } catch (e) {
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
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

  if (!endpoint || !projectId || !apiKey || !ENCRYPTION_KEY) {
    return fail(res, 'Function environment is not configured.', 500);
  }

  try {
    const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new sdk.Databases(client);

    // 1. Get latest version from platform_settings
    const settingsList = await databases.listDocuments('platform_db', 'platform_settings', [
      sdk.Query.equal('key', 'bridge_plugin'),
      sdk.Query.limit(1),
    ]);
    if (settingsList.total === 0 || !settingsList.documents[0]?.value) {
      return fail(res, 'No bridge_plugin in platform_settings.', 404);
    }
    const data = JSON.parse(settingsList.documents[0].value);
    const version = data?.version;
    if (!version) {
      return fail(res, 'No version in bridge_plugin.', 404);
    }

    // 2. List all sites (paginated)
    let offset = 0;
    const limit = 100;
    let totalNotified = 0;
    let totalSkipped = 0;

    while (true) {
      const sitesList = await databases.listDocuments('platform_db', 'sites', [
        sdk.Query.limit(limit),
        sdk.Query.offset(offset),
      ]);
      const sites = sitesList.documents || [];
      if (sites.length === 0) break;

      for (const site of sites) {
        const siteUrl = site.site_url ?? site.siteUrl ?? '';
        if (!siteUrl || typeof siteUrl !== 'string') {
          totalSkipped++;
          continue;
        }
        let storedKey = site.api_key ?? site.apiKey ?? site.bridge_secret;
        if (site.data && typeof site.data === 'object') {
          storedKey = storedKey ?? site.data.api_key ?? site.data.apiKey ?? site.data.bridge_secret;
        }
        const looksEncrypted = storedKey && typeof storedKey === 'string' && storedKey.includes(':') && storedKey.split(':').length === 3;
        let bridgeSecret = storedKey;
        if (storedKey && looksEncrypted && ENCRYPTION_KEY) {
          bridgeSecret = decryptApiKey(storedKey, ENCRYPTION_KEY);
        }
        if (!bridgeSecret || typeof bridgeSecret !== 'string' || !bridgeSecret.trim()) {
          totalSkipped++;
          continue;
        }
        const encryptedKey = encrypt(bridgeSecret, ENCRYPTION_KEY);
        const pokeUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/wphubpro/v1/heartbeat/poke`;
        try {
          const pokeRes = await fetch(pokeUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-WPHub-Key': encryptedKey,
              'X-WPHub-Bridge-Latest': version,
              'User-Agent': 'WPHub-Broadcast/1.0',
            },
          });
          if (pokeRes.ok) {
            totalNotified++;
          }
        } catch (e) {
          log(`[broadcast-bridge-version] Failed for ${siteUrl}: ${e.message}`);
        }
      }

      offset += sites.length;
      if (sites.length < limit) break;
    }

    log(`[broadcast-bridge-version] v${version} notified ${totalNotified} sites, skipped ${totalSkipped}`);
    return ok(res, { success: true, version, notified: totalNotified, skipped: totalSkipped });
  } catch (e) {
    error(`[broadcast-bridge-version] Error: ${e.message}`);
    return fail(res, e.message || 'Broadcast failed.', 500);
  }
};
