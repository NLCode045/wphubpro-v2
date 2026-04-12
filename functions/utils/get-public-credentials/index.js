/**
 * get-public-credentials: Returns non-sensitive public credentials (e.g., Stripe publishable key)
 * for authenticated users.
 *
 * Actions:
 * - stripe: Returns { stripe_publishable_key: "pk_..." }
 *
 * Requires JWT authentication in Authorization header.
 */
const sdk = require("node-appwrite");
const crypto = require("crypto");
const { hasAppwriteBootstrap } = require("../../subscriptions/stripe-consumer/lib/appwriteEnv");
const { createServerClientAndDatabases } = require("../../database/fetchAppwriteCredentialsFromGateway");

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
 * Retrieve and decrypt connector credentials from vault
 */
async function getConnectorCredentials(provider, encryptionKey, databases, vaultDbId) {
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
      return null;
    }

    const credentials = decryptPayload(doc.encrypted_payload, encryptionKey);
    return credentials;
  } catch (err) {
    if (err.code === 404) {
      return null;
    }
    throw new Error(`Failed to retrieve connector credentials: ${err.message}`);
  }
}

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (req.bodyRaw && typeof req.bodyRaw === "string") {
    try {
      return JSON.parse(req.bodyRaw);
    } catch {
      return {};
    }
  }
  if (req.payload && typeof req.payload === "string") {
    try {
      return JSON.parse(req.payload);
    } catch {
      return {};
    }
  }
  if (req.payload && typeof req.payload === "object") return req.payload;
  return {};
}

module.exports = async ({ req, res, log, error }) => {
  try {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const VAULT_DB_ID = process.env.VAULT_DB_ID || "69d2ecf3000f449c752f";
    if (!ENCRYPTION_KEY) {
      error("ENCRYPTION_KEY not configured");
      return res.json({ success: false, message: "Server configuration error" }, 500);
    }

    if (!hasAppwriteBootstrap()) {
      error("Appwrite configuration missing");
      return res.json({ success: false, message: "Server configuration error" }, 500);
    }

    let databases;
    let endpoint;
    let projectId;
    try {
      ({ databases, endpoint, projectId } = await createServerClientAndDatabases(log, error));
    } catch (e) {
      error(e.message);
      return res.json({ success: false, message: "Server configuration error" }, 500);
    }

    // Extract and validate JWT from Authorization header
    const authHeader = req.headers?.authorization || req.headers?.Authorization || "";
    const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!headerToken) {
      return res.json({ success: false, message: "Missing authorization token" }, 401);
    }

    // Validate JWT format (basic check)
    const tokenParts = headerToken.split(".");
    if (tokenParts.length !== 3) {
      return res.json({ success: false, message: "Invalid token format" }, 401);
    }

    // Verify JWT and get user
    let user;
    try {
      const jwtClient = new sdk.Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setJWT(headerToken);
      const account = new sdk.Account(jwtClient);
      user = await account.get();
    } catch (err) {
      log("JWT verification failed: " + err.message);
      return res.json({ success: false, message: "Invalid or expired token" }, 401);
    }

    if (!user || !user.$id) {
      return res.json({ success: false, message: "Could not verify user" }, 401);
    }

    // Parse request body to determine which credentials to return
    const payload = parsePayload(req);
    const credential = String(payload.credential || "stripe").toLowerCase().trim();

    if (credential === "stripe") {
      try {
        const stripeCredentials = await getConnectorCredentials(
          "stripe",
          ENCRYPTION_KEY,
          databases,
          VAULT_DB_ID
        );

        if (!stripeCredentials || !stripeCredentials.STRIPE_PUBLISHABLE_KEY) {
          error("Stripe credentials not found or missing publishable key");
          return res.json({ success: false, message: "Stripe configuration missing" }, 503);
        }

        return res.json({
          success: true,
          stripe_publishable_key: stripeCredentials.STRIPE_PUBLISHABLE_KEY,
        });
      } catch (err) {
        error("Failed to retrieve Stripe credentials: " + err.message);
        return res.json({ success: false, message: "Failed to retrieve credentials" }, 500);
      }
    }

    return res.json(
      {
        success: false,
        message: `Unknown credential type: ${credential}. Supported: stripe`,
      },
      400
    );
  } catch (err) {
    error("Unexpected error: " + err.message);
    return res.json({ success: false, message: "Internal server error" }, 500);
  }
};
