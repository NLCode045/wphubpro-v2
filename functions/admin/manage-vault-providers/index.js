/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');
const crypto = require('crypto');
const { hasAppwriteBootstrap } = require('../../subscriptions/stripe-consumer/lib/appwriteEnv');
const { createServerClientAndDatabases } = require('../../database/fetchAppwriteCredentialsFromGateway');

/**
 * Derive a consistent 32-byte key from the encryption key string using SHA256
 */
function deriveKey(encryptionKey) {
  return crypto.createHash('sha256').update(String(encryptionKey), 'utf8').digest();
}

/**
 * Encrypt a payload object using AES-256-GCM
 * Returns format: "iv:encryptedData:authTag" (all hex-encoded)
 */
function encryptPayload(plainObject, encryptionKey) {
  if (!plainObject || typeof plainObject !== 'object') {
    throw new Error('plainObject must be an object');
  }
  if (!encryptionKey || typeof encryptionKey !== 'string') {
    throw new Error('encryptionKey must be a non-empty string');
  }

  const iv = crypto.randomBytes(12);
  const key = deriveKey(encryptionKey);
  const plaintext = JSON.stringify(plainObject);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
}

/**
 * Decrypt a payload encrypted with encryptPayload
 * Input format: "iv:encryptedData:authTag" (all hex-encoded)
 */
