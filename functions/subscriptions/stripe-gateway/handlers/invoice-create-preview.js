const { success, fail } = require('../lib/responses');

/** Payload matches Stripe invoices.createPreview options */
module.exports = async function invoiceCreatePreview(ctx) {
  const { stripe, res, error, payload } = ctx;
  try {
    const invoice = await stripe.invoices.createPreview(payload);
    return success(res, { invoice });
  } catch (err) {
    error(`invoiceCreatePreview: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
