const sdk = require("node-appwrite");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async ({ req, res, log, error }) => {
  const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, STRIPE_SECRET_KEY } =
    process.env;

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !STRIPE_SECRET_KEY) {
    return res.json({ error: "Missing configuration" }, 500);
  }

  try {
    let payload = {};
    if (req.payload) {
      payload = typeof req.payload === "string" ? JSON.parse(req.payload) : req.payload;
    } else if (req.body) {
      payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }

    const { subscriptionId, newPriceId } = payload;

    if (!subscriptionId || !newPriceId) {
      return res.json({ error: "Missing subscriptionId or newPriceId" }, 400);
    }

    // Get the subscription to find the current item
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const item = subscription.items.data[0];

    // Retrieve upcoming invoice preview for the change
    const prorationDate = Math.floor(Date.now() / 1000);

    const invoice = await stripe.invoices.retrieveUpcoming({
      customer: subscription.customer,
      subscription: subscriptionId,
      subscription_items: [
        {
          id: item.id,
          price: newPriceId,
        },
      ],
      subscription_proration_date: prorationDate,
    });

    // Calculate the immediate payment amount (proration)
    // Usually `amount_due` on the upcoming invoice represents what will be charged.
    // Or check `lines` for specific proration line items.
    // For simple upgrades, `amount_due` is the prorated amount.

    return res.json({
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      nextPaymentDate: invoice.next_payment_attempt,
      lines: invoice.lines.data.map((l) => ({
        description: l.description,
        amount: l.amount,
        period: l.period,
      })),
    });
  } catch (err) {
    error("Preview failed: " + err.message);
    return res.json({ error: err.message }, 500);
  }
};
