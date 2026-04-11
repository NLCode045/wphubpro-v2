const sdk = require("node-appwrite");
const { mergedEnv } = require("../lib/mergedEnv");
const { getAppwriteBootstrapFromEnv } = require("../lib/appwriteEnv");
const { callStripeGateway } = require("../lib/callStripeGateway");

module.exports = async ({ req, res, log, error }) => {
  const env = mergedEnv(req);
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  const { endpoint, projectId, apiKey } = getAppwriteBootstrapFromEnv(env);
  const DATABASE_ID = env.APPWRITE_DATABASE_ID || env.DATABASE_ID;
  const ACCOUNTS_COLLECTION_ID = env.APPWRITE_ACCOUNTS_COLLECTION_ID || env.ACCOUNTS_COLLECTION_ID;

  const missingVars = [];
  if (!endpoint) missingVars.push("APPWRITE_ENDPOINT");
  if (!projectId) missingVars.push("APPWRITE_PROJECT_ID");
  if (!apiKey) missingVars.push("APPWRITE_API_KEY");
  if (!DATABASE_ID) missingVars.push("DATABASE_ID");
  if (!ACCOUNTS_COLLECTION_ID) missingVars.push("ACCOUNTS_COLLECTION_ID");

  if (missingVars.length > 0) {
    const errorMsg = `Missing environment variables: ${missingVars.join(", ")}`;
    error(errorMsg);
    return res.json({ error: errorMsg }, 500);
  }

  client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

  try {
    let userId =
      env.APPWRITE_FUNCTION_USER_ID ||
      req.headers?.["x-appwrite-user-id"] ||
      req.headers?.["X-Appwrite-User-Id"];

    log("User ID: " + userId);

    if (!userId) {
      error("No user ID found. User must be authenticated.");
      return res.json(
        {
          error: "User not authenticated. Please log in and try again.",
        },
        401
      );
    }

    const user = { $id: userId };
    log("Cancelling subscription for user: " + user.$id);

    const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
      sdk.Query.equal("user_id", user.$id),
    ]);

    if (accountDocs.total === 0) {
      error("No account found for user " + user.$id);
      return res.json({ error: "No account found." }, 404);
    }

    const stripeCustomerId = accountDocs.documents[0].stripe_customer_id;

    if (!stripeCustomerId) {
      error("Account exists but no stripe_customer_id for user " + user.$id);
      return res.json({ error: "No Stripe customer ID found." }, 404);
    }

    log("Found Stripe customer: " + stripeCustomerId);

    const listResult = await callStripeGateway(
      "list-subscriptions",
      {
        customer: stripeCustomerId,
        status: "active",
        limit: 1,
      },
      log,
      error
    );
    const subs = listResult.subscriptions || [];

    if (subs.length === 0) {
      error("No active subscription found for customer " + stripeCustomerId);
      return res.json({ error: "No active subscription found." }, 404);
    }

    const subscription = subs[0];
    log("Found subscription: " + subscription.id);

    const updated = await callStripeGateway(
      "update-subscription",
      {
        subscription_id: subscription.id,
        cancel_at_period_end: true,
      },
      log,
      error
    );
    const updatedSubscription = updated.subscription;

    log("Subscription cancelled at period end: " + updatedSubscription.id);

    return res.json({
      success: true,
      message: "Subscription will be cancelled at the end of the billing period.",
      cancelAt: updatedSubscription.cancel_at,
    });
  } catch (err) {
    error("Failed to cancel subscription:", err);
    return res.json(
      {
        error: err.message || "An unexpected error occurred",
        details: err.stack,
      },
      500
    );
  }
};
