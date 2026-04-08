/**
 * s3-gateway: Central AWS S3 API gateway
 *
 * This gateway:
 * - Holds sole access to S3 credentials in the vault
 * - Performs all S3 API operations (upload, download, delete, list, etc.)
 * - Exposes clean S3 operations to other functions
 * - Never exposes raw credentials to callers
 *
 * Consumers: zip-parser, file-upload, asset-management functions
 */
const sdk = require('node-appwrite');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');
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
 * Initialize S3 client with credentials from vault
 */
async function initializeS3(databases, config) {
  try {
    const s3Credentials = await getProviderCredentials(
      's3',
      config.ENCRYPTION_KEY,
      databases,
      config.VAULT_DB_ID
    );

    const required = ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET', 'S3_REGION'];
    const missing = required.filter(key => !s3Credentials[key]);
    if (missing.length > 0) {
      throw new Error(`Missing S3 credentials: ${missing.join(', ')}`);
    }

    return {
      client: new S3Client({
        region: s3Credentials.S3_REGION,
        credentials: {
          accessKeyId: s3Credentials.S3_ACCESS_KEY_ID,
          secretAccessKey: s3Credentials.S3_SECRET_ACCESS_KEY,
        },
      }),
      bucket: s3Credentials.S3_BUCKET,
      region: s3Credentials.S3_REGION,
    };
  } catch (err) {
    throw new Error(`Failed to initialize S3: ${err.message}`);
  }
}

/**
 * Route handler for S3 operations
 */
async function handleS3Operation(req, res, log, error, action, s3, payload) {
  try {
    switch (action) {
      case 'upload':
        return await uploadObject(s3, res, log, error, payload, req);

      case 'download':
        return await downloadObject(s3, res, log, error, payload);

      case 'delete':
        return await deleteObject(s3, res, log, error, payload);

      case 'list':
        return await listObjects(s3, res, log, error, payload);

      case 'head':
        return await headObject(s3, res, log, error, payload);

      default:
        return fail(res, `Unknown action: ${action}`, 400);
    }
  } catch (err) {
    error(`s3-gateway error: ${err.message}`);
    return fail(res, err.message || 'S3 operation failed', 500);
  }
}

// --- S3 Operations ---

async function uploadObject(s3, res, log, error, payload, req) {
  const { key, content_type } = payload;
  if (!key) return fail(res, 'key required', 400);

  try {
    let body;
    if (req.body instanceof Buffer) {
      body = req.body;
    } else if (typeof req.body === 'string') {
      body = Buffer.from(req.body, 'utf8');
    } else {
      body = Buffer.from(JSON.stringify(req.body));
    }

    const command = new PutObjectCommand({
      Bucket: s3.bucket,
      Key: key,
      Body: body,
      ContentType: content_type || 'application/octet-stream',
    });

    await s3.client.send(command);
    log(`Uploaded S3 object: ${key}`);
    return success(res, { key, bucket: s3.bucket });
  } catch (err) {
    error(`Upload failed: ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function downloadObject(s3, res, log, error, payload) {
  const { key } = payload;
  if (!key) return fail(res, 'key required', 400);

  try {
    const command = new GetObjectCommand({
      Bucket: s3.bucket,
      Key: key,
    });

    const response = await s3.client.send(command);
    const buffer = await response.Body.transformToByteArray();

    return success(res, {
      key,
      size: buffer.length,
      content_type: response.ContentType,
      data: buffer.toString('base64'),
    });
  } catch (err) {
    if (err.name === 'NoSuchKey') {
      return fail(res, `Object not found: ${key}`, 404);
    }
    error(`Download failed: ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function deleteObject(s3, res, log, error, payload) {
  const { key } = payload;
  if (!key) return fail(res, 'key required', 400);

  try {
    const command = new DeleteObjectCommand({
      Bucket: s3.bucket,
      Key: key,
    });

    await s3.client.send(command);
    log(`Deleted S3 object: ${key}`);
    return success(res, { key, deleted: true });
  } catch (err) {
    error(`Delete failed: ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function listObjects(s3, res, log, error, payload) {
  const { prefix, max_keys } = payload;

  try {
    const command = new ListObjectsV2Command({
      Bucket: s3.bucket,
      Prefix: prefix || '',
      MaxKeys: Math.min(parseInt(max_keys) || 100, 1000),
    });

    const response = await s3.client.send(command);
    return success(res, {
      objects: (response.Contents || []).map(obj => ({
        key: obj.Key,
        size: obj.Size,
        modified: obj.LastModified,
      })),
      count: response.KeyCount || 0,
    });
  } catch (err) {
    error(`List failed: ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function headObject(s3, res, log, error, payload) {
  const { key } = payload;
  if (!key) return fail(res, 'key required', 400);

  try {
    const command = new HeadObjectCommand({
      Bucket: s3.bucket,
      Key: key,
    });

    const response = await s3.client.send(command);
    return success(res, {
      key,
      size: response.ContentLength,
      content_type: response.ContentType,
      modified: response.LastModified,
    });
  } catch (err) {
    if (err.name === 'NotFound') {
      return fail(res, `Object not found: ${key}`, 404);
    }
    error(`Head failed: ${err.message}`);
    return fail(res, err.message, 500);
  }
}

// --- Main Handler ---
module.exports = async ({ req, res, log, error }) => {
  try {
    const config = validateGatewayEnvironment();

    // Initialize Appwrite admin client
    const adminClient = new sdk.Client()
      .setEndpoint(config.APPWRITE_ENDPOINT)
      .setProject(config.APPWRITE_PROJECT_ID)
      .setKey(config.APPWRITE_API_KEY);

    const databases = new sdk.Databases(adminClient);

    // Initialize S3
    const s3 = await initializeS3(databases, config);

    // Parse action from request
    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '').toLowerCase().trim();

    if (!action) {
      return fail(res, 'action parameter required', 400);
    }

    // Route to appropriate handler
    return await handleS3Operation(req, res, log, error, action, s3, payload);
  } catch (err) {
    error(`s3-gateway fatal error: ${err.message}`);
    return fail(res, 'Gateway initialization failed', 500);
  }
};
