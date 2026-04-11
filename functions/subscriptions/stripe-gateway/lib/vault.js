const { decryptPayload } = require('./crypto');

/**
 * Retrieve provider credentials from vault database
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
    console.log(`getProviderCredentials: Querying vault for provider="${provider}", vaultDbId="${vaultDbId}"`);
    const doc = await databases.getDocument(vaultDbId, 'connectors', provider);
    console.log(`getProviderCredentials: Retrieved vault document for provider="${provider}"`);

    if (!doc || !doc.encrypted_payload) {
      throw new Error(`Credentials for provider '${provider}' not found in vault`);
    }

    console.log(`getProviderCredentials: Decrypting payload for provider="${provider}"`);
    const credentials = decryptPayload(doc.encrypted_payload, encryptionKey);
    console.log(`getProviderCredentials: Successfully decrypted credentials for provider="${provider}"`);
    return credentials;
  } catch (err) {
    if (err.code === 404) {
      throw new Error(`Provider '${provider}' not found in vault`);
    }
    throw err;
  }
}

module.exports = { getProviderCredentials };
