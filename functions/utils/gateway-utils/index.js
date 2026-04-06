/**
 * gateway-utils: Central utility function for gateway communication and vault access
 *
 * This function:
 * - Handles all gateway-to-gateway communication
 * - Manages vault credential retrieval and decryption
 * - Provides utilities for all other functions
 *
 * All gateways and consumer functions call this to access credentials or call other gateways
 */
const crypto = require('crypto');

/**
 * Derive a consistent 32-byte key from the encryption key string using SHA256
 */
function deriveKey(encryptionKey) {
  return crypto.createHash('sha256').update(String(encryptionKey), 'utf8').digest();
}

/**
 * Decrypt a payload encrypted with AES-256-GCM
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

/**
 * Retrieve and decrypt provider credentials from vault
 */
async function getProviderCredentials(provider, encryptionKey, databases, vaultDbId) {
  if (!provider || typeof provider !== 'string') {
    throw new Error('provider must be a non-empty string');
  }
  if (!encryptionKey || typeof encryptionKey !== 'string') {
    throw new Error('encryptionKey must be a non-empty string');
  }
  if (!databases) {
    throw new Error('databases client is required');
  }
  if (!vaultDbId || typeof vaultDbId !== 'string') {
    throw new Error('vaultDbId must be a non-empty string');
  }

  try {
    const doc = await databases.getDocument(vaultDbId, 'connectors', provider);

    if (!doc || !doc.encrypted_payload) {
      throw new Error(`Credentials for provider '${provider}' not found in vault`);
    }

    const credentials = decryptPayload(doc.encrypted_payload, encryptionKey);
    return credentials;
  } catch (err) {
    if (err.code === 404) {
      throw new Error(`Provider '${provider}' not found in vault`);
    }
    throw err;
  }
}

/**
 * Handle gateway-to-gateway calls
 */
async function callGateway(gatewayFunctionId, action, payload = {}) {
  try {
    const functionUrl = `${process.env.APPWRITE_FUNCTION_ENDPOINT}/functions/${gatewayFunctionId}/executions`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        payload,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gateway returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (err) {
    throw new Error(`Failed to call gateway: ${err.message}`);
  }
}

module.exports = async ({ req, res, log, error }) => {
  try {
    // Parse request
    let payload = {};
    if (req.body && typeof req.body === 'object') payload = req.body;
    else if (req.bodyRaw && typeof req.bodyRaw === 'string') {
      try { payload = JSON.parse(req.bodyRaw); } catch { payload = {}; }
    } else if (req.payload && typeof req.payload === 'string') {
      try { payload = JSON.parse(req.payload); } catch { payload = {}; }
    } else if (req.payload && typeof req.payload === 'object') payload = req.payload;

    const operation = String(payload.operation || '').toLowerCase().trim();

    switch (operation) {
      case 'get-credentials':
        // Gateway utility: Retrieve encrypted credentials from vault
        {
          const { provider, encryption_key, databases, vault_db_id } = payload;
          if (!provider) return res.json({ success: false, message: 'provider required' }, 400);

          // databases is passed as stringified Appwrite client context
          // In real usage, gateways would have their own Appwrite client
          const credentials = await getProviderCredentials(
            provider,
            encryption_key || process.env.ENCRYPTION_KEY,
            databases,
            vault_db_id || process.env.VAULT_DB_ID || '69d2ecf3000f449c752f'
          );

          return res.json({ success: true, credentials });
        }

      case 'call-gateway':
        // Consumer/Gateway utility: Call another gateway
        {
          const { gateway_id, action, payload: gw_payload } = payload;
          if (!gateway_id || !action) {
            return res.json({ success: false, message: 'gateway_id and action required' }, 400);
          }

          const result = await callGateway(gateway_id, action, gw_payload || {});
          return res.json(result);
        }

      default:
        return res.json(
          {
            success: false,
            message: `Unknown operation: ${operation}. Supported: get-credentials, call-gateway`,
          },
          400
        );
    }
  } catch (err) {
    error(`gateway-utils error: ${err.message}`);
    return res.json({ success: false, message: err.message }, 500);
  }
};
