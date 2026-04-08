/**
 * stripe-gateway: Central Stripe API gateway
 *
 * This gateway:
 * - Holds sole access to Stripe credentials in the vault
 * - Performs all Stripe API operations
 * - Exposes clean, domain-specific methods to other functions
 * - Never exposes raw credentials to callers
 *
 * Consumers: stripe-products, stripe-invoices, stripe-subscriptions, stripe-payments, etc.
 */
const sdk = require('node-appwrite');
const Stripe = require('stripe');
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
 * Initialize Stripe client with credentials from vault
 */
async function initializeStripe(databases, config) {
  try {
    const stripeCredentials = await getProviderCredentials(
      'stripe',
      config.ENCRYPTION_KEY,
      databases,
      config.VAULT_DB_ID
    );

    if (!stripeCredentials.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not found in vault');
    }

    return new Stripe(stripeCredentials.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  } catch (err) {
    throw new Error(`Failed to initialize Stripe: ${err.message}`);
  }
}

/**
 * Route handler for Stripe operations
 */
async function handleStripeOperation(req, res, log, error, action, stripe, databases, config) {
  try {
    const payload = parsePayload(req);

    switch (action) {
      case 'list-products':
        return await listProducts(stripe, res, log, payload);

      case 'get-product':
        return await getProduct(stripe, res, log, payload);

      case 'create-product':
        return await createProduct(stripe, res, log, error, payload);

      case 'list-prices':
        return await listPrices(stripe, res, log, payload);

      case 'create-price':
        return await createPrice(stripe, res, log, payload);

      case 'list-customers':
        return await listCustomers(stripe, res, log, payload);

      case 'get-customer':
        return await getCustomer(stripe, res, log, payload);

      case 'create-customer':
        return await createCustomer(stripe, res, log, payload);

      case 'list-invoices':
        return await listInvoices(stripe, res, log, payload);

      case 'get-invoice':
        return await getInvoice(stripe, res, log, payload);

      case 'verify-webhook':
        return await verifyWebhook(databases, config, req, res, log, error);

      case 'get-publishable-key':
        return await getPublishableKey(databases, config, res, log, error);

      default:
        return fail(res, `Unknown action: ${action}`, 400);
    }
  } catch (err) {
    error(`stripe-gateway error: ${err.message}`);
    return fail(res, err.message || 'Stripe operation failed', 500);
  }
}

// --- Stripe Operations ---

async function listProducts(stripe, res, log, payload) {
  const params = { limit: Math.min(payload.limit || 100, 100) };
  if (payload.active !== undefined) params.active = payload.active === true;

  const products = await stripe.products.list(params);
  return success(res, { products: products.data });
}

async function getProduct(stripe, res, log, payload) {
  const { product_id } = payload;
  if (!product_id) return fail(res, 'product_id required', 400);

  const product = await stripe.products.retrieve(product_id);
  return success(res, { product });
}

async function createProduct(stripe, res, log, error, payload) {
  const { name, description, metadata } = payload;
  if (!name) return fail(res, 'name required', 400);

  try {
    const product = await stripe.products.create({
      name,
      description: description || '',
      metadata: metadata || {},
    });
    log(`Created Stripe product: ${product.id}`);
    return success(res, { product });
  } catch (err) {
    error(`Failed to create product: ${err.message}`);
    return fail(res, err.message, 400);
  }
}

async function listPrices(stripe, res, log, payload) {
  const params = { limit: Math.min(payload.limit || 100, 100) };
  if (payload.product) params.product = payload.product;
  if (payload.active !== undefined) params.active = payload.active === true;

  const prices = await stripe.prices.list(params);
  return success(res, { prices: prices.data });
}

async function createPrice(stripe, res, log, payload) {
  const { product_id, amount, currency, interval } = payload;
  if (!product_id || !amount) return fail(res, 'product_id and amount required', 400);

  try {
    const price = await stripe.prices.create({
      product: product_id,
      unit_amount: Math.round(parseFloat(amount) * 100),
      currency: currency || 'usd',
      recurring: interval ? { interval, interval_count: 1 } : undefined,
    });
    log(`Created Stripe price: ${price.id}`);
    return success(res, { price });
  } catch (err) {
    return fail(res, err.message, 400);
  }
}

async function listCustomers(stripe, res, log, payload) {
  const params = { limit: Math.min(payload.limit || 100, 100) };
  const customers = await stripe.customers.list(params);
  return success(res, { customers: customers.data });
}

async function getCustomer(stripe, res, log, payload) {
  const { customer_id } = payload;
  if (!customer_id) return fail(res, 'customer_id required', 400);

  const customer = await stripe.customers.retrieve(customer_id);
  return success(res, { customer });
}

async function createCustomer(stripe, res, log, payload) {
  const { email, name, metadata } = payload;

  try {
    const customer = await stripe.customers.create({
      email: email || undefined,
      name: name || undefined,
      metadata: metadata || {},
    });
    log(`Created Stripe customer: ${customer.id}`);
    return success(res, { customer });
  } catch (err) {
    return fail(res, err.message, 400);
  }
}

async function listInvoices(stripe, res, log, payload) {
  const params = { limit: Math.min(payload.limit || 100, 100) };
  if (payload.customer) params.customer = payload.customer;

  const invoices = await stripe.invoices.list(params);
  return success(res, { invoices: invoices.data });
}

async function getInvoice(stripe, res, log, payload) {
  const { invoice_id } = payload;
  if (!invoice_id) return fail(res, 'invoice_id required', 400);

  const invoice = await stripe.invoices.retrieve(invoice_id);
  return success(res, { invoice });
}

async function verifyWebhook(databases, config, req, res, log, error) {
  try {
    const stripeCredentials = await getProviderCredentials(
      'stripe',
      config.ENCRYPTION_KEY,
      databases,
      config.VAULT_DB_ID
    );

    const stripe = new Stripe(stripeCredentials.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(req.body || '', 'utf8');

    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        stripeCredentials.STRIPE_WEBHOOK_SECRET
      );
      return success(res, { verified: true, event });
    } catch (err) {
      error(`Webhook verification failed: ${err.message}`);
      return fail(res, 'Webhook verification failed', 401);
    }
  } catch (err) {
    error(`Webhook processing error: ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function getPublishableKey(databases, config, res, log, error) {
  try {
    const stripeCredentials = await getProviderCredentials(
      'stripe',
      config.ENCRYPTION_KEY,
      databases,
      config.VAULT_DB_ID
    );

    if (!stripeCredentials.STRIPE_PUBLISHABLE_KEY) {
      error('STRIPE_PUBLISHABLE_KEY not found in vault');
      return fail(res, 'Stripe configuration incomplete', 503);
    }

    // Never expose this through regular routes - only for get-public-credentials function
    return success(res, { publishable_key: stripeCredentials.STRIPE_PUBLISHABLE_KEY });
  } catch (err) {
    error(`Failed to retrieve publishable key: ${err.message}`);
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

    // Initialize Stripe
    const stripe = await initializeStripe(databases, config);

    // Parse action from request
    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '').toLowerCase().trim();

    if (!action) {
      return fail(res, 'action parameter required', 400);
    }

    // Route to appropriate handler
    return await handleStripeOperation(req, res, log, error, action, stripe, databases, config);
  } catch (err) {
    error(`stripe-gateway fatal error: ${err.message}`);
    return fail(res, 'Gateway initialization failed', 500);
  }
};
