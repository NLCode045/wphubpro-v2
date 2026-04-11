const { success, fail } = require('../lib/responses');

/** Rows for admin UI (`useAdminPaymentsList` expects `orders`, not raw Stripe objects). */
function mapPaymentIntentsToOrders(paymentIntentsData) {
  return paymentIntentsData.map((pi) => {
    const cust = pi.customer;
    const customer = typeof cust === 'string' ? cust : cust?.id ?? null;
    const email =
      pi.receipt_email ||
      (typeof cust === 'object' && cust && cust.email ? cust.email : null) ||
      null;
    return {
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      status: pi.status,
      customer,
      email,
      date: pi.created,
      description: pi.description ?? null,
      invoice: null,
    };
  });
}

module.exports = async function adminListPaymentIntents(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const startTime = Date.now();
  log('adminListPaymentIntents: START - payload:', JSON.stringify(payload));
  try {
    const params = {
      limit: Math.min(Number(payload.limit) || 100, 100),
      expand: ['data.customer'],
    };
    if (payload.status) params.status = payload.status;
    const customerFilter = payload.customer || payload.customerId;
    if (customerFilter) params.customer = customerFilter;

    log(`adminListPaymentIntents: Stripe API call - paymentIntents.list(${JSON.stringify({ ...params, expand: '[data.customer]' })})`);

    const paymentIntents = await stripe.paymentIntents.list(params);
    const orders = mapPaymentIntentsToOrders(paymentIntents.data);
    log(
      `adminListPaymentIntents: SUCCESS - received ${orders.length} payment intents, duration=${Date.now() - startTime}ms`,
    );
    return success(res, { orders, has_more: paymentIntents.has_more });
  } catch (err) {
    error(`adminListPaymentIntents: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
