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
  if (!subscriptionId) {
    return res.json({ success: false, error: "subscriptionId is required" }, 400);
  }

  try {
    const updated = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: null,
    });
    log("admin-resume " + subscriptionId);
    return res.json({
      success: true,
      message: "Subscription collection resumed.",
      subscriptionId: updated.id,
      status: updated.status,
    });
  } catch (e) {
    error("admin-resume-subscription: " + e.message);
    return res.json({ success: false, error: e.message }, e.statusCode || 500);
  }
};
