const sdk = require("node-appwrite");
const Stripe = require("stripe");

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  const env = req?.variables || process.env;
  const APPWRITE_ENDPOINT = env.APPWRITE_ENDPOINT;
  const APPWRITE_PROJECT_ID = env.APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = env.APPWRITE_API_KEY;
  const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
  const DATABASE_ID = env.APPWRITE_DATABASE_ID || env.DATABASE_ID;
  const ACCOUNTS_COLLECTION_ID = env.ACCOUNTS_COLLECTION_ID; // pragma: allowlist secret

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !STRIPE_SECRET_KEY || !DATABASE_ID || !ACCOUNTS_COLLECTION_ID) { // pragma: allowlist secret
    error("Missing environment variables. Please check your function settings.");
    return res.json({ error: "Internal Server Error: Missing configuration." }, 500);
  }

  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    let payload = {};
    try {
      if (req.payload && typeof req.payload === "string") payload = JSON.parse(req.payload);
      else if (req.payload && typeof req.payload === "object") payload = req.payload;
    } catch {
      payload = {};
    }

    if (payload.action !== "create" || !payload.user) {
      return res.json({ error: "Expected action: create with user payload." }, 400);
    }

    const user = payload.user;
    if (!user?.$id || !user.email) {
      return res.json({ success: false, message: "User id/email required." }, 400);
    }

    const existing = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [ // pragma: allowlist secret
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
        ACCOUNTS_COLLECTION_ID, // pragma: allowlist secret
        existing.documents[0].$id,
        accountData
      );
    } else {
      await databases.createDocument(
        DATABASE_ID,
        ACCOUNTS_COLLECTION_ID, // pragma: allowlist secret
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
