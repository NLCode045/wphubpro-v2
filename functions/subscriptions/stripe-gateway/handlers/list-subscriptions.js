const { success, fail } = require('../lib/responses');

/** List subscriptions (e.g. by customer). Payload: customer, status, limit */
module.exports = async function listSubscriptions(ctx) {
  const { stripe, res, error, payload } = ctx;
  try {
    const params = { limit: Math.min(Number(payload.limit) || 10, 100) };
    if (payload.customer) params.customer = payload.customer;
    if (payload.status) params.status = payload.status;
    if (payload.starting_after) params.starting_after = payload.starting_after;
    const list = await stripe.subscriptions.list(params);
    return success(res, { subscriptions: list.data, has_more: list.has_more });
  } catch (err) {
    error(`listSubscriptions: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
