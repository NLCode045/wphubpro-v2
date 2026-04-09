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
async function initializeStripe(databases, config, log) {
  try {
    log(`initializeStripe: Getting Stripe credentials from vault`);
    const stripeCredentials = await getProviderCredentials(
      'stripe',
      config.ENCRYPTION_KEY,
      databases,
      config.VAULT_DB_ID
    );

    if (!stripeCredentials.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not found in vault');
    }

    log(`initializeStripe: Creating Stripe client with API version 2023-10-16`);
    return new Stripe(stripeCredentials.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  } catch (err) {
    throw new Error(`Failed to initialize Stripe: ${err.message}`);
  }
}

/**
 * Route handler for Stripe operations
 */
async function handleStripeOperation(req, res, log, error, action, stripe, databases, config, users) {
  log(`handleStripeOperation: Processing action="${action}"`);
  try {
    const payload = parsePayload(req);

    switch (action) {
      case 'list-products':
        log('handleStripeOperation: Routing to listProducts');
        return await listProducts(stripe, res, log, payload);

      /** WPHub admin + billing: catalog shaped as StripePlan[] (see stripe-products consumer / frontend). */
      case 'list':
        log('handleStripeOperation: Routing to listPlansCatalog');
        return await listPlansCatalog(stripe, res, log, error, payload);

      case 'get-product':
        log('handleStripeOperation: Routing to getProduct');
        return await getProduct(stripe, res, log, payload);

      case 'create-product':
        log('handleStripeOperation: Routing to createProduct');
        return await createProduct(stripe, res, log, error, payload);

      case 'list-prices':
        log('handleStripeOperation: Routing to listPrices');
        return await listPrices(stripe, res, log, payload);

      case 'create-price':
        log('handleStripeOperation: Routing to createPrice');
        return await createPrice(stripe, res, log, payload);

      case 'list-customers':
        log('handleStripeOperation: Routing to listCustomers');
        return await listCustomers(stripe, res, log, payload);

      case 'get-customer':
        log('handleStripeOperation: Routing to getCustomer');
        return await getCustomer(stripe, res, log, payload);

      case 'create-customer':
        log('handleStripeOperation: Routing to createCustomer');
        return await createCustomer(stripe, res, log, payload);

      case 'list-invoices':
        log('handleStripeOperation: Routing to listInvoices');
        return await listInvoices(stripe, res, log, payload);

      case 'get-invoice':
        log('handleStripeOperation: Routing to getInvoice');
        return await getInvoice(stripe, res, log, payload);

      case 'get-subscription':
        log('handleStripeOperation: Routing to getSubscription');
        return await getSubscription(stripe, res, log, payload);

      case 'get-price':
        log('handleStripeOperation: Routing to getPrice');
        return await getPrice(stripe, res, log, payload);

      case 'create-portal-session':
        log('handleStripeOperation: Routing to createPortalSession');
        return await createPortalSession(stripe, res, log, payload);

      case 'list-payment-methods':
        log('handleStripeOperation: Routing to listPaymentMethods');
        return await listPaymentMethods(stripe, res, log, payload);

      case 'create-setup-intent':
        log('handleStripeOperation: Routing to createSetupIntent');
        return await createSetupIntent(stripe, res, log, payload);

      case 'attach-payment-method':
        log('handleStripeOperation: Routing to attachPaymentMethod');
        return await attachPaymentMethod(stripe, res, log, payload);

      case 'detach-payment-method':
        log('handleStripeOperation: Routing to detachPaymentMethod');
        return await detachPaymentMethod(stripe, res, log, payload);

      case 'set-default-payment-method':
        log('handleStripeOperation: Routing to setDefaultPaymentMethod');
        return await setDefaultPaymentMethod(stripe, res, log, payload);

      case 'verify-webhook':
        log('handleStripeOperation: Routing to verifyWebhook');
        return await verifyWebhook(databases, config, req, res, log, error);

      case 'get-publishable-key':
        log('handleStripeOperation: Routing to getPublishableKey');
        return await getPublishableKey(databases, config, res, log, error);

      case 'admin-list-subscriptions':
        log('handleStripeOperation: Routing to adminListSubscriptions');
        return await adminListSubscriptions(stripe, databases, users, res, log, error, payload, config);

      case 'admin-finance-summary':
        log('handleStripeOperation: Routing to adminFinanceSummary');
        return await adminFinanceSummary(stripe, res, log, error, payload);

      case 'admin-finance-dashboard':
        log('handleStripeOperation: Routing to adminFinanceDashboard');
        return await adminFinanceDashboard(stripe, databases, users, res, log, error, payload, config);

      case 'admin-get-details':
        log('handleStripeOperation: Routing to adminGetDetails');
        return await adminGetDetails(stripe, databases, users, res, log, error, payload, config);

      case 'admin-list-payment-intents':
        log('handleStripeOperation: Routing to adminListPaymentIntents');
        return await adminListPaymentIntents(stripe, databases, users, res, log, error, payload, config);

      case 'admin-get-payment-intent':
        log('handleStripeOperation: Routing to adminGetPaymentIntent');
        return await adminGetPaymentIntent(stripe, databases, users, res, log, error, payload, config);

      case 'admin-cancel-subscription':
        log('handleStripeOperation: Routing to adminCancelSubscription');
        return await adminCancelSubscription(stripe, res, log, error, payload);

      case 'admin-pause-subscription':
        log('handleStripeOperation: Routing to adminPauseSubscription');
        return await adminPauseSubscription(stripe, res, log, error, payload);

      case 'admin-resume-subscription':
        log('handleStripeOperation: Routing to adminResumeSubscription');
        return await adminResumeSubscription(stripe, res, log, error, payload);

      case 'admin-archive-subscription':
        log('handleStripeOperation: Routing to adminArchiveSubscription');
        return await adminArchiveSubscription(stripe, res, log, error, payload);

      case 'admin-update-subscription-price':
        log('handleStripeOperation: Routing to adminUpdateSubscriptionPrice');
        return await adminUpdateSubscriptionPrice(stripe, res, log, error, payload);

      default:
        log(`handleStripeOperation: UNHANDLED ACTION "${action}" - returning 400 error`);
        error(`handleStripeOperation: Unhandled action: ${action}`);
        return fail(res, `Unknown action: ${action}`, 400);
    }
  } catch (err) {
    error(`handleStripeOperation error: ${err.message}`);
    return fail(res, err.message || 'Stripe operation failed', 500);
  }
}

// --- Stripe Operations ---

function buildPlanFromProduct(product, pricesData) {
  const metadata = Object.entries(product.metadata || {}).map(([key, value]) => ({
    key,
    value: String(value),
  }));

  const allPrices = pricesData.map((pr) => ({
    id: pr.id,
    amount: pr.unit_amount != null ? pr.unit_amount / 100 : 0,
    currency: pr.currency || 'eur',
    interval: pr.recurring?.interval || 'one_time',
    interval_count: pr.recurring?.interval_count || 1,
  }));

  let monthlyPrice = 0;
  let yearlyPrice = 0;
  let monthlyPriceId = null;
  let yearlyPriceId = null;
  let currency = 'eur';

  for (const pr of pricesData) {
    if (!pr.recurring) continue;
    currency = pr.currency || currency;
    const amount = pr.unit_amount != null ? pr.unit_amount / 100 : 0;
    if (pr.recurring.interval === 'month') {
      monthlyPrice = amount;
      monthlyPriceId = pr.id;
    } else if (pr.recurring.interval === 'year') {
      yearlyPrice = amount;
      yearlyPriceId = pr.id;
    }
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    status: product.active ? 'active' : 'inactive',
    monthlyPrice,
    yearlyPrice,
    monthlyPriceId,
    yearlyPriceId,
    currency,
    metadata,
    allPrices,
  };
}

async function countSubscriptionsByProduct(stripe, log) {
  const subIdsByProduct = new Map();
  let subscriptionCountsTruncated = false;
  const statuses = ['active', 'trialing', 'past_due', 'paused'];
  const maxPagesPerStatus = 8;

  for (const status of statuses) {
    let startingAfter;
    for (let page = 0; page < maxPagesPerStatus; page++) {
      const batch = await stripe.subscriptions.list({
        status,
        limit: 100,
        starting_after: startingAfter,
        expand: ['data.items.data.price'],
      });

      for (const sub of batch.data) {
        for (const item of sub.items.data) {
          const price = item.price;
          if (!price) continue;
          const pref = price.product;
          const productId = typeof pref === 'string' ? pref : pref?.id;
          if (!productId) continue;
          if (!subIdsByProduct.has(productId)) subIdsByProduct.set(productId, new Set());
          subIdsByProduct.get(productId).add(sub.id);
        }
      }

      if (!batch.has_more) break;
      if (batch.data.length === 0) break;
      startingAfter = batch.data[batch.data.length - 1].id;
      if (page === maxPagesPerStatus - 1 && batch.has_more) {
        subscriptionCountsTruncated = true;
      }
    }
  }

  const counts = {};
  for (const [productId, set] of subIdsByProduct.entries()) {
    counts[productId] = set.size;
  }
  return { counts, subscriptionCountsTruncated };
}

async function listPlansCatalog(stripe, res, log, error, payload) {
  try {
    const body =
      payload.payload && typeof payload.payload === 'object' && !Array.isArray(payload.payload)
        ? { ...payload, ...payload.payload }
        : payload;
    const activeOnly = body.active_only === true;
    const excludeHidden = body.exclude_hidden === true;
    const excludeNonSellable = body.exclude_non_sellable === true;
    const includeCounts = body.include_active_subscription_counts === true;

    let subCounts = null;
    let subscriptionCountsTruncated = false;
    if (includeCounts) {
      const counted = await countSubscriptionsByProduct(stripe, log);
      subCounts = counted.counts;
      subscriptionCountsTruncated = counted.subscriptionCountsTruncated;
    }

    const plans = [];
    let hasMore = true;
    let startingAfter;
    const maxProductPages = 10;

    for (let pPage = 0; pPage < maxProductPages && hasMore; pPage++) {
      const params = { limit: 100 };
      if (activeOnly) params.active = true;
      if (startingAfter) params.starting_after = startingAfter;

      const batch = await stripe.products.list(params);

      for (const product of batch.data) {
        if (excludeHidden && product.metadata?.hidden === 'true') continue;
        if (excludeNonSellable && product.metadata?.non_sellable === 'true') continue;

        const priceList = await stripe.prices.list({ product: product.id, limit: 100 });
        const row = buildPlanFromProduct(product, priceList.data);
        if (includeCounts) {
          row.activeSubscriptionsCount = subCounts ? subCounts[product.id] ?? 0 : 0;
        }
        plans.push(row);
      }

      hasMore = batch.has_more;
      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    return success(res, { plans, subscriptionCountsTruncated });
  } catch (err) {
    error(`listPlansCatalog: ${err.message}`);
    return fail(res, err.message, 500);
  }
}

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

async function getSubscription(stripe, res, log, payload) {
  const { subscriptionId } = payload;
  if (!subscriptionId) return fail(res, 'subscriptionId required', 400);

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return success(res, { subscription });
  } catch (err) {
    error(`Failed to retrieve subscription: ${err.message}`);
    return fail(res, err.message, 400);
  }
}

async function getPrice(stripe, res, log, payload) {
  const { priceId } = payload;
  if (!priceId) return fail(res, 'priceId required', 400);

  try {
    const price = await stripe.prices.retrieve(priceId);
    return success(res, { price });
  } catch (err) {
    error(`Failed to retrieve price: ${err.message}`);
    return fail(res, err.message, 400);
  }
}

async function createPortalSession(stripe, res, log, payload) {
  const { customerId, returnUrl } = payload;
  if (!customerId) return fail(res, 'customerId required', 400);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || 'https://wphubpro.netlify.app/#/subscription',
    });
    log(`Created billing portal session: ${session.id}`);
    return success(res, { url: session.url, session_id: session.id });
  } catch (err) {
    error(`Failed to create portal session: ${err.message}`);
    return fail(res, err.message, 400);
  }
}

