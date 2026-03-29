const Stripe = require("stripe");

/**
 * Cancels/releases a pending subscription schedule so future plan changes won't apply.
 * Accepts payload: { scheduleId?: string, subscriptionId?: string }
 * Requires STRIPE_SECRET_KEY environment variable.
 */
module.exports = async ({ req, res, log, error }) => {
  const env =
    req && req.variables && Object.keys(req.variables).length ? req.variables : process.env;
  const stripeKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    error("Missing STRIPE_SECRET_KEY");
    return res.json({ success: false, message: "Stripe key not configured" }, 500);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  let payload = {};
  try {
    if (req.payload && typeof req.payload === "string") payload = JSON.parse(req.payload);
    else if (req.payload && typeof req.payload === "object") payload = req.payload;
    else if (req.bodyRaw) payload = JSON.parse(req.bodyRaw);
  } catch (e) {
    // ignore parse error
    payload = req.query || {};
  }

  const { scheduleId, subscriptionId } = payload;

  try {
    let targetScheduleId = scheduleId;

    if (!targetScheduleId && subscriptionId) {
      // find active/queued schedule for this subscription
      const list = await stripe.subscriptionSchedules.list({
        subscription: subscriptionId,
        limit: 5,
      });
      if (!list || !list.data || list.data.length === 0) {
        return res.json(
          { success: false, message: "No subscription schedule found for subscription" },
          404
        );
      }
      // prefer schedules that are not released
      const candidate = list.data.find((s) => s.status !== "released") || list.data[0];
      targetScheduleId = candidate.id;
    }

    if (!targetScheduleId) {
      return res.json({ success: false, message: "Missing scheduleId or subscriptionId" }, 400);
    }

    // Release the schedule so its future phases won't take effect
    const released = await stripe.subscriptionSchedules.release(targetScheduleId);

    return res.json({ success: true, scheduleId: targetScheduleId, released: released });
  } catch (e) {
    error(e.message || e.toString());
    return res.json({ success: false, message: e.message || "Stripe error" }, 500);
  }
};
