// Stripe Core - webhook-only handler
// Stripe is source of truth; no Appwrite writes for subscription/plan data
const Stripe = require("stripe");
const sdk = require("node-appwrite");
const { getConnectorCredentials } = require("../_shared/vault-client.js");

/**
 * Accepts only Stripe webhook requests. Verifies signature, logs events, returns 200.
 * All subscription/plan data lives in Stripe; no sync to Appwrite.
 */
module.exports = async ({ req, res, log, error }) => {
  if (req.headers && req.headers["stripe-signature"]) {
    return handleWebhook({ req, res, log, error });
  }
  return res.json(
    { success: false, message: "stripe-core only accepts Stripe webhook requests." },
    400
  );
};

async function handleWebhook({ req, res, log, error }) {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  const VAULT_DB_ID = process.env.VAULT_DB_ID || "69d2ecf3000f449c752f";
  const APPWRITE_ENDPOINT =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const APPWRITE_PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const APPWRITE_API_KEY =
    process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;

  if (!ENCRYPTION_KEY) {
    error("ENCRYPTION_KEY not configured");
    return res.json({ success: false, message: "ENCRYPTION_KEY not configured" }, 500);
  }

  let stripeCredentials;
  try {
    const adminClient = new sdk.Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);
    const databases = new sdk.Databases(adminClient);

    stripeCredentials = await getConnectorCredentials("stripe", ENCRYPTION_KEY, databases, VAULT_DB_ID);
    if (!stripeCredentials || !stripeCredentials.STRIPE_SECRET_KEY || !stripeCredentials.STRIPE_WEBHOOK_SECRET) {
      error("Stripe credentials not found in vault");
      return res.json({ success: false, message: "Stripe credentials not configured" }, 500);
    }
  } catch (err) {
    error("Failed to retrieve Stripe credentials: " + err.message);
    return res.json({ success: false, message: "Failed to retrieve credentials" }, 500);
  }

  const STRIPE_SECRET_KEY = stripeCredentials.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = stripeCredentials.STRIPE_WEBHOOK_SECRET;

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    error("Stripe secret or webhook secret missing in vault");
    return res.json({ success: false, message: "Stripe secret or webhook secret missing" }, 500);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);

  let event;
  try {
    const sig = req.headers["stripe-signature"];
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(req.body || "", "utf8");
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    error("Webhook signature verification failed: " + err.message);
    return res.json({ success: false, message: "Webhook signature verification failed" }, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        log("Checkout session completed:", event.data.object.id);
        break;

      case "invoice.paid":
        log("Invoice paid:", event.data.object.id);
        break;

      case "customer.subscription.updated":
        log("Subscription updated:", event.data.object.id);
        break;

      case "customer.subscription.deleted":
        log("Subscription deleted:", event.data.object.id);
        break;

      default:
        log("Unhandled event type:", event.type);
    }
    return res.json({ success: true });
  } catch (err) {
    error("Webhook handler error: " + err.message);
    return res.json({ success: false, message: "Webhook handler error" }, 500);
  }
}
