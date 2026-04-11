const { success, fail } = require('../lib/responses');
const { getProviderCredentials } = require('../lib/vault');

module.exports = async function getPublishableKey(ctx) {
  const { databases, config, res, log, error } = ctx;
  try {
    const stripeCredentials = await getProviderCredentials(
      'stripe',
      config.ENCRYPTION_KEY,
      databases,
      config.VAULT_DB_ID,
    );

    if (!stripeCredentials.STRIPE_PUBLISHABLE_KEY) {
      error('STRIPE_PUBLISHABLE_KEY not found in vault');
      return fail(res, 'Stripe configuration incomplete', 503);
    }

    return success(res, { publishable_key: stripeCredentials.STRIPE_PUBLISHABLE_KEY });
  } catch (err) {
    error(`Failed to retrieve publishable key: ${err.message}`);
    return fail(res, err.message, 500);
  }
};
