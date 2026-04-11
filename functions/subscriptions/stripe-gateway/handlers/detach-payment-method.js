const { success, fail } = require('../lib/responses');

module.exports = async function detachPaymentMethod(ctx) {
  const { stripe, res, error, payload } = ctx;
  const { paymentMethodId } = payload;
  if (!paymentMethodId) return fail(res, 'paymentMethodId required', 400);

  try {
    await stripe.paymentMethods.detach(paymentMethodId);
    return success(res, {});
  } catch (err) {
    error(`Failed to detach payment method: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
