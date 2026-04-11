const { success, fail } = require('../lib/responses');

module.exports = async function listSubscriptionSchedules(ctx) {
  const { stripe, res, error, payload } = ctx;
  try {
    const params = { limit: Math.min(Number(payload.limit) || 5, 20) };
    if (payload.subscription) params.subscription = payload.subscription;
    const list = await stripe.subscriptionSchedules.list(params);
    return success(res, { schedules: list.data });
  } catch (err) {
    error(`listSubscriptionSchedules: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