async function listPaymentMethods(stripe, res, log, payload) {
  const { customerId } = payload;
  if (!customerId) return fail(res, 'customerId required', 400);

  try {
    const [paymentMethods, customer] = await Promise.all([
      stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      }),
      stripe.customers.retrieve(customerId),
    ]);
    const list = (paymentMethods.data || []).map((pm) => ({
      id: pm.id,
      type: pm.type,
      card: pm.card
        ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
          }
        : null,
    }));
    const dpm = customer.invoice_settings?.default_payment_method;
    const defaultPaymentMethodId =
      typeof dpm === "string" ? dpm : dpm && dpm.id ? dpm.id : null;
    return success(res, { paymentMethods: list, defaultPaymentMethodId });
  } catch (err) {
    error(`Failed to list payment methods: ${err.message}`);
    return fail(res, err.message, 400);
  }
}

async function createSetupIntent(stripe, res, log, payload) {
  const { customerId } = payload;
  if (!customerId) return fail(res, 'customerId required', 400);

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      automatic_payment_methods: { enabled: true },
    });
    return success(res, { clientSecret: setupIntent.client_secret });
  } catch (err) {
    error(`Failed to create setup intent: ${err.message}`);
    return fail(res, err.message, 400);
  }
}

async function attachPaymentMethod(stripe, res, log, payload) {
  const { customerId, paymentMethodId, setAsDefault } = payload;
  if (!customerId || !paymentMethodId) return fail(res, 'customerId and paymentMethodId required', 400);

  try {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    if (setAsDefault) {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 });
      if (subs.data.length > 0) {
        await stripe.subscriptions.update(subs.data[0].id, { default_payment_method: paymentMethodId });
      }
    }
    return success(res, {});
  } catch (err) {
    error(`Failed to attach payment method: ${err.message}`);
    return fail(res, err.message, 400);
  }
}

