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
const { validateGatewayEnvironment } = require('./lib/env');
const { parsePayload, mergeNestedPayload } = require('./lib/payload');
const { fail } = require('./lib/responses');
const { initializeStripe } = require('./lib/stripeClient');
const handlers = require('./handlers');

async function handleStripeOperation(req, res, log, error, action, stripe, databases, config, users) {
  log(`handleStripeOperation: Processing action="${action}"`);
  try {
    const payload = mergeNestedPayload(parsePayload(req));
    const handler = handlers[action];
    if (!handler) {
      log(`handleStripeOperation: UNHANDLED ACTION "${action}" - returning 400 error`);
      error(`handleStripeOperation: Unhandled action: ${action}`);
      return fail(res, `Unknown action: ${action}`, 400);
    }

    const ctx = { req, res, log, error, stripe, databases, users, config, payload };
    return await handler(ctx);
  } catch (err) {
    error(`handleStripeOperation error: ${err.message}`);
    return fail(res, err.message || 'Stripe operation failed', 500);
  }
}

module.exports = async ({ req, res, log, error }) => {
  log('stripe-gateway: Handler entry point');

  try {
    log('stripe-gateway: Validating gateway environment');
    const config = validateGatewayEnvironment();
    log(`stripe-gateway: Environment validated. Vault DB: ${config.VAULT_DB_ID}`);

    log('stripe-gateway: Initializing Appwrite admin client');
    const adminClient = new sdk.Client()
      .setEndpoint(config.APPWRITE_ENDPOINT)
      .setProject(config.APPWRITE_PROJECT_ID)
      .setKey(config.APPWRITE_API_KEY);

    const databases = new sdk.Databases(adminClient);
    const users = new sdk.Users(adminClient);
    log('stripe-gateway: Appwrite clients initialized');

    log('stripe-gateway: Initializing Stripe client');
    const stripe = await initializeStripe(databases, config, log);
    log('stripe-gateway: Stripe client initialized');

    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '').toLowerCase().trim();

    log(`stripe-gateway: Parsed action="${action}", payload keys: ${Object.keys(payload).join(', ')}`);

    if (!action) {
      log('stripe-gateway: No action provided in request');
      return fail(res, 'action parameter required', 400);
    }

    log(`stripe-gateway: Routing to handler for action: ${action}`);
    return await handleStripeOperation(req, res, log, error, action, stripe, databases, config, users);
  } catch (err) {
    error(`stripe-gateway fatal error: ${err.message}`);
    return fail(res, 'Gateway initialization failed', 500);
  }
};
