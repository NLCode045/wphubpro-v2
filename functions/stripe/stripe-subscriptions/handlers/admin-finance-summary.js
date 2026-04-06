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

function monthlyNormalizedAmount(unitAmountCents, interval, intervalCount) {
  if (!unitAmountCents || unitAmountCents <= 0) return 0;
  const ic = intervalCount || 1;
  if (interval === "year") return unitAmountCents / 12 / ic;
  if (interval === "week") return (unitAmountCents * 52) / 12 / ic;
  if (interval === "day") return (unitAmountCents * 30) / ic;
  return unitAmountCents / ic;
}

async function countSubscriptionsByStatus(stripe, log, maxPagesPerStatus) {
  const statuses = ["active", "trialing", "past_due", "canceled", "unpaid", "paused", "incomplete"];
  const counts = {};
  for (const s of statuses) {
    let total = 0;
    let startingAfter = null;
    let pages = 0;
    while (pages < maxPagesPerStatus) {
      const params = { status: s, limit: 100 };
      if (startingAfter) params.starting_after = startingAfter;
      const batch = await stripe.subscriptions.list(params);
      pages += 1;
      total += batch.data.length;
      if (!batch.has_more || !batch.data.length) break;
      startingAfter = batch.data[batch.data.length - 1].id;
    }
    counts[s] = total;
  }
  return counts;
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
  const maxPagesPerStatus = Math.min(Math.max(parseInt(payload.maxPagesPerStatus, 10) || 5, 1), 20);

  try {
    const statusCounts = await countSubscriptionsByStatus(stripe, log, maxPagesPerStatus);

    let mrrCents = 0;
    let activeTrialingSample = 0;
    let startingAfter = null;
    let pages = 0;
    const mrrMaxPages = 5;
    while (pages < mrrMaxPages) {
      const params = {
        status: "active",
        limit: 100,
        expand: ["data.items.data.price"],
      };
      if (startingAfter) params.starting_after = startingAfter;
      const batch = await stripe.subscriptions.list(params);
      pages += 1;
      for (const sub of batch.data) {
        activeTrialingSample += 1;
        const item = sub.items?.data?.[0];
        const price = item?.price;
        if (price?.unit_amount != null && price.recurring) {
          mrrCents += monthlyNormalizedAmount(
            price.unit_amount * (item.quantity || 1),
            price.recurring.interval,
            price.recurring.interval_count
          );
        }
      }
      if (!batch.has_more || !batch.data.length) break;
      startingAfter = batch.data[batch.data.length - 1].id;
    }

    let trialingPages = 0;
    startingAfter = null;
    while (trialingPages < mrrMaxPages) {
      const params = {
        status: "trialing",
        limit: 100,
        expand: ["data.items.data.price"],
      };
      if (startingAfter) params.starting_after = startingAfter;
      const batch = await stripe.subscriptions.list(params);
      trialingPages += 1;
      for (const sub of batch.data) {
        activeTrialingSample += 1;
        const item = sub.items?.data?.[0];
        const price = item?.price;
        if (price?.unit_amount != null && price.recurring) {
          mrrCents += monthlyNormalizedAmount(
            price.unit_amount * (item.quantity || 1),
            price.recurring.interval,
            price.recurring.interval_count
          );
        }
      }
      if (!batch.has_more || !batch.data.length) break;
      startingAfter = batch.data[batch.data.length - 1].id;
    }

    const failedPi = await stripe.paymentIntents.list({
      limit: 20,
      created: { gte: Math.floor(Date.now() / 1000) - 7 * 24 * 3600 },
    });
    const recentFailedPayments = failedPi.data.filter((pi) =>
      ["requires_payment_method", "canceled"].includes(pi.status)
    ).length;

    const paidInvoices = await stripe.invoices.list({
      limit: 30,
      status: "paid",
    });
    const revenueLastInvoicesCents = paidInvoices.data.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);

    return res.json({
      success: true,
      subscriptionCountsByStatus: statusCounts,
      approximateMrrCents: Math.round(mrrCents),
      approximateMrr: Math.round(mrrCents) / 100,
      note:
        "MRR is approximate from up to 5 pages of active + trialing subscriptions (Stripe list caps).",
      recentFailedPaymentIntents7d: recentFailedPayments,
      lastPaidInvoicesSample: paidInvoices.data.slice(0, 10).map((inv) => ({
        id: inv.id,
        amount_paid: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
        customer:
          typeof inv.customer === "string" ? inv.customer : inv.customer?.id || null,
      })),
      revenueFromLast30PaidInvoicesCents: revenueLastInvoicesCents,
    });
  } catch (e) {
    error("admin-finance-summary: " + e.message);
    return res.json({ success: false, error: e.message }, e.statusCode || 500);
  }
};
