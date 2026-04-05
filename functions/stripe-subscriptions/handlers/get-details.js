const sdk = require("node-appwrite");
const { mergedEnv, createStripeFromReq } = require("../lib/stripeClient");
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

/**
 * Get detailed subscription data from Stripe
 * Verifies the subscription belongs to the authenticated user before returning.
 */
module.exports = async ({ req, res, log, error, payload: payloadFromIndex }) => {
  const env = mergedEnv(req);
  const stripe = createStripeFromReq(req);
  const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
  const APPWRITE_ENDPOINT =
    env.APPWRITE_ENDPOINT ||
    env.APPWRITE_FUNCTION_ENDPOINT ||
    env.APPWRITE_FUNCTION_API_ENDPOINT;
  const APPWRITE_PROJECT_ID = env.APPWRITE_PROJECT_ID || env.APPWRITE_FUNCTION_PROJECT_ID;
  const APPWRITE_API_KEY =
    env.APPWRITE_API_KEY || env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_KEY;
  const APPWRITE_DATABASE_ID = env.APPWRITE_DATABASE_ID;
  const APPWRITE_ACCOUNTS_COLLECTION_ID = env.APPWRITE_ACCOUNTS_COLLECTION_ID;

  if (!STRIPE_SECRET_KEY || !stripe) {
    error("Missing STRIPE_SECRET_KEY");
    return res.json({ error: "Missing required environment variables" }, 500);
  }

  try {
    const payload = parsePayload(req, payloadFromIndex);
    const { subscriptionId } = payload;

    if (!subscriptionId) {
      return res.json({ error: "subscriptionId is required" }, 400);
    }

    const userId =
      env.APPWRITE_FUNCTION_USER_ID ||
      req.headers?.["x-appwrite-user-id"] ||
      req.headers?.["X-Appwrite-User-Id"];
    if (!userId) {
      error("No user ID found. User must be authenticated.");
      return res.json({ error: "User not authenticated." }, 401);
    }

    log("Fetching subscription details for: " + subscriptionId + " (user: " + userId + ")");

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice", "customer", "default_payment_method", "schedule"],
    });

    const subscriptionCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

    const DATABASE_ID = APPWRITE_DATABASE_ID || process.env.DATABASE_ID;
    const ACCOUNTS_COLLECTION_ID =
      APPWRITE_ACCOUNTS_COLLECTION_ID || process.env.ACCOUNTS_COLLECTION_ID;

    if (
      APPWRITE_ENDPOINT &&
      APPWRITE_PROJECT_ID &&
      APPWRITE_API_KEY &&
      DATABASE_ID &&
      ACCOUNTS_COLLECTION_ID
    ) {
      const client = new sdk.Client();
      const databases = new sdk.Databases(client);
      client
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setKey(APPWRITE_API_KEY);

      const accountDocs = await databases.listDocuments(
        DATABASE_ID,
        ACCOUNTS_COLLECTION_ID,
        [sdk.Query.equal("user_id", userId), sdk.Query.limit(1)]
      );

      if (accountDocs.total === 0 || !accountDocs.documents[0]?.stripe_customer_id) {
        log("No account or stripe_customer_id for user " + userId);
        return res.json({ error: "Subscription not found for your account." }, 404);
      }

      const userStripeCustomerId = accountDocs.documents[0].stripe_customer_id;
      if (subscriptionCustomerId !== userStripeCustomerId) {
        error(
          "Subscription " +
            subscriptionId +
            " belongs to customer " +
            subscriptionCustomerId +
            " but user " +
            userId +
            " has customer " +
            userStripeCustomerId
        );
        return res.json(
          { error: "This subscription does not belong to your account." },
          403
        );
      }
    } else {
      log("Skipping ownership verification (missing env vars)");
    }

    const response = await buildSubscriptionDetailsPayload(stripe, subscription, log);
    log("Successfully fetched subscription details");
    return res.json(response, 200);
  } catch (e) {
    error("Error fetching subscription details: " + e.message);
    return res.json({ error: e.message }, e.statusCode || 500);
  }
};
