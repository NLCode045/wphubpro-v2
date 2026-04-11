const { success, fail } = require('../lib/responses');

module.exports = async function getSubscriptionSchedule(ctx) {
  const { stripe, res, error, payload } = ctx;
  const id = payload.schedule_id || payload.scheduleId;
  if (!id) return fail(res, 'schedule_id required', 400);
  try {
    const schedule = await stripe.subscriptionSchedules.retrieve(id);
    return success(res, { schedule });
  } catch (err) {
    error(`getSubscriptionSchedule: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
