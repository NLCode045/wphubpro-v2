const Stripe = require("stripe");
const ensureAdmin = require("../lib/ensureAdmin");

function parsePayload(req, payloadFromIndex) {
  if (payloadFromIndex && typeof payloadFromIndex === "object") return payloadFromIndex;
  try {
    if (req.body && typeof req.body === "object") return req.body;
    if (req.body && typeof req.body === "string") return JSON.parse(req.body || "{}");
    if (req.payload && typeof req.payload === "object") return req.payload;
    if (req.payload && typeof req.payload === "string") return JSON.parse(req.payload || "{}");
  } catch (e) {}
  return {};
}

module.exports = async ({ req, res, log, error, payload: payloadFromIndex }) => {
  const STRIPE_SECRET_KEY =
    req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.json({ success: false, error: "Missing STRIPE_SECRET_KEY" }, 500);
  }
  if (!(await ensureAdmin(req))) {
    return res.json({ success: false, error: "Admin access required" }, 403);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  const payload = parsePayload(req, payloadFromIndex);
  const subscriptionId = payload.subscriptionId;
  const immediate = payload.immediate === true || payload.immediate === "true";

  if (!subscriptionId) {
    return res.json({ success: false, error: "subscriptionId is required" }, 400);
  }

  try {
    if (immediate) {
      const canceled = await stripe.subscriptions.cancel(subscriptionId);
      log("admin-cancel immediate " + subscriptionId);
      return res.json({
        success: true,
        message: "Subscription cancelled immediately.",
        subscriptionId: canceled.id,
        status: canceled.status,
      });
    }

    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    log("admin-cancel at period end " + subscriptionId);
    return res.json({
      success: true,
      message: "Subscription will cancel at period end.",
      cancelAt: updated.cancel_at,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      subscriptionId: updated.id,
    });
  } catch (e) {
    error("admin-cancel-subscription: " + e.message);
    return res.json({ success: false, error: e.message }, e.statusCode || 500);
  }
};
