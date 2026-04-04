const sdk = require("node-appwrite");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  const {
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY,
    STRIPE_SECRET_KEY,
    APPWRITE_DATABASE_ID,
    APPWRITE_ACCOUNTS_COLLECTION_ID,
  } = process.env;

  const DATABASE_ID = APPWRITE_DATABASE_ID || process.env.DATABASE_ID;
  const ACCOUNTS_COLLECTION_ID = APPWRITE_ACCOUNTS_COLLECTION_ID || process.env.ACCOUNTS_COLLECTION_ID;

  const missingVars = [];
  if (!APPWRITE_ENDPOINT) missingVars.push("APPWRITE_ENDPOINT");
  if (!APPWRITE_PROJECT_ID) missingVars.push("APPWRITE_PROJECT_ID");
  if (!APPWRITE_API_KEY) missingVars.push("APPWRITE_API_KEY");
  if (!STRIPE_SECRET_KEY) missingVars.push("STRIPE_SECRET_KEY");
  if (!DATABASE_ID) missingVars.push("APPWRITE_DATABASE_ID");
  if (!ACCOUNTS_COLLECTION_ID) missingVars.push("APPWRITE_ACCOUNTS_COLLECTION_ID");

  if (missingVars.length > 0) {
    const errorMsg = `Missing environment variables: ${missingVars.join(
      ", "
    )}. See STRIPE_SETUP.md for configuration instructions.`;
    error(errorMsg);
    return res.json({ error: errorMsg }, 500);
  }

  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);

  try {
    // Get user ID from environment (set by Appwrite when called from authenticated context)
    let userId = process.env.APPWRITE_FUNCTION_USER_ID || req.headers["x-appwrite-user-id"];

    log("User ID from env: " + process.env.APPWRITE_FUNCTION_USER_ID);
    log("User ID from headers: " + req.headers["x-appwrite-user-id"]);
    log("Final userId: " + userId);

    if (!userId) {
      error("No user ID found. User must be authenticated.");
      return res.json({ error: "User not authenticated." }, 401);
    }

    const user = { $id: userId };
    log("Fetching subscription for user: " + user.$id);

    // 1. Get the user's account to find their Stripe Customer ID
    const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
      sdk.Query.equal("user_id", user.$id),
    ]);

    if (accountDocs.total === 0) {
      log("No account found for user " + user.$id);
      // If the user has no account, they have no subscription. Return null.
      return res.json(null);
    }

    const stripeCustomerId = accountDocs.documents[0].stripe_customer_id;

    if (!stripeCustomerId) {
      log("Account exists but no stripe_customer_id for user " + user.$id);
      return res.json(null);
    }

    log("Found Stripe customer: " + stripeCustomerId);

    // 2. Fetch subscriptions for the customer from Stripe
    let subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all", // Fetch active, trialing, past_due, etc.
      limit: 10, // Fetch multiple to find the active one
    });

    // If no subscription, create default signup plan subscription when configured in platform_settings
    let defaultPriceId = null;
    try {
      const settingsDocs = await databases.listDocuments(
        DATABASE_ID,
        process.env.SETTINGS_COLLECTION_ID || "platform_settings",
        [sdk.Query.equal("key", "stripe_signup_plan"), sdk.Query.limit(1)]
      );
      if (settingsDocs.documents?.length > 0 && settingsDocs.documents[0].value) {
        const stripeSettings = JSON.parse(settingsDocs.documents[0].value);
        defaultPriceId = (stripeSettings.defaultSignupPlanPriceId || "").trim() || null;
      }
    } catch (e) {
      log("Could not read Stripe settings: " + e.message);
    }
    if (subscriptions.data.length === 0 && defaultPriceId) {
      try {
        const newSub = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: defaultPriceId }],
          metadata: { appwrite_user_id: userId },
        });
        subscriptions = { data: [newSub] };
        log("Created default plan subscription for customer " + stripeCustomerId);
      } catch (e) {
        log("Could not create default plan subscription: " + e.message);
        return res.json(null);
      }
    } else if (subscriptions.data.length === 0) {
      log("No subscriptions found for customer " + stripeCustomerId + " and no default plan configured");
      return res.json(null);
    }

    // Find the most relevant subscription (prioritize active/trialing)
    const statusPriority = {
      active: 100,
      trialing: 90,
      past_due: 80,
      unpaid: 70,
      incomplete: 60,
      incomplete_expired: 50,
      paused: 40,
      canceled: 10,
      ended: 0,
    };

    let sub = null;
    let bestScore = -1;

    for (const s of subscriptions.data) {
      const score = statusPriority[s.status] || 0;
      if (score > bestScore) {
        bestScore = score;
        sub = s;
      }
    }

    if (!sub) sub = subscriptions.data[0];
    const priceItem = sub.items.data[0].price;

    log("Subscription found: " + sub.id + ", status: " + sub.status);

    // Fetch the product details to get the name and metadata
    const product = await stripe.products.retrieve(priceItem.product);

    log("Product retrieved: " + product.name);

    // 3. Limits: all from plan (product metadata) only
    const sitesLimit = parseInt(
      product.metadata?.sites_limit || product.metadata?.site_limit || "9999",
      10
    );
    const libraryLimit = parseInt(product.metadata?.library_limit || "9999", 10);
    const storageLimit = parseInt(product.metadata?.storage_limit || "9999", 10);

    const subscriptionData = {
      planId: product.name,
      status: sub.status,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      stripeSubscriptionId: sub.id,
      priceId: priceItem.id,
      priceAmount: priceItem.unit_amount,
      currency: priceItem.currency,
      interval: priceItem.recurring?.interval,
      intervalCount: priceItem.recurring?.interval_count || 1,
      sitesLimit,
      libraryLimit,
      storageLimit,
    };

    return res.json(subscriptionData);
  } catch (err) {
    error("Failed to get Stripe subscription:", err);
    return res.json({ error: err.message }, 500);
  }
};
