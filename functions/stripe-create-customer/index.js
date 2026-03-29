const sdk = require("node-appwrite");
const Stripe = require("stripe");

module.exports = async ({ req, res, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);
  const env = req?.variables || process.env;

  if (
    !env.APPWRITE_ENDPOINT ||
    !env.APPWRITE_PROJECT_ID ||
    !env.APPWRITE_API_KEY ||
    !env.STRIPE_SECRET_KEY ||
    !env.APPWRITE_DATABASE_ID ||
    !env.ACCOUNTS_COLLECTION_ID // pragma: allowlist secret
  ) {
    error("Missing environment variables. Please check your function settings.");
    return res.json({ error: "Internal Server Error: Missing configuration." }, 500);
  }

  client
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  try {
    const eventData = req?.env?.APPWRITE_FUNCTION_EVENT_DATA || req?.variables?.APPWRITE_FUNCTION_EVENT_DATA;
    if (!eventData) return res.json({ error: "Missing APPWRITE_FUNCTION_EVENT_DATA." }, 400);
    const user = JSON.parse(eventData);
    if (!user?.$id || !user.email) {
      return res.json({ success: false, message: "User id/email required." }, 400);
    }

    const existing = await databases.listDocuments(env.APPWRITE_DATABASE_ID, env.ACCOUNTS_COLLECTION_ID, [ // pragma: allowlist secret
      sdk.Query.equal("user_id", user.$id),
      sdk.Query.limit(1),
    ]);
    if (existing.documents.length > 0 && existing.documents[0].stripe_customer_id) {
      return res.json({
        success: true,
        skipped: true,
        message: `Account already exists for user ${user.$id}.`,
        stripeCustomerId: existing.documents[0].stripe_customer_id,
      });
    }

    // Reuse existing Stripe customer if one exists (e.g. from previous failed doc update)
    let customer = null;
    try {
      const searchResult = await stripe.customers.search({
        query: `metadata['appwrite_user_id']:'${user.$id}'`,
        limit: 1,
      });
      customer = searchResult.data?.[0];
    } catch {
      // Search not available in some regions (e.g. India); fall back to create
    }
    if (!customer) {
      customer = await stripe.customers.create(
        {
          email: user.email,
          name: user.name,
          metadata: { appwrite_user_id: user.$id },
        },
        { idempotencyKey: `create_customer_${user.$id}` }
      );
    }

    // Subscribe new customer to default signup plan if configured
    let defaultPriceId = env.STRIPE_FREE_TIER_PRICE_ID;
    if (!defaultPriceId) {
      try {
        const settingsDocs = await databases.listDocuments(
          env.APPWRITE_DATABASE_ID,
          env.SETTINGS_COLLECTION_ID || "platform_settings",
          [sdk.Query.equal("key", "stripe_signup_plan"), sdk.Query.limit(1)]
        );
        if (settingsDocs.documents?.length > 0 && settingsDocs.documents[0].value) {
          const stripeSettings = JSON.parse(settingsDocs.documents[0].value);
          defaultPriceId = stripeSettings.defaultSignupPlanPriceId || null;
        }
      } catch (e) {
        error("Could not read Stripe settings: " + e.message);
      }
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
        error("Failed to create Free Tier subscription: " + subErr.message);
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
        env.APPWRITE_DATABASE_ID,
        env.ACCOUNTS_COLLECTION_ID, // pragma: allowlist secret
        existing.documents[0].$id,
        accountData
      );
    } else {
      await databases.createDocument(
        env.APPWRITE_DATABASE_ID,
        env.ACCOUNTS_COLLECTION_ID, // pragma: allowlist secret
        sdk.ID.unique(),
        accountData,
        permissions
      );
    }

    return res.json({
      success: true,
      message: `Stripe customer ensured for user ${user.$id}.`,
      stripeCustomerId: customer.id,
    });
  } catch (err) {
    error("Failed to create stripe customer:", err);
    return res.json({ error: err.message }, 500);
  }
};
