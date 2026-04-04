const sdk = require("node-appwrite");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

function parsePayload(req) {
  if (req.payload) {
    return typeof req.payload === "string" ? JSON.parse(req.payload) : req.payload;
  }
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  return {};
}

module.exports = async ({ req, res, log, error }) => {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
  const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || process.env.DATABASE_ID;
  const ACCOUNTS_COLLECTION_ID =
    process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || process.env.ACCOUNTS_COLLECTION_ID;

  if (!STRIPE_SECRET_KEY) {
    return res.json({ error: "Missing STRIPE_SECRET_KEY" }, 500);
  }
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !DATABASE_ID || !ACCOUNTS_COLLECTION_ID) {
    return res.json({ error: "Missing Appwrite or database configuration" }, 500);
  }

  try {
    const payload = parsePayload(req);
    const { subscriptionId, newPriceId } = payload;

    if (!subscriptionId || !newPriceId) {
      return res.json({ error: "Missing subscriptionId or newPriceId" }, 400);
    }

    const userId =
      process.env.APPWRITE_FUNCTION_USER_ID || req.headers?.["x-appwrite-user-id"];
    if (!userId) {
      return res.json({ error: "User not authenticated." }, 401);
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

    const client = new sdk.Client();
    client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
    const databases = new sdk.Databases(client);

    const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
      sdk.Query.equal("user_id", userId),
      sdk.Query.limit(1),
    ]);

    if (accountDocs.total === 0 || !accountDocs.documents[0]?.stripe_customer_id) {
      return res.json({ error: "Subscription not found for your account." }, 404);
    }

    const userStripeCustomerId = accountDocs.documents[0].stripe_customer_id;
    if (subscriptionCustomerId !== userStripeCustomerId) {
      error(
        "Subscription " + subscriptionId + " does not belong to authenticated user's customer"
      );
      return res.json({ error: "This subscription does not belong to your account." }, 403);
    }

    const item = subscription.items.data[0];
    if (!item) {
      return res.json({ error: "Subscription has no items" }, 400);
    }

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
    return res.json({ error: err.message }, err.statusCode || 500);
  }
};
