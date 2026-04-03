const sdk = require("node-appwrite");
const Stripe = require("stripe");

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (req.payload && typeof req.payload === "string") {
    try {
      return JSON.parse(req.payload);
    } catch {
      return {};
    }
  }
  if (req.payload && typeof req.payload === "object") return req.payload;
  return {};
}

/**
 * @param {object} user — { $id, email, name }
 * @param {{ skipDefaultSubscription?: boolean }} options — HTTP ensure skips auto free-tier signup sub
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
      { idempotencyKey: `create_customer_${user.$id}` }
    );
  }

  if (!skipDefaultSubscription) {
    let defaultPriceId = env.STRIPE_FREE_TIER_PRICE_ID;
    if (!defaultPriceId) {
      try {
        const settingsDocs = await databases.listDocuments(
          DATABASE_ID,
          env.SETTINGS_COLLECTION_ID || "platform_settings",
          [sdk.Query.equal("key", "stripe_signup_plan"), sdk.Query.limit(1)]
        );
        if (settingsDocs.documents?.length > 0 && settingsDocs.documents[0].value) {
          const stripeSettings = JSON.parse(settingsDocs.documents[0].value);
          defaultPriceId = stripeSettings.defaultSignupPlanPriceId || null;
        }
      } catch {
        // optional settings
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
      accountData
    );
  } else {
    await databases.createDocument(
      DATABASE_ID,
      ACCOUNTS_COLLECTION_ID,
      sdk.ID.unique(),
      accountData,
      permissions
    );
  }

  return {
    success: true,
    message: `Stripe customer ensured for user ${user.$id}.`,
    stripeCustomerId: customer.id,
  };
}

module.exports = async ({ req, res, error, log }) => {
  const env = req?.variables || process.env;
  const databaseId = env.APPWRITE_DATABASE_ID || env.DATABASE_ID;

  if (
    !env.APPWRITE_ENDPOINT ||
    !env.APPWRITE_PROJECT_ID ||
    !env.APPWRITE_API_KEY ||
    !env.STRIPE_SECRET_KEY ||
    !databaseId ||
    !env.ACCOUNTS_COLLECTION_ID
  ) {
    error("Missing environment variables. Please check your function settings.");
    return res.json({ error: "Internal Server Error: Missing configuration." }, 500);
  }

  const client = new sdk.Client();
  client.setEndpoint(env.APPWRITE_ENDPOINT).setProject(env.APPWRITE_PROJECT_ID).setKey(env.APPWRITE_API_KEY);
  const databases = new sdk.Databases(client);
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  const payload = parsePayload(req);
  const action = (payload.action || req.query?.action || "").toString().toLowerCase();

  if (action === "ensure") {
    const userId =
      process.env.APPWRITE_FUNCTION_USER_ID ||
      req.headers?.["x-appwrite-user-id"] ||
      req.headers?.["X-Appwrite-User-Id"];
    if (!userId) {
      return res.json({ error: "User not authenticated." }, 401);
    }
    try {
      const users = new sdk.Users(client);
      const appwriteUser = await users.get(userId);
      const email = appwriteUser.email;
      if (!email) {
        return res.json({ success: false, message: "User email required for billing." }, 400);
      }
      const user = {
        $id: appwriteUser.$id,
        email,
        name: appwriteUser.name || undefined,
      };
      const result = await ensureStripeCustomerForUser(user, databases, stripe, env, {
        skipDefaultSubscription: true,
      });
      return res.json(result);
    } catch (err) {
      error("ensure failed: " + err.message);
      return res.json({ error: err.message || "Could not set up billing" }, 500);
    }
  }

  const eventData =
    req?.env?.APPWRITE_FUNCTION_EVENT_DATA || req?.variables?.APPWRITE_FUNCTION_EVENT_DATA;
  if (!eventData) {
    return res.json(
      {
        error:
          'Missing APPWRITE_FUNCTION_EVENT_DATA. For browser clients use { "action": "ensure" }.',
      },
      400
    );
  }

  try {
    const user = JSON.parse(eventData);
    if (!user?.$id || !user.email) {
      return res.json({ success: false, message: "User id/email required." }, 400);
    }
    const result = await ensureStripeCustomerForUser(user, databases, stripe, env, {
      skipDefaultSubscription: false,
    });
    return res.json(result);
  } catch (err) {
    error("Failed to create stripe customer:", err);
    return res.json({ error: err.message }, 500);
  }
};
