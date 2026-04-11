const Stripe = require('stripe');
const { success, fail } = require('../lib/responses');
const { getProviderCredentials } = require('../lib/vault');

module.exports = async function verifyWebhook(ctx) {
  const { databases, config, req, res, log, error } = ctx;
  try {
    const stripeCredentials = await getProviderCredentials(
      'stripe',
      config.ENCRYPTION_KEY,
      databases,
      config.VAULT_DB_ID,
    );

    const stripe = new Stripe(stripeCredentials.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(req.body || '', 'utf8');

    try {
      const event = stripe.webhooks.constructEvent(rawBody, sig, stripeCredentials.STRIPE_WEBHOOK_SECRET);
      return success(res, { verified: true, event });
    } catch (err) {
      error(`Webhook verification failed: ${err.message}`);
      return fail(res, 'Webhook verification failed', 401);
    }
  } catch (err) {
    error(`Webhook processing error: ${err.message}`);
    return fail(res, err.message, 500);
  }
};
