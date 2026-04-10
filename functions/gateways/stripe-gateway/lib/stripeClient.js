const Stripe = require('stripe');
const { getProviderCredentials } = require('./vault');

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
      config.VAULT_DB_ID,
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

module.exports = { initializeStripe };
