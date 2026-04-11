const { success, fail } = require('../lib/responses');

module.exports = async function setDefaultPaymentMethod(ctx) {
  const { stripe, res, error, payload } = ctx;
  const { customerId, paymentMethodId } = payload;
  if (!customerId || !paymentMethodId) return fail(res, 'customerId and paymentMethodId required', 400);

  try {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
    for (const sub of subs.data) {
      if (sub.status === 'active' || sub.status === 'trialing') {
        await stripe.subscriptions.update(sub.id, { default_payment_method: paymentMethodId });
        break;
      }
    }
    return success(res, {});
  } catch (err) {
    error(`Failed to set default payment method: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
