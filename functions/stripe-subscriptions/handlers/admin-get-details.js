const Stripe = require("stripe");
const ensureAdmin = require("../lib/ensureAdmin");
const buildSubscriptionDetailsPayload = require("./subscription-details-common");

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
    return res.json({ error: "Missing STRIPE_SECRET_KEY" }, 500);
  }

  if (!(await ensureAdmin(req))) {
    return res.json({ error: "Admin access required" }, 403);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

  try {
    const payload = parsePayload(req, payloadFromIndex);
    const { subscriptionId } = payload;
    if (!subscriptionId) {
      return res.json({ error: "subscriptionId is required" }, 400);
    }

    log("admin-get-details for subscription " + subscriptionId);

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice", "customer", "default_payment_method", "schedule"],
    });

    const response = await buildSubscriptionDetailsPayload(stripe, subscription, log);
    return res.json(response, 200);
  } catch (e) {
    error("admin-get-details: " + e.message);
    return res.json({ error: e.message }, e.statusCode || 500);
  }
};
