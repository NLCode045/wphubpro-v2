const sdk = require("node-appwrite");

/**
 * @param {object} user — { $id, email, name }
 * @param {{ skipDefaultSubscription?: boolean }} options
 */
async function ensureStripeCustomerForUser(user, databases, stripe, env, options = {}) {
  const DATABASE_ID = env.APPWRITE_DATABASE_ID || env.DATABASE_ID;
  const ACCOUNTS_COLLECTION_ID = env.ACCOUNTS_COLLECTION_ID;
  const skipDefaultSubscription = Boolean(options.skipDefaultSubscription);

  const existing = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
    sdk.Query.equal("user_id", user.$id),
    sdk.Query.limit(1),
  ]);

  if (existing.documents.length > 0 && existing.documents[0].stripe_customer_id) {
    return {
      success: true,
      skipped: true,
      message: `Account already exists for user ${user.$id}.`,
      stripeCustomerId: existing.documents[0].stripe_customer_id,
    };
  }

  let customer = null;
  try {
    const searchResult = await stripe.customers.search({
      query: `metadata['appwrite_user_id']:'${user.$id}'`,
      limit: 1,
    });
    customer = searchResult.data?.[0];
  } catch {
    // Search not available in some regions
  }
  if (!customer) {
    customer = await stripe.customers.create(
      {
        email: user.email,
        name: user.name,
        metadata: { appwrite_user_id: user.$id },
      },
      { idempotencyKey: `create_customer_${user.$id}` },
    );
  }

  if (!skipDefaultSubscription) {
    let defaultPriceId = null;
    try {
      const settingsDocs = await databases.listDocuments(
        DATABASE_ID,
        env.SETTINGS_COLLECTION_ID || "platform_settings",
        [sdk.Query.equal("key", "stripe_signup_plan"), sdk.Query.limit(1)],
      );
      if (settingsDocs.documents?.length > 0 && settingsDocs.documents[0].value) {
        const stripeSettings = JSON.parse(settingsDocs.documents[0].value);
        defaultPriceId = (stripeSettings.defaultSignupPlanPriceId || "").trim() || null;
      }
    } catch {
      // optional settings
    }
    if (defaultPriceId) {
      try {
        const existingSubs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 1,
        });
        if (existingSubs.data.length === 0) {
          await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: defaultPriceId }],
            metadata: { appwrite_user_id: user.$id },
          });
        }
      } catch (subErr) {
        throw new Error("Failed to create default subscription: " + subErr.message);
      }
    }
  }

  const accountData = { user_id: user.$id, stripe_customer_id: customer.id };
  const permissions = [
    sdk.Permission.read(sdk.Role.user(user.$id)),
    sdk.Permission.update(sdk.Role.user(user.$id)),
    sdk.Permission.read(sdk.Role.team("admin")),
    sdk.Permission.update(sdk.Role.team("admin")),
    sdk.Permission.delete(sdk.Role.team("admin")),
  ];

  if (existing.documents.length > 0) {
    await databases.updateDocument(
      DATABASE_ID,
      ACCOUNTS_COLLECTION_ID,
      existing.documents[0].$id,
      accountData,
    );
  } else {
    await databases.createDocument(
      DATABASE_ID,
      ACCOUNTS_COLLECTION_ID,
      sdk.ID.unique(),
      accountData,
      permissions,
    );
  }

  return {
    success: true,
    message: `Stripe customer ensured for user ${user.$id}.`,
    stripeCustomerId: customer.id,
  };
}

module.exports = { ensureStripeCustomerForUser };
