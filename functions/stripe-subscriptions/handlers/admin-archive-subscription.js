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

/**
 * Soft-archive for admin UI: sets metadata hub_archived=true.
 * Does not cancel billing unless cancelAtPeriodEnd/immediate flags are set.
 */
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
  if (!subscriptionId) {
    return res.json({ success: false, error: "subscriptionId is required" }, 400);
  }

  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const metadata = { ...(sub.metadata || {}), hub_archived: "true" };
    const update = { metadata };

    if (payload.cancelAtPeriodEnd === true || payload.cancelAtPeriodEnd === "true") {
      update.cancel_at_period_end = true;
    }
    if (payload.immediate === true || payload.immediate === "true") {
      await stripe.subscriptions.update(subscriptionId, { metadata });
      const canceled = await stripe.subscriptions.cancel(subscriptionId);
      log("admin-archive immediate cancel " + subscriptionId);
      return res.json({
        success: true,
        message: "Subscription archived and cancelled.",
        subscriptionId: canceled.id,
        status: canceled.status,
      });
    }

    const updated = await stripe.subscriptions.update(subscriptionId, update);
    log("admin-archive metadata " + subscriptionId);
    return res.json({
      success: true,
      message: "Subscription marked archived in metadata.",
      subscriptionId: updated.id,
      metadata: updated.metadata,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
    });
  } catch (e) {
    error("admin-archive-subscription: " + e.message);
    return res.json({ success: false, error: e.message }, e.statusCode || 500);
  }
};
