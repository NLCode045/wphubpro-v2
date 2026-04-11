const { success, fail } = require('../lib/responses');

module.exports = async function releaseSubscriptionSchedule(ctx) {
  const { stripe, res, error, payload } = ctx;
  try {
    const { schedule_id, scheduleId } = payload;
    const id = schedule_id || scheduleId;
    if (!id) return fail(res, 'schedule_id required', 400);
    const released = await stripe.subscriptionSchedules.release(id);
    return success(res, { schedule: released });
  } catch (err) {
    error(`releaseSubscriptionSchedule: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
