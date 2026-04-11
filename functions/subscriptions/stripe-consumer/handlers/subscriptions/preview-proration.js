const sdk = require("node-appwrite");
const { mergedEnv } = require("../../lib/mergedEnv");
const { getAppwriteBootstrapFromEnv, hasAppwriteBootstrap } = require("../../lib/appwriteEnv");
const { callStripeGateway } = require("../../lib/callStripeGateway");

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
  const env = mergedEnv(req);
  const { endpoint, projectId, apiKey } = getAppwriteBootstrapFromEnv(env);
  const DATABASE_ID = env.APPWRITE_DATABASE_ID || env.DATABASE_ID;
  const ACCOUNTS_COLLECTION_ID =
    env.APPWRITE_ACCOUNTS_COLLECTION_ID || env.ACCOUNTS_COLLECTION_ID;

  if (!hasAppwriteBootstrap(env) || !DATABASE_ID || !ACCOUNTS_COLLECTION_ID) {
    return res.json({ error: "Missing Appwrite or database configuration" }, 500);
  }

  try {
    const payload = parsePayload(req);
    const { subscriptionId, newPriceId } = payload;

    if (!subscriptionId || !newPriceId) {
      return res.json({ error: "Missing subscriptionId or newPriceId" }, 400);
    }

    const userId =
      env.APPWRITE_FUNCTION_USER_ID ||
      req.headers?.["x-appwrite-user-id"] ||
      req.headers?.["X-Appwrite-User-Id"];
    if (!userId) {
      return res.json({ error: "User not authenticated." }, 401);
    }

    const subResult = await callStripeGateway(
      "get-subscription",
      { subscriptionId },
      log,
      error
    );
    const subscription = subResult.subscription;
    const subscriptionCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

    const client = new sdk.Client();
    client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
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

    const previewResult = await callStripeGateway(
      "invoice-create-preview",
      {
        customer: subscriptionCustomerId,
        subscription: subscriptionId,
        subscription_details: {
          items: [
            {
              id: item.id,
              price: newPriceId,
            },
          ],
          proration_date: prorationDate,
        },
      },
      log,
      error
    );
    const invoice = previewResult.invoice;

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
