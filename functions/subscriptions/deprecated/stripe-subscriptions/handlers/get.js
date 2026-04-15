const { mergedEnv } = require("../lib/mergedEnv");
const { hasAppwriteBootstrap } = require("../lib/appwriteEnv");
const { createServerClientAndDatabases } = require("../../../../database/fetchAppwriteCredentialsFromGateway");
const { callStripeGateway } = require("../lib/callStripeGateway");

module.exports = async ({ req, res, log, error }) => {
  const env = mergedEnv(req);
  const APPWRITE_DATABASE_ID = env.APPWRITE_DATABASE_ID;
  const APPWRITE_ACCOUNTS_COLLECTION_ID = env.APPWRITE_ACCOUNTS_COLLECTION_ID;

  const DATABASE_ID = APPWRITE_DATABASE_ID || env.DATABASE_ID;
  const ACCOUNTS_COLLECTION_ID = APPWRITE_ACCOUNTS_COLLECTION_ID || env.ACCOUNTS_COLLECTION_ID;

  const missingVars = [];
  if (!hasAppwriteBootstrap(env)) missingVars.push("APPWRITE_ENDPOINT/PROJECT_ID/API_KEY");
  if (!DATABASE_ID) missingVars.push("APPWRITE_DATABASE_ID");
  if (!ACCOUNTS_COLLECTION_ID) missingVars.push("APPWRITE_ACCOUNTS_COLLECTION_ID");

  if (missingVars.length > 0) {
    const errorMsg = `Missing environment variables: ${missingVars.join(
      ", "
    )}. See STRIPE_SETUP.md for configuration instructions.`;
    error(errorMsg);
    return res.json({ error: errorMsg }, 500);
  }

  let databases;
  try {
    ({ databases } = await createServerClientAndDatabases(log, error));
  } catch (e) {
    error(e.message);
    return res.json({ error: e.message }, 500);
  }

  try {
    let userId =
      env.APPWRITE_FUNCTION_USER_ID ||
      req.headers?.["x-appwrite-user-id"] ||
      req.headers?.["X-Appwrite-User-Id"];

    log("User ID from env: " + env.APPWRITE_FUNCTION_USER_ID);
    log("User ID from headers: " + (req.headers?.["x-appwrite-user-id"] || ""));
    log("Final userId: " + userId);

    if (!userId) {
      error("No user ID found. User must be authenticated.");
      return res.json({ error: "User not authenticated." }, 401);
    }

    const user = { $id: userId };
    log("Fetching subscription for user: " + user.$id);

    const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
      sdk.Query.equal("user_id", user.$id),
    ]);

    if (accountDocs.total === 0) {
      log("No account found for user " + user.$id);
      return res.json(null);
    }

    const stripeCustomerId = accountDocs.documents[0].stripe_customer_id;

    if (!stripeCustomerId) {
      log("Account exists but no stripe_customer_id for user " + user.$id);
      return res.json(null);
    }

    log("Found Stripe customer: " + stripeCustomerId);

    let listResult = await callStripeGateway(
      "list-subscriptions",
      {
        customer: stripeCustomerId,
        status: "all",
        limit: 10,
      },
      log,
      error
    );
    let subscriptions = listResult.subscriptions || [];

    let defaultPriceId = null;
    try {
      const settingsDocs = await databases.listDocuments(
        DATABASE_ID,
        env.SETTINGS_COLLECTION_ID || "platform_settings",
        [sdk.Query.equal("key", "stripe_signup_plan"), sdk.Query.limit(1)]
      );
      if (settingsDocs.documents?.length > 0 && settingsDocs.documents[0].value) {
        const stripeSettings = JSON.parse(settingsDocs.documents[0].value);
        defaultPriceId = (stripeSettings.defaultSignupPlanPriceId || "").trim() || null;
      }
    } catch (e) {
      log("Could not read Stripe settings: " + e.message);
    }

    if (subscriptions.length === 0 && defaultPriceId) {
      try {
        const created = await callStripeGateway(
          "create-subscription",
          {
            customer: stripeCustomerId,
            items: [{ price: defaultPriceId }],
            metadata: { appwrite_user_id: userId },
          },
          log,
          error
        );
        subscriptions = created.subscription ? [created.subscription] : [];
        log("Created default plan subscription for customer " + stripeCustomerId);
      } catch (e) {
        log("Could not create default plan subscription: " + e.message);
        return res.json(null);
      }
    } else if (subscriptions.length === 0) {
      log("No subscriptions found for customer " + stripeCustomerId + " and no default plan configured");
      return res.json(null);
    }

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

    for (const s of subscriptions) {
      const score = statusPriority[s.status] || 0;
      if (score > bestScore) {
        bestScore = score;
        sub = s;
      }
    }

    if (!sub) sub = subscriptions[0];
    const priceItem = sub.items.data[0].price;

    log("Subscription found: " + sub.id + ", status: " + sub.status);

    const productId = typeof priceItem.product === "string" ? priceItem.product : priceItem.product?.id;
    const productResult = await callStripeGateway("get-product", { product_id: productId }, log, error);
    const product = productResult.product;

    log("Product retrieved: " + product.name);

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
