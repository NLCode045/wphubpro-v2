const { mergedEnv } = require('../lib/mergedEnv');
const { callStripeGateway } = require('../lib/callStripeGateway');

module.exports = async ({ req, res, log, error, payload }) => {
  mergedEnv(req);

  try {
    log('Parsed payload: ' + JSON.stringify(payload));

    const userId =
      process.env.APPWRITE_FUNCTION_USER_ID ||
      req.headers?.['x-appwrite-user-id'] ||
      req.headers?.['X-Appwrite-User-Id'];

    if (!userId) {
      error('No user ID found. User must be authenticated.');
      return res.json(
        {
          error: 'User not authenticated. Please log in and try again.',
          hint: 'Make sure you are logged in before subscribing to a plan.',
        },
        401,
      );
    }

    const p = payload && typeof payload === 'object' ? payload : {};
    const { priceId, returnUrl, updateType, paymentMethodId } = p;
    if (!priceId) {
      error('Missing priceId in request payload');
      return res.json({ error: 'priceId is required' }, 400);
    }

    const result = await callStripeGateway(
      'order-payments-checkout',
      { userId, priceId, returnUrl, updateType, paymentMethodId },
      log,
      error,
    );
    return res.json(result);
  } catch (err) {
    error('Failed to process order payment: ' + err.message);
    return res.json(
      { error: err.message || 'An unexpected error occurred', code: 'order_payments_failed' },
      500,
    );
  }
};
