/**
 * google-pagespeed-gateway: Central Google PageSpeed Insights API gateway
 *
 * This gateway:
 * - Holds sole access to Google API credentials in the vault
 * - Performs all Google PageSpeed Insights API operations
 * - Exposes clean, domain-specific methods to other functions
 * - Never exposes raw credentials to callers
 *
 * Consumers: site-pagespeed, performance monitoring functions
 */
const sdk = require('node-appwrite');
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
    throw new Error(`Invalid encrypted payload format: expected 3 parts (iv:encrypted:tag), got ${parts.length}`);
  }

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');

    if (iv.length !== 12) {
      throw new Error(`Invalid IV length: expected 12 bytes, got ${iv.length}`);
    }
    if (authTag.length !== 16) {
      throw new Error(`Invalid auth tag length: expected 16 bytes, got ${authTag.length}`);
    }

    const key = deriveKey(encryptionKey);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch (err) {
    throw new Error(`Decryption failed: ${err.message}. This typically means the ENCRYPTION_KEY is incorrect or the payload was encrypted with a different key.`);
  }
}

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
 * Validate environment configuration for gateway functions
 */
function validateGatewayEnvironment() {
  const required = [
    'ENCRYPTION_KEY',
    'APPWRITE_ENDPOINT',
    'APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
    VAULT_DB_ID: process.env.VAULT_DB_ID || '69d2ecf3000f449c752f',
  };
}

/**
 * Parse request payload from various formats
 */
function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.bodyRaw && typeof req.bodyRaw === 'string') {
    try {
      return JSON.parse(req.bodyRaw);
    } catch {
      return {};
    }
  }
  if (req.payload && typeof req.payload === 'string') {
    try {
      return JSON.parse(req.payload);
    } catch {
      return {};
    }
  }
  if (req.payload && typeof req.payload === 'object') return req.payload;
  return {};
}

// Response helpers
function success(res, data = {}, status = 200) {
  return res.json({ success: true, ...data }, status);
}

function fail(res, message, status = 500) {
  return res.json({ success: false, message }, status);
}

/**
 * Extract score from Lighthouse category
 */
function scoreFromCategory(categories, categoryKey) {
  const cat = categories[categoryKey];
  if (!cat || typeof cat.score !== 'number') return null;
  return Math.round(cat.score * 100);
}

/**
 * Extract Core Web Vitals from Lighthouse result
 */
function extractCoreWebVitals(lighthouseResult) {
  if (!lighthouseResult || !lighthouseResult.audits) return null;

  const cls = lighthouseResult.audits['cumulative-layout-shift'];
  const fid = lighthouseResult.audits['first-input-delay'];
  const lcp = lighthouseResult.audits['largest-contentful-paint'];

  if (!cls || !fid || !lcp) return null;

  return {
    cls: cls.numericValue,
    fid: fid.numericValue,
    lcp: lcp.numericValue,
  };
}

/**
 * Run PageSpeed Insights analysis
 */
async function runPsi(url, psiKey, strategy, log) {
  try {
    const params = new URLSearchParams();
    params.set('url', url);
    params.set('key', String(psiKey).trim());
    params.set('strategy', strategy);
    for (const c of ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO']) {
      params.append('category', c);
    }

    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;
    log(`[google-pagespeed-gateway] PSI ${strategy}: ${url}`);

    const psiRes = await fetch(psiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const psiText = await psiRes.text();
    let psiJson;
    try {
      psiJson = psiText ? JSON.parse(psiText) : {};
    } catch {
      return { ok: false, strategy, message: 'PageSpeed API returned invalid JSON.' };
    }

    if (!psiRes.ok) {
      const msg =
        (psiJson.error && psiJson.error.message) ||
        psiJson.message ||
        `PageSpeed API error (${psiRes.status})`;
      return { ok: false, strategy, message: msg };
    }

    const lr = psiJson.lighthouseResult;
    const categories = lr && lr.categories ? lr.categories : null;
    if (!categories) {
      return { ok: false, strategy, message: 'PageSpeed response had no Lighthouse categories.' };
    }

    const scores = {
      performance: scoreFromCategory(categories, 'performance'),
      accessibility: scoreFromCategory(categories, 'accessibility'),
      bestPractices: scoreFromCategory(categories, 'best-practices'),
      seo: scoreFromCategory(categories, 'seo'),
    };

    return {
      ok: true,
      strategy,
      scores,
      coreWebVitals: extractCoreWebVitals(lr),
      analyzedUrl: psiJson.id || url,
      lighthouseVersion: lr.lighthouseVersion || undefined,
    };
  } catch (e) {
    return { ok: false, strategy, message: e.message || 'PageSpeed request failed.' };
  }
}

/**
 * Main gateway handler
 */
module.exports = async ({ req, res, log, error }) => {
  try {
    const config = validateGatewayEnvironment();
    const client = new sdk.Client()
      .setEndpoint(config.APPWRITE_ENDPOINT)
      .setProject(config.APPWRITE_PROJECT_ID)
      .setKey(config.APPWRITE_API_KEY);
    const databases = new sdk.Databases(client);

    const payload = parsePayload(req);
    const action = String(payload.action || '').toLowerCase().trim();

    // Retrieve Google API credentials from vault
    let googleCredentials;
    try {
      googleCredentials = await getProviderCredentials(
        'google_api',
        config.ENCRYPTION_KEY,
        databases,
        config.VAULT_DB_ID
      );

      if (!googleCredentials || !googleCredentials.GOOGLE_API_KEY) {
        throw new Error('GOOGLE_API_KEY not found in vault');
      }
    } catch (err) {
      error(`Failed to retrieve Google API credentials: ${err.message}`);
      return fail(res, 'Google API credentials not available', 503);
    }

    const psiKey = googleCredentials.GOOGLE_API_KEY;

    // Route to appropriate action handler
    if (action === 'analyze') {
      const url = payload.url || payload.analyzeUrl;
      const strategy = payload.strategy || 'mobile';

      if (!url) {
        return fail(res, 'Missing required field: url', 400);
      }

      if (!['desktop', 'mobile'].includes(strategy)) {
        return fail(res, `Invalid strategy: ${strategy}. Must be 'desktop' or 'mobile'`, 400);
      }

      const result = await runPsi(url, psiKey, strategy, log);

      if (!result.ok) {
        return fail(res, result.message, 400);
      }

      return success(res, result, 200);
    }

    return fail(res, `Unknown action: ${action}. Supported actions: analyze`, 400);
  } catch (err) {
    error(`google-pagespeed-gateway error: ${err.message}`);
    return fail(res, err.message || 'Internal server error', 500);
  }
};
