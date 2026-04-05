const Stripe = require("stripe");
const sdk = require("node-appwrite");

/**
 * Stripe Portal Link Function
 * Creates a Stripe billing portal session for the authenticated user
 *
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 * - APPWRITE_ENDPOINT: Appwrite API endpoint
 * - APPWRITE_PROJECT_ID: Appwrite project ID
 * - APPWRITE_API_KEY: Appwrite API key
 *
 * Request Body:
 * - returnUrl: URL to redirect to after portal session (optional)
 */
module.exports = async ({ req, res, log, error }) => {
  try {
    // Get environment variables
    const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    const APPWRITE_ENDPOINT =
      req.variables?.APPWRITE_ENDPOINT ||
      process.env.APPWRITE_ENDPOINT ||
      process.env.APPWRITE_FUNCTION_ENDPOINT ||
      process.env.APPWRITE_FUNCTION_API_ENDPOINT;
    const APPWRITE_PROJECT_ID =
      req.variables?.APPWRITE_PROJECT_ID ||
      process.env.APPWRITE_PROJECT_ID ||
      process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const APPWRITE_API_KEY =
      req.variables?.APPWRITE_API_KEY ||
      process.env.APPWRITE_API_KEY ||
      process.env.APPWRITE_FUNCTION_API_KEY ||
      process.env.APPWRITE_KEY;

    if (!STRIPE_SECRET_KEY) {
      error("STRIPE_SECRET_KEY is not configured");
      return res.json(
        {
          success: false,
          message: "Stripe configuration missing",
        },
        500
      );
    }

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
      error("Appwrite configuration missing");
      return res.json(
        {
          success: false,
          message: "Appwrite configuration missing",
        },
        500
      );
    }

    // Get the authenticated user ID
    const userId = req.variables?.APPWRITE_FUNCTION_USER_ID || req.variables?.APPWRITE_USER_ID;

    if (!userId) {
      error("User not authenticated");
      return res.json(
        {
          success: false,
          message: "User not authenticated",
        },
        401
      );
    }

    // Parse request body
    let payload = {};
    try {
      if (req.payload && typeof req.payload === "string") {
        payload = JSON.parse(req.payload);
      } else if (req.payload && typeof req.payload === "object") {
        payload = req.payload;
      }
    } catch {
      payload = {};
    }

    const returnUrl = payload.returnUrl || "https://wphubpro.netlify.app/#/subscription";

    const DATABASE_ID =
      process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "platform_db";
    const ACCOUNTS_COLLECTION_ID =
      process.env.ACCOUNTS_COLLECTION_ID || process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || "accounts";

    log(`Creating billing portal session for user: ${userId}`);

    // Initialize Appwrite client
    const client = new sdk.Client();
    client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);

    const databases = new sdk.Databases(client);

    // Resolve Stripe customer ID from accounts first (same as cancel/get), then fallback to subscriptions
    let stripeCustomerId = null;

    const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
      sdk.Query.equal("user_id", userId),
      sdk.Query.limit(1),
    ]);

    if (accountDocs.total > 0 && accountDocs.documents[0].stripe_customer_id) {
      stripeCustomerId = accountDocs.documents[0].stripe_customer_id;
      log("Found Stripe customer from accounts: " + stripeCustomerId);
    }

    if (!stripeCustomerId) {
      const subscriptions = await databases.listDocuments(DATABASE_ID, "subscriptions", [
        sdk.Query.equal("user_id", userId),
        sdk.Query.limit(1),
      ]);
      if (subscriptions.documents?.length > 0 && subscriptions.documents[0].stripe_customer_id) {
        stripeCustomerId = subscriptions.documents[0].stripe_customer_id;
        log("Found Stripe customer from subscriptions (fallback): " + stripeCustomerId);
      }
    }

    if (!stripeCustomerId) {
      error("No Stripe customer ID found for user");
      return res.json(
        {
          success: false,
          message: "No Stripe customer found. Please create a subscription first or contact support.",
        },
        404
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    log(`Billing portal session created: ${session.id}`);

    return res.json({
      success: true,
      url: session.url,
      session_id: session.id,
    });
  } catch (err) {
    error(`Failed to create billing portal session: ${err.message}`);
    return res.json(
      {
        success: false,
        message: err.message || "Failed to create billing portal session",
      },
      500
    );
  }
};