async function detachPaymentMethod(stripe, res, log, payload) {
  const { paymentMethodId } = payload;
  if (!paymentMethodId) return fail(res, 'paymentMethodId required', 400);

  try {
    await stripe.paymentMethods.detach(paymentMethodId);
    return success(res, {});
  } catch (err) {
    error(`Failed to detach payment method: ${err.message}`);
    return fail(res, err.message, 400);
  }
}

async function setDefaultPaymentMethod(stripe, res, log, payload) {
  const { customerId, paymentMethodId } = payload;
  if (!customerId || !paymentMethodId) return fail(res, 'customerId and paymentMethodId required', 400);

  try {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
    for (const sub of subs.data) {
      if (sub.status === "active" || sub.status === "trialing") {
        await stripe.subscriptions.update(sub.id, { default_payment_method: paymentMethodId });
        break;
      }
    }
    return success(res, {});
  } catch (err) {
    error(`Failed to set default payment method: ${err.message}`);
    return fail(res, err.message, 400);
  }
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

// --- Admin Handlers ---

async function adminListSubscriptions(stripe, databases, users, res, log, error, payload, config) {
  const startTime = Date.now();
  log('adminListSubscriptions: START - payload:', JSON.stringify(payload));
  try {
    log('adminListSubscriptions: Getting Stripe credentials from vault');
    const stripeCredentials = await getProviderCredentials('stripe', config.ENCRYPTION_KEY, databases, config.VAULT_DB_ID);
    if (!stripeCredentials.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not found');
    log('adminListSubscriptions: Stripe credentials retrieved');

    const params = { limit: Math.min(payload.limit || 100, 100) };
    if (payload.status) params.status = payload.status;
    if (payload.priceId) {
      params.price = payload.priceId;
    }
    log(`adminListSubscriptions: Calling Stripe API with params:`, JSON.stringify(params));
    
    const subscriptions = await stripe.subscriptions.list(params);
    log(`adminListSubscriptions: SUCCESS - received ${subscriptions.data.length} subscriptions, has_more=${subscriptions.has_more}, duration=${Date.now() - startTime}ms`);
    return success(res, { subscriptions: subscriptions.data, has_more: subscriptions.has_more });
  } catch (err) {
    error(`adminListSubscriptions: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function adminFinanceSummary(stripe, res, log, error, payload) {
  const startTime = Date.now();
  log('adminFinanceSummary: START');
  try {
    const statusCounts = { active: 0, trialing: 0, past_due: 0, canceled: 0, unpaid: 0, paused: 0, incomplete: 0 };
    log('adminFinanceSummary: Counting subscriptions by status');
    
    for (const status of Object.keys(statusCounts)) {
      log(`adminFinanceSummary: Querying status="${status}"`);
      let total = 0;
      let startingAfter = null;
      for (let page = 0; page < 5; page++) {
        const params = { status, limit: 100 };
        if (startingAfter) params.starting_after = startingAfter;
        log(`adminFinanceSummary: Stripe API call - subscriptions.list({status:"${status}", page:${page}, limit:100})`);
        const batch = await stripe.subscriptions.list(params);
        log(`adminFinanceSummary: Received ${batch.data.length} items for status="${status}", page=${page}`);
        total += batch.data.length;
        if (!batch.has_more || !batch.data.length) break;
        startingAfter = batch.data[batch.data.length - 1].id;
      }
      statusCounts[status] = total;
      log(`adminFinanceSummary: Status "${status}" total count: ${total}`);
    }

    log('adminFinanceSummary: Computing MRR from active subscriptions');
    let mrrCents = 0;
    let startingAfter = null;
    for (let page = 0; page < 5; page++) {
      const params = { status: 'active', limit: 100, expand: ['data.items.data.price'] };
      if (startingAfter) params.starting_after = startingAfter;
      log(`adminFinanceSummary: Stripe API call - subscriptions.list({status:"active", page:${page}, expand:...})`);
      const batch = await stripe.subscriptions.list(params);
      log(`adminFinanceSummary: Received ${batch.data.length} active subscriptions for MRR calculation, page=${page}`);
      for (const sub of batch.data) {
        const item = sub.items?.data?.[0];
        const price = item?.price;
        if (price?.unit_amount != null && price.recurring) {
          const ic = price.recurring.interval_count || 1;
          let monthlyAmount = price.unit_amount * (item.quantity || 1);
          if (price.recurring.interval === 'year') monthlyAmount /= (12 * ic);
          else if (price.recurring.interval === 'week') monthlyAmount *= 52 / (12 * ic);
          else if (price.recurring.interval === 'day') monthlyAmount *= 30 / ic;
          else monthlyAmount /= ic;
          mrrCents += monthlyAmount;
        }
      }
      if (!batch.has_more || !batch.data.length) break;
      startingAfter = batch.data[batch.data.length - 1].id;
    }
    log(`adminFinanceSummary: Computed MRR: ${Math.round(mrrCents)} cents`);

    log('adminFinanceSummary: Querying failed payment intents');
    const failedPi = await stripe.paymentIntents.list({ limit: 20, created: { gte: Math.floor(Date.now() / 1000) - 7 * 24 * 3600 } });
    log(`adminFinanceSummary: Stripe API call - paymentIntents.list() returned ${failedPi.data.length} intents`);
    const recentFailedPayments = failedPi.data.filter((pi) => ['requires_payment_method', 'canceled'].includes(pi.status)).length;
    log(`adminFinanceSummary: Found ${recentFailedPayments} failed payments in last 7 days`);

    log('adminFinanceSummary: Querying paid invoices');
    const paidInvoices = await stripe.invoices.list({ limit: 30, status: 'paid' });
    log(`adminFinanceSummary: Stripe API call - invoices.list() returned ${paidInvoices.data.length} paid invoices`);
    const revenueLastInvoicesCents = paidInvoices.data.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
    log(`adminFinanceSummary: Total revenue from last 30 paid invoices: ${revenueLastInvoicesCents} cents`);

    log(`adminFinanceSummary: SUCCESS - duration=${Date.now() - startTime}ms`);
    return success(res, {
      subscriptionCountsByStatus: statusCounts,
      approximateMrrCents: Math.round(mrrCents),
      approximateMrr: Math.round(mrrCents) / 100,
      recentFailedPaymentIntents7d: recentFailedPayments,
      revenueFromLast30PaidInvoicesCents: revenueLastInvoicesCents,
    });
  } catch (err) {
    error(`adminFinanceSummary: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function adminFinanceDashboard(stripe, databases, users, res, log, error, payload, config) {
  const startTime = Date.now();
  log('adminFinanceDashboard: START - payload:', JSON.stringify(payload));
  try {
    log('adminFinanceDashboard: Getting Stripe credentials from vault');
    const stripeCredentials = await getProviderCredentials('stripe', config.ENCRYPTION_KEY, databases, config.VAULT_DB_ID);
    if (!stripeCredentials.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not found');
    log('adminFinanceDashboard: Stripe credentials retrieved');
    
    const period = payload.period || 'week';
    const now = Math.floor(Date.now() / 1000);
    let windowStart, windowEnd;
    log(`adminFinanceDashboard: Period="${period}"`);
    
    if (period === 'day') {
      windowStart = now - 7 * 86400;
      windowEnd = now;
    } else if (period === 'month') {
      windowStart = now - 30 * 86400;
      windowEnd = now;
    } else if (period === 'year') {
      windowStart = now - 365 * 86400;
      windowEnd = now;
    } else {
      windowStart = now - 7 * 86400;
      windowEnd = now;
    }
    log(`adminFinanceDashboard: Window: ${windowStart} to ${windowEnd}`);

    log('adminFinanceDashboard: Querying recent paid invoices');
    const recentPaidInvoices = await stripe.invoices.list({ status: 'paid', limit: 20, expand: ['data.customer'] });
    log(`adminFinanceDashboard: Stripe API call - invoices.list() returned ${recentPaidInvoices.data.length} invoices`);
    const recentSubscriptionChanges = [];
    log(`adminFinanceDashboard: Initialized recentSubscriptionChanges array`);

    log(`adminFinanceDashboard: SUCCESS - duration=${Date.now() - startTime}ms`);
    return success(res, {
      success: true,
      period,
      windowStart,
      windowEnd,
      recentPaidInvoices: recentPaidInvoices.data.slice(0, 10).map(inv => ({
        id: inv.id,
        amount_paid: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
      })),
      recentSubscriptionChanges,
    });
  } catch (err) {
    error(`adminFinanceDashboard: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function adminGetDetails(stripe, databases, users, res, log, error, payload, config) {
  const startTime = Date.now();
  log('adminGetDetails: START - payload:', JSON.stringify(payload));
  try {
    const { subscription_id } = payload;
    if (!subscription_id) {
      log('adminGetDetails: Missing subscription_id parameter');
      return fail(res, 'subscription_id required', 400);
    }
    
    log(`adminGetDetails: Stripe API call - subscriptions.retrieve("${subscription_id}", {expand:...})`);
    const subscription = await stripe.subscriptions.retrieve(subscription_id, { expand: ['customer', 'items.data.price.product'] });
    log(`adminGetDetails: SUCCESS - retrieved subscription "${subscription_id}", duration=${Date.now() - startTime}ms`);
    return success(res, { subscription });
  } catch (err) {
    error(`adminGetDetails: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function adminListPaymentIntents(stripe, databases, users, res, log, error, payload, config) {
  const startTime = Date.now();
  log('adminListPaymentIntents: START - payload:', JSON.stringify(payload));
  try {
    const params = { limit: Math.min(payload.limit || 100, 100) };
    if (payload.status) params.status = payload.status;
    if (payload.customerId) params.customer = payload.customerId;
    log(`adminListPaymentIntents: Stripe API call - paymentIntents.list(${JSON.stringify(params)})`);
    
    const paymentIntents = await stripe.paymentIntents.list(params);
    log(`adminListPaymentIntents: SUCCESS - received ${paymentIntents.data.length} payment intents, duration=${Date.now() - startTime}ms`);
    return success(res, { paymentIntents: paymentIntents.data, has_more: paymentIntents.has_more });
  } catch (err) {
    error(`adminListPaymentIntents: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function adminGetPaymentIntent(stripe, databases, users, res, log, error, payload, config) {
  const startTime = Date.now();
  log('adminGetPaymentIntent: START - payload:', JSON.stringify(payload));
  try {
    const { payment_intent_id } = payload;
    if (!payment_intent_id) {
      log('adminGetPaymentIntent: Missing payment_intent_id parameter');
      return fail(res, 'payment_intent_id required', 400);
    }
    
    log(`adminGetPaymentIntent: Stripe API call - paymentIntents.retrieve("${payment_intent_id}")`);
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    log(`adminGetPaymentIntent: SUCCESS - retrieved payment intent "${payment_intent_id}", duration=${Date.now() - startTime}ms`);
    return success(res, { paymentIntent });
  } catch (err) {
    error(`adminGetPaymentIntent: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function adminCancelSubscription(stripe, res, log, error, payload) {
  const startTime = Date.now();
  log('adminCancelSubscription: START - payload:', JSON.stringify(payload));
  try {
    const { subscription_id } = payload;
    if (!subscription_id) {
      log('adminCancelSubscription: Missing subscription_id parameter');
      return fail(res, 'subscription_id required', 400);
    }
    
    log(`adminCancelSubscription: Stripe API call - subscriptions.del("${subscription_id}")`);
    const subscription = await stripe.subscriptions.del(subscription_id);
    log(`adminCancelSubscription: SUCCESS - cancelled subscription "${subscription_id}", duration=${Date.now() - startTime}ms`);
    return success(res, { subscription });
  } catch (err) {
    error(`adminCancelSubscription: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function adminPauseSubscription(stripe, res, log, error, payload) {
  const startTime = Date.now();
  log('adminPauseSubscription: START - payload:', JSON.stringify(payload));
  try {
    const { subscription_id } = payload;
    if (!subscription_id) {
      log('adminPauseSubscription: Missing subscription_id parameter');
      return fail(res, 'subscription_id required', 400);
    }
    
    log(`adminPauseSubscription: Stripe API call - subscriptions.update("${subscription_id}", {pause_collection:...})`);
    const subscription = await stripe.subscriptions.update(subscription_id, { pause_collection: { behavior: 'mark_uncollectible' } });
    log(`adminPauseSubscription: SUCCESS - paused subscription "${subscription_id}", duration=${Date.now() - startTime}ms`);
    return success(res, { subscription });
  } catch (err) {
    error(`adminPauseSubscription: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function adminResumeSubscription(stripe, res, log, error, payload) {
  const startTime = Date.now();
  log('adminResumeSubscription: START - payload:', JSON.stringify(payload));
  try {
    const { subscription_id } = payload;
    if (!subscription_id) {
      log('adminResumeSubscription: Missing subscription_id parameter');
      return fail(res, 'subscription_id required', 400);
    }
    
    log(`adminResumeSubscription: Stripe API call - subscriptions.update("${subscription_id}", {pause_collection:{}})`);
    const subscription = await stripe.subscriptions.update(subscription_id, { pause_collection: {} });
    log(`adminResumeSubscription: SUCCESS - resumed subscription "${subscription_id}", duration=${Date.now() - startTime}ms`);
    return success(res, { subscription });
  } catch (err) {
    error(`adminResumeSubscription: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function adminArchiveSubscription(stripe, res, log, error, payload) {
  const startTime = Date.now();
  log('adminArchiveSubscription: START - payload:', JSON.stringify(payload));
  try {
    const { subscription_id, archive_reason } = payload;
    if (!subscription_id) {
      log('adminArchiveSubscription: Missing subscription_id parameter');
      return fail(res, 'subscription_id required', 400);
    }
    
    const metadata = { archived: 'true', archived_at: new Date().toISOString(), archived_reason: archive_reason || 'admin_request' };
    log(`adminArchiveSubscription: Stripe API call - subscriptions.update("${subscription_id}", {metadata:...})`);
    const subscription = await stripe.subscriptions.update(subscription_id, { metadata });
    log(`adminArchiveSubscription: SUCCESS - archived subscription "${subscription_id}", duration=${Date.now() - startTime}ms`);
    return success(res, { subscription });
  } catch (err) {
    error(`adminArchiveSubscription: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function adminUpdateSubscriptionPrice(stripe, res, log, error, payload) {
  const startTime = Date.now();
  log('adminUpdateSubscriptionPrice: START - payload:', JSON.stringify(payload));
  try {
    const { subscription_id, price_id } = payload;
    if (!subscription_id || !price_id) {
      log('adminUpdateSubscriptionPrice: Missing subscription_id or price_id parameter');
      return fail(res, 'subscription_id and price_id required', 400);
    }
    
    log(`adminUpdateSubscriptionPrice: Stripe API call - subscriptions.retrieve("${subscription_id}")`);
    const subscription = await stripe.subscriptions.retrieve(subscription_id);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) {
      log('adminUpdateSubscriptionPrice: No subscription items found');
      return fail(res, 'No subscription items found', 400);
    }
    
    log(`adminUpdateSubscriptionPrice: Stripe API call - subscriptions.update("${subscription_id}", {items:[{id:"${itemId}", price:"${price_id}"}], ...})`);
    const updated = await stripe.subscriptions.update(subscription_id, {
      items: [{ id: itemId, price: price_id }],
      proration_behavior: 'create_prorations',
    });
    log(`adminUpdateSubscriptionPrice: SUCCESS - updated subscription "${subscription_id}" price to "${price_id}", duration=${Date.now() - startTime}ms`);
    return success(res, { subscription: updated });
  } catch (err) {
    error(`adminUpdateSubscriptionPrice: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
}

// --- Main Handler ---
module.exports = async ({ req, res, log, error }) => {
  log('stripe-gateway: Handler entry point');
  
  try {
    log('stripe-gateway: Validating gateway environment');
    const config = validateGatewayEnvironment();
    log(`stripe-gateway: Environment validated. Vault DB: ${config.VAULT_DB_ID}`);

    // Initialize Appwrite admin client
    log('stripe-gateway: Initializing Appwrite admin client');
    const adminClient = new sdk.Client()
      .setEndpoint(config.APPWRITE_ENDPOINT)
      .setProject(config.APPWRITE_PROJECT_ID)
      .setKey(config.APPWRITE_API_KEY);

    const databases = new sdk.Databases(adminClient);
    const users = new sdk.Users(adminClient);
    log('stripe-gateway: Appwrite clients initialized');

    // Initialize Stripe
    log('stripe-gateway: Initializing Stripe client');
    const stripe = await initializeStripe(databases, config, log);
    log('stripe-gateway: Stripe client initialized');

    // Parse action from request
    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '').toLowerCase().trim();

    log(`stripe-gateway: Parsed action="${action}", payload keys: ${Object.keys(payload).join(', ')}`);

    if (!action) {
      log('stripe-gateway: No action provided in request');
      return fail(res, 'action parameter required', 400);
    }

    // Route to appropriate handler
    log(`stripe-gateway: Routing to handler for action: ${action}`);
    return await handleStripeOperation(req, res, log, error, action, stripe, databases, config, users);
  } catch (err) {
    error(`stripe-gateway fatal error: ${err.message}`);
    return fail(res, 'Gateway initialization failed', 500);
  }
};
