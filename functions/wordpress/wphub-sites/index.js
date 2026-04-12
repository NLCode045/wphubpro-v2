/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const crypto = require('crypto');
const { createServerClientAndDatabases } = require('../../database/fetchAppwriteCredentialsFromGateway');
const { hasAppwriteBootstrap } = require('../../subscriptions/stripe-consumer/lib/appwriteEnv');

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

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

function encrypt(text, key) {
  const iv = crypto.randomBytes(12);
  const derivedKey = crypto.createHash('sha256').update(String(key), 'utf8').digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

function decrypt(encrypted, key) {
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

function getAuthenticatedUserId(req) {
  const headers = req?.headers || {};
  return (
    process.env.APPWRITE_FUNCTION_USER_ID ||
    process.env.APPWRITE_USER_ID ||
    headers['x-appwrite-user-id'] ||
    headers['x-appwrite-function-user-id'] ||
    null
  );
}

function getDataStoreConfig() {
  const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.DATABASE_ID;
  const sitesCollectionId = process.env.SITES_COLLECTION_ID || 'sites';
  return { databaseId, sitesCollectionId };
}

async function handleCreate(req, res, error, { databases }) {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    error('[wphub-sites] Missing ENCRYPTION_KEY. Set in Appwrite Console: Functions > wphub-sites > Variables.');
    return fail(res, 'Function environment is not configured. Missing: ENCRYPTION_KEY. Add it in Appwrite Console under Functions > wphub-sites > Variables.', 500);
  }

  const payloadObj = req._parsedPayload || {};
  const authUserId = req._authUserId;
  const requestedUserId = (req.query?.userId || req.query?.user_id) || (payloadObj.userId || payloadObj.user_id);
  const site_url = (req.query?.site_url || req.query?.siteUrl) || (payloadObj.site_url || payloadObj.siteUrl);
  const site_name = (req.query?.site_name || req.query?.siteName) || (payloadObj.site_name || payloadObj.siteName);
  const { databaseId, sitesCollectionId } = getDataStoreConfig();

  if (!databaseId) return fail(res, 'APPWRITE_DATABASE_ID missing in function environment.', 500);
  if (!authUserId) return fail(res, 'Authentication required.', 401);
  if (requestedUserId && requestedUserId !== authUserId) {
    return fail(res, 'Forbidden: user_id does not match authenticated user.', 403);
  }
  if (!site_url || !site_name) {
    return fail(res, 'Missing required fields: site_url, site_name', 400);
  }

  const username = (payloadObj.username || payloadObj.user) || (req.query?.username || req.query?.user) || null;
  const bridge_secret = (payloadObj.bridge_secret || payloadObj.api_key || payloadObj.apiKey) || (req.query?.bridge_secret || req.query?.api_key || req.query?.apiKey) || null;
  const api_key = bridge_secret; // backward compat: api_key = bridge_secret

  try {
    let encryptedApiKey = '';
    const site_secret = api_key ? crypto.randomBytes(32).toString('hex') : null;

    if (api_key) {
      encryptedApiKey = encrypt(api_key, ENCRYPTION_KEY);
    }

    const meta_data = (payloadObj.meta_data || payloadObj.metaData) ?? null;
    const document = {
      user_id: authUserId,
      site_url,
      site_name,
      username: username || '',
      bridge_status: 'disconnected',
      ...(api_key ? { api_key: encrypt(api_key, ENCRYPTION_KEY) } : {}),
      ...(site_secret ? { site_secret: encrypt(site_secret, ENCRYPTION_KEY) } : {}),
      ...(meta_data != null ? { meta_data } : {}),
    };

    const created = await databases.createDocument(databaseId, sitesCollectionId, sdk.ID.unique(), document);
    // Attach transient values for the frontend connect flow (plaintext for save-connection).
    if (encryptedApiKey) created.encrypted_api_key = encryptedApiKey;
    if (site_secret) created.site_secret = site_secret;
    return ok(res, { success: true, document: created, site_secret });
  } catch (e) {
    error(e.message);
    return fail(res, e.message, 500);
  }
}

async function handleUpdate(req, res, error, { databases }) {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  const payloadObj = req._parsedPayload || {};
  const authUserId = req._authUserId;
  const siteId = (req.query?.siteId || req.query?.site_id) || (payloadObj.siteId || payloadObj.site_id);
  const updates = req.query?.updates || payloadObj.updates || payloadObj;
  const requestedUserId = (req.query?.userId || req.query?.user_id) || payloadObj.userId || payloadObj.user_id || updates?.userId || updates?.user_id;
  const { databaseId, sitesCollectionId } = getDataStoreConfig();

  if (!databaseId) return fail(res, 'APPWRITE_DATABASE_ID missing in function environment.', 500);
  if (!authUserId) return fail(res, 'Authentication required.', 401);
  if (requestedUserId && requestedUserId !== authUserId) {
    return fail(res, 'Forbidden: user_id does not match authenticated user.', 403);
  }
  if (!siteId) return fail(res, 'Missing siteId to update', 400);
  if (!updates) return fail(res, 'Missing updates payload', 400);

  const hasProp = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
  const finalUpdates = {};

  let newSiteSecretPlain = null;
  if (hasProp(updates, 'api_key') || hasProp(updates, 'apiKey') || hasProp(updates, 'bridge_secret')) {
    const rawKey = hasProp(updates, 'bridge_secret') ? updates.bridge_secret : (hasProp(updates, 'api_key') ? updates.api_key : updates.apiKey);
    if (rawKey === '' || rawKey === null) {
      finalUpdates.api_key = '';
      finalUpdates.site_secret = '';
    } else {
      if (!ENCRYPTION_KEY) return fail(res, 'ENCRYPTION_KEY not configured', 500);
      finalUpdates.api_key = encrypt(rawKey, ENCRYPTION_KEY);
      newSiteSecretPlain = crypto.randomBytes(32).toString('hex');
      finalUpdates.site_secret = encrypt(newSiteSecretPlain, ENCRYPTION_KEY);
    }
  }

  if (hasProp(updates, 'username')) finalUpdates.username = updates.username;
  else if (hasProp(updates, 'user_login')) finalUpdates.username = updates.user_login;
  else if (hasProp(updates, 'userLogin')) finalUpdates.username = updates.userLogin;

  if (hasProp(updates, 'siteName')) finalUpdates.site_name = updates.siteName;
  else if (hasProp(updates, 'site_name')) finalUpdates.site_name = updates.site_name;

  if (hasProp(updates, 'siteUrl')) finalUpdates.site_url = updates.siteUrl;
  else if (hasProp(updates, 'site_url')) finalUpdates.site_url = updates.site_url;

  if (hasProp(updates, 'meta_data')) finalUpdates.meta_data = updates.meta_data;

  if (!finalUpdates || Object.keys(finalUpdates).length === 0) {
    return fail(res, 'No update fields provided', 400);
  }

  try {
    const existing = await databases.getDocument(databaseId, sitesCollectionId, siteId);
    if (existing?.user_id !== authUserId) {
      return fail(res, 'Forbidden: cannot update a site owned by another user.', 403);
    }
    const updated = await databases.updateDocument(databaseId, sitesCollectionId, siteId, finalUpdates);
    let site_secret_plain = newSiteSecretPlain;
    if (!site_secret_plain && updated?.site_secret && typeof updated.site_secret === 'string' && updated.site_secret.includes(':') && ENCRYPTION_KEY) {
      site_secret_plain = decrypt(updated.site_secret, ENCRYPTION_KEY);
    }
    if (updated?.api_key && typeof updated.api_key === 'string' && ENCRYPTION_KEY) {
      const decrypted = decrypt(updated.api_key, ENCRYPTION_KEY);
      updated.encrypted_api_key = encrypt(decrypted, ENCRYPTION_KEY);
    }
    return ok(res, { success: true, document: updated, site_secret: site_secret_plain });
  } catch (e) {
    error(e.message);
    return fail(res, e.message, 500);
  }
}

module.exports = async ({ req, res, log, error }) => {
  if (!hasAppwriteBootstrap()) {
    error('[wphub-sites] Missing APPWRITE bootstrap (endpoint, project, API key for gateway execution).');
    return fail(
      res,
      'Function environment is not configured. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY.',
      500,
    );
  }

  let databases;
  try {
    ({ databases } = await createServerClientAndDatabases(log, error));
  } catch (e) {
    error(`[wphub-sites] ${e.message}`);
    return fail(res, 'Could not resolve Appwrite credentials from appwrite-gateway.', 500);
  }

  let payloadObj = {};
  try {
    payloadObj = parsePayload(req);
  } catch (_parseErr) {
    return fail(res, 'Invalid request body. JSON expected.', 400);
  }

  req._parsedPayload = payloadObj;
  req._authUserId = getAuthenticatedUserId(req);
  const action = (req.query?.action || payloadObj.action || '').toLowerCase();

  if (action === 'create') return handleCreate(req, res, error, { databases });
  if (action === 'update') return handleUpdate(req, res, error, { databases });
  return fail(res, 'Invalid or missing action. Use action: "create" or "update".', 400);
};
