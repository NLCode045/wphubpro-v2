const { success, fail } = require('../lib/responses');

module.exports = async function listPaymentMethods(ctx) {
  const { stripe, res, error, payload } = ctx;
  const { customerId } = payload;
  if (!customerId) return fail(res, 'customerId required', 400);

  try {
    const [paymentMethods, customer] = await Promise.all([
      stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
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
    const defaultPaymentMethodId = typeof dpm === 'string' ? dpm : dpm && dpm.id ? dpm.id : null;
    return success(res, { paymentMethods: list, defaultPaymentMethodId });
  } catch (err) {
    error(`Failed to list payment methods: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