function decryptPayload(encryptedPayload, encryptionKey) {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') {
    throw new Error('encryptedPayload must be a non-empty string');
  }
  if (!encryptionKey || typeof encryptionKey !== 'string') {
    throw new Error('encryptionKey must be a non-empty string');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');

    if (iv.length !== 12) {
      throw new Error('Invalid IV length');
    }

    const key = deriveKey(encryptionKey);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch (err) {
    throw new Error(`Decryption failed: ${err.message}`);
  }
}

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.payload && typeof req.payload === 'object') return req.payload;
  const raw = req.payload || req.bodyRaw || req.body;
  if (typeof raw === 'string') {
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

function callerUserIdFromReq(req) {
  const fromEnv = process.env.APPWRITE_FUNCTION_USER_ID;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  const h = req.headers || {};
  const v =
    h['x-appwrite-user-id'] ||
    h['X-Appwrite-User-Id'] ||
    h['x-appwrite-function-user-id'] ||
    h['X-Appwrite-Function-User-Id'];
  return v ? String(v).trim() : '';
}

function normalizeProviderId(raw) {
  const s = String(raw || '').trim();
  if (!s) {
    throw new Error('Provider id is required');
  }
  if (s.length > 36) {
    throw new Error('Provider id must be at most 36 characters');
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(s)) {
    throw new Error('Provider id may only contain letters, digits, and . - _');
  }
  return s;
}

async function userIsAdmin(users, teams, userId, log) {
  try {
    const adminTeamId = 'admin';
    const memberships = await teams.listMemberships(adminTeamId);
    if (memberships.memberships.some((m) => m.userId === userId)) return true;
  } catch (teamErr) {
    log('Could not check team membership: ' + teamErr.message);
  }
  const user = await users.get(userId);
  return user.labels?.some(
    (l) => l.toLowerCase() === 'admin' || l.toLowerCase() === 'administrator',
  );
}

module.exports = async ({ req, res, log, error }) => {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const vaultDbId = process.env.VAULT_DB_ID || '69d2ecf3000f449c752f';
  const collectionId = 'connectors';

  if (!hasAppwriteBootstrap()) {
    error('Function environment variables are not configured correctly.');
    return fail(res, 'Function environment is not configured.', 500);
  }

  if (!encryptionKey || typeof encryptionKey !== 'string') {
    error('ENCRYPTION_KEY is not set on this function.');
    return fail(res, 'Server encryption key is not configured.', 500);
  }

  let databases;
  let users;
  let teams;
  try {
    ({ databases, users, teams } = await createServerClientAndDatabases(log, error));
  } catch (e) {
    error(e.message);
    return fail(res, 'Could not resolve Appwrite credentials.', 500);
  }

  let payload = {};
  try {
    payload = parsePayload(req);
  } catch (e) {
    error('Failed to parse request body: ' + e.message);
    return fail(res, 'Invalid request body', 400);
  }

  const actionRaw = String(payload.action || '')
    .toLowerCase()
    .trim();

  const actorUserId = callerUserIdFromReq(req);
  if (!actorUserId) {
    return fail(res, 'Unauthorized: could not resolve caller user', 401);
  }

  // Debug logging
  log('=== DEBUG: manage-vault-providers request ===');
  log('Request headers: ' + JSON.stringify({
    'x-appwrite-user-id': req.headers?.['x-appwrite-user-id'] || '(not set)',
    'X-Appwrite-User-Id': req.headers?.['X-Appwrite-User-Id'] || '(not set)',
    'x-appwrite-function-user-id': req.headers?.['x-appwrite-function-user-id'] || '(not set)',
    'X-Appwrite-Function-User-Id': req.headers?.['X-Appwrite-Function-User-Id'] || '(not set)',
    'x-appwrite-impersonate-user-id': req.headers?.['x-appwrite-impersonate-user-id'] || '(not set)',
    'X-Appwrite-Impersonate-User-Id': req.headers?.['X-Appwrite-Impersonate-User-Id'] || '(not set)',
  }));
  log('Request payload: ' + JSON.stringify(payload));
  log('Extracted actorUserId: ' + actorUserId);
  log('=== END DEBUG ===');

  try {
    const isAdmin = await userIsAdmin(users, teams, actorUserId, log);
    if (!isAdmin) {
      log('User ' + actorUserId + ' is not an admin');
      return fail(res, 'Forbidden: Admin access required', 403);
    }

    if (actionRaw === 'list') {
      const list = await databases.listDocuments(vaultDbId, collectionId, [sdk.Query.limit(500)]);
      const items = (list.documents || []).map((d) => ({
        id: d.$id,
        provider: d.provider || d.$id,
        hasPayload: Boolean(d.encrypted_payload),
      }));
      return ok(res, { success: true, items });
    }

    if (actionRaw === 'get') {
      const provider = normalizeProviderId(payload.provider);
      const doc = await databases.getDocument(vaultDbId, collectionId, provider);
      if (!doc.encrypted_payload) {
        return ok(res, { success: true, provider, credentials: {} });
      }
      let credentials;
      try {
        credentials = decryptPayload(doc.encrypted_payload, encryptionKey);
      } catch (decErr) {
        error('Decrypt failed: ' + decErr.message);
        return fail(res, 'Could not decrypt vault payload for this provider.', 500);
      }
      if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) {
        return ok(res, { success: true, provider, credentials: {} });
      }
      return ok(res, { success: true, provider, credentials });
    }

    if (actionRaw === 'upsert') {
      const provider = normalizeProviderId(payload.provider);
      const creds = payload.credentials;
      if (!creds || typeof creds !== 'object' || Array.isArray(creds)) {
        return fail(res, 'credentials must be a JSON object', 400);
      }
      const encrypted = encryptPayload(creds, encryptionKey);
      let exists = false;
      try {
        await databases.getDocument(vaultDbId, collectionId, provider);
        exists = true;
      } catch (e) {
        if (e.code !== 404) throw e;
      }
      if (exists) {
        await databases.updateDocument(vaultDbId, collectionId, provider, {
          provider,
          encrypted_payload: encrypted,
        });
        return ok(res, { success: true, message: 'Provider updated' });
      }
      await databases.createDocument(vaultDbId, collectionId, provider, {
        provider,
        encrypted_payload: encrypted,
        iv: '',
      });
      return ok(res, { success: true, message: 'Provider created' });
    }

    if (actionRaw === 'delete') {
      const provider = normalizeProviderId(payload.provider);
      await databases.deleteDocument(vaultDbId, collectionId, provider);
      return ok(res, { success: true, message: 'Provider deleted' });
    }

    return fail(res, 'Unknown action. Use list, get, upsert, or delete.', 400);
  } catch (e) {
    if (e.code === 404) {
      return fail(res, e.message || 'Not found', 404);
    }
    error(e.message);
    return fail(res, e.message, 500);
  }
};
