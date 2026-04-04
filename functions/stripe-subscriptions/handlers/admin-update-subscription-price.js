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
  const { subscriptionId, newPriceId } = payload;

  if (!subscriptionId || !newPriceId) {
    return res.json(
      { success: false, error: "subscriptionId and newPriceId are required" },
      400
    );
  }

  const proration =
    payload.proration_behavior === "none" || payload.prorationBehavior === "none"
      ? "none"
      : "always_invoice";

  const restrictSameProduct =
    payload.sameProductOnly === true ||
    payload.sameProductOnly === "true" ||
    payload.restrictSameProduct === true;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const item = subscription.items?.data?.[0];
    if (!item) {
      return res.json({ success: false, error: "Subscription has no line items" }, 400);
    }

    const newPrice = await stripe.prices.retrieve(newPriceId);
    const newProductId = typeof newPrice.product === "string" ? newPrice.product : newPrice.product?.id;

    if (restrictSameProduct) {
      const currentPrice = await stripe.prices.retrieve(item.price.id);
      const currentProductId =
        typeof currentPrice.product === "string"
          ? currentPrice.product
          : currentPrice.product?.id;
      if (newProductId !== currentProductId) {
        return res.json(
          {
            success: false,
            error: "newPriceId must belong to the same product as the current subscription.",
          },
          400
        );
      }
    }

    const updated = await stripe.subscriptions.update(subscriptionId, {
      proration_behavior: proration,
      items: [
        {
          id: item.id,
          price: newPriceId,
          quantity: item.quantity || 1,
        },
      ],
    });

    log("admin-update-subscription-price " + subscriptionId + " -> " + newPriceId);

    return res.json({
      success: true,
      message: "Subscription plan updated.",
      subscriptionId: updated.id,
      status: updated.status,
    });
  } catch (e) {
    error("admin-update-subscription-price: " + e.message);
    return res.json({ success: false, error: e.message }, e.statusCode || 500);
  }
};
