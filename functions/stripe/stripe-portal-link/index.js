const Stripe = require("stripe");
const sdk = require("node-appwrite");
const crypto = require("crypto");

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

/**
 * Stripe Portal Link Function
 * Creates a Stripe billing portal session for the authenticated user
 *
 * Environment Variables Required:
 * - ENCRYPTION_KEY: For decrypting vault credentials
 * - APPWRITE_ENDPOINT: Appwrite API endpoint
 * - APPWRITE_PROJECT_ID: Appwrite project ID
 * - APPWRITE_API_KEY: Appwrite API key
 *
 * Request Body:
 * - returnUrl: URL to redirect to after portal session (optional)
 */
module.exports = async ({ req, res, log, error }) => {
  try {
    // Get Stripe credentials from vault
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const VAULT_DB_ID = process.env.VAULT_DB_ID || "69d2ecf3000f449c752f";
    const APPWRITE_ENDPOINT =
      process.env.APPWRITE_ENDPOINT ||
      process.env.APPWRITE_FUNCTION_ENDPOINT ||
      process.env.APPWRITE_FUNCTION_API_ENDPOINT;
    const APPWRITE_PROJECT_ID =
      process.env.APPWRITE_PROJECT_ID ||
      process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const APPWRITE_API_KEY =
      process.env.APPWRITE_API_KEY ||
      process.env.APPWRITE_FUNCTION_API_KEY ||
      process.env.APPWRITE_KEY;

    if (!ENCRYPTION_KEY) {
      error("ENCRYPTION_KEY is not configured");
      return res.json(
        {
          success: false,
          message: "Configuration missing",
        },
        500
      );
    }

    let STRIPE_SECRET_KEY;
    try {
      const adminClient = new sdk.Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setKey(APPWRITE_API_KEY);
      const databases = new sdk.Databases(adminClient);

      const stripeCredentials = await getConnectorCredentials("stripe", ENCRYPTION_KEY, databases, VAULT_DB_ID);
      if (!stripeCredentials || !stripeCredentials.STRIPE_SECRET_KEY) {
        error("Stripe credentials not found in vault");
        return res.json(
          {
            success: false,
            message: "Stripe configuration missing",
          },
          500
        );
      }
      STRIPE_SECRET_KEY = stripeCredentials.STRIPE_SECRET_KEY;
    } catch (err) {
      error("Failed to retrieve Stripe credentials: " + err.message);
      return res.json(
        {
          success: false,
          message: "Stripe configuration missing",
        },
        500
      );
    }

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
      error("Appwrite configuration missing");
      return res.json(
        {
          success: false,
          message: "Appwrite configuration missing",
        },
        500
      );
    }

    // Get the authenticated user ID
    const userId = process.env.APPWRITE_FUNCTION_USER_ID || req.headers?.["x-appwrite-user-id"];

    if (!userId) {
      error("User not authenticated");
      return res.json(
        {
          success: false,
          message: "User not authenticated",
        },
        401
      );
    }

    // Parse request body
    let payload = {};
    try {
      if (req.payload && typeof req.payload === "string") {
        payload = JSON.parse(req.payload);
      } else if (req.payload && typeof req.payload === "object") {
        payload = req.payload;
      }
    } catch {
      payload = {};
    }

    const returnUrl = payload.returnUrl || "https://wphubpro.netlify.app/#/subscription";

    const DATABASE_ID =
      process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "platform_db";
    const ACCOUNTS_COLLECTION_ID =
      process.env.ACCOUNTS_COLLECTION_ID || process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || "accounts";

    log(`Creating billing portal session for user: ${userId}`);

    // Initialize Appwrite client
    const client = new sdk.Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const databases = new sdk.Databases(client);

    // Resolve Stripe customer ID from accounts first (same as cancel/get), then fallback to subscriptions
    let stripeCustomerId = null;

    const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
      sdk.Query.equal("user_id", userId),
      sdk.Query.limit(1),
    ]);

    if (accountDocs.total > 0 && accountDocs.documents[0].stripe_customer_id) {
      stripeCustomerId = accountDocs.documents[0].stripe_customer_id;
      log("Found Stripe customer from accounts: " + stripeCustomerId);
    }

    if (!stripeCustomerId) {
      const subscriptions = await databases.listDocuments(DATABASE_ID, "subscriptions", [
        sdk.Query.equal("user_id", userId),
        sdk.Query.limit(1),
      ]);
      if (subscriptions.documents?.length > 0 && subscriptions.documents[0].stripe_customer_id) {
        stripeCustomerId = subscriptions.documents[0].stripe_customer_id;
        log("Found Stripe customer from subscriptions (fallback): " + stripeCustomerId);
      }
    }

    if (!stripeCustomerId) {
      error("No Stripe customer ID found for user");
      return res.json(
        {
          success: false,
          message: "No Stripe customer found. Please create a subscription first or contact support.",
        },
        404
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    log(`Billing portal session created: ${session.id}`);

    return res.json({
      success: true,
      url: session.url,
      session_id: session.id,
    });
  } catch (err) {
    error(`Failed to create billing portal session: ${err.message}`);
    return res.json(
      {
        success: false,
        message: err.message || "Failed to create billing portal session",
      },
      500
    );
  }
};
