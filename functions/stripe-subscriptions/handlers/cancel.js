const sdk = require("node-appwrite");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  const {
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY,
    STRIPE_SECRET_KEY,
    DATABASE_ID,
    ACCOUNTS_COLLECTION_ID,
  } = process.env;

  const missingVars = [];
  if (!APPWRITE_ENDPOINT) missingVars.push("APPWRITE_ENDPOINT");
  if (!APPWRITE_PROJECT_ID) missingVars.push("APPWRITE_PROJECT_ID");
  if (!APPWRITE_API_KEY) missingVars.push("APPWRITE_API_KEY");
  if (!STRIPE_SECRET_KEY) missingVars.push("STRIPE_SECRET_KEY");
  if (!DATABASE_ID) missingVars.push("DATABASE_ID");
  if (!ACCOUNTS_COLLECTION_ID) missingVars.push("ACCOUNTS_COLLECTION_ID");

  if (missingVars.length > 0) {
    const errorMsg = `Missing environment variables: ${missingVars.join(", ")}`;
    error(errorMsg);
    return res.json({ error: errorMsg }, 500);
  }

  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);

  try {
    // Get user ID from environment
    let userId = process.env.APPWRITE_FUNCTION_USER_ID || req.headers["x-appwrite-user-id"];

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

    // Get the user's account to find their Stripe Customer ID
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

    // Fetch active subscription for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      error("No active subscription found for customer " + stripeCustomerId);
      return res.json({ error: "No active subscription found." }, 404);
    }

    const subscription = subscriptions.data[0];
    log("Found subscription: " + subscription.id);

    // Cancel subscription at period end
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

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
