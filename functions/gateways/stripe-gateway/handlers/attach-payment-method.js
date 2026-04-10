const { success, fail } = require('../lib/responses');

module.exports = async function attachPaymentMethod(ctx) {
  const { stripe, res, error, payload } = ctx;
  const { customerId, paymentMethodId, setAsDefault } = payload;
  if (!customerId || !paymentMethodId) return fail(res, 'customerId and paymentMethodId required', 400);

  try {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    if (setAsDefault) {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 1 });
      if (subs.data.length > 0) {
        await stripe.subscriptions.update(subs.data[0].id, { default_payment_method: paymentMethodId });
      }
    }
    return success(res, {});
  } catch (err) {
    error(`Failed to attach payment method: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
