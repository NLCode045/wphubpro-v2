const { success, fail } = require('../lib/responses');

module.exports = async function createSetupIntent(ctx) {
  const { stripe, res, error, payload } = ctx;
  const { customerId } = payload;
  if (!customerId) return fail(res, 'customerId required', 400);

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      automatic_payment_methods: { enabled: true },
    });
    return success(res, { clientSecret: setupIntent.client_secret });
  } catch (err) {
    error(`Failed to create setup intent: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
