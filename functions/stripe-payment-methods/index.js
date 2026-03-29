/**
 * Stripe Payment Methods Function
 * Actions: list, create-setup-intent, attach, detach, set-default
 * Resolves Stripe customer from accounts collection (same as cancel/get).
 */
const sdk = require("node-appwrite");
const Stripe = require("stripe");

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (req.bodyRaw && typeof req.bodyRaw === "string") {
    try { return JSON.parse(req.bodyRaw); } catch { return {}; }
  }
  if (req.payload && typeof req.payload === "string") {
    try { return JSON.parse(req.payload); } catch { return {}; }
  }
  if (req.payload && typeof req.payload === "object") return req.payload;
  return req.query || {};
}

async function getStripeCustomerId(databases, userId, log, error) {
  const DATABASE_ID =
    process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "platform_db";
  const ACCOUNTS_COLLECTION_ID =
    process.env.ACCOUNTS_COLLECTION_ID || process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || "accounts";

  const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
    sdk.Query.equal("user_id", userId),
    sdk.Query.limit(1),
  ]);

  if (accountDocs.total === 0 || !accountDocs.documents[0].stripe_customer_id) {
    return null;
  }
  return accountDocs.documents[0].stripe_customer_id;
}

module.exports = async ({ req, res, log, error }) => {
  const env = req?.variables || process.env;
  const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const APPWRITE_ENDPOINT =
    env.APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
  const APPWRITE_PROJECT_ID =
    env.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const APPWRITE_API_KEY =
    env.APPWRITE_API_KEY || process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;

  const userId =
    process.env.APPWRITE_FUNCTION_USER_ID ||
    env.APPWRITE_FUNCTION_USER_ID ||
    env.APPWRITE_USER_ID ||
    req.headers?.["x-appwrite-user-id"] ||
    req.headers?.["X-Appwrite-User-Id"];

  if (!STRIPE_SECRET_KEY) {
    return res.json({ success: false, error: "Stripe configuration missing" }, 500);
  }
  if (!userId) {
    return res.json({ success: false, error: "User not authenticated" }, 401);
  }
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    return res.json({ success: false, error: "Appwrite configuration missing" }, 500);
  }

  const client = new sdk.Client();
  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
  const databases = new sdk.Databases(client);
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

  const payload = parsePayload(req);
  const action = (payload.action || req.query?.action || "list").toString().toLowerCase();

  try {
    const stripeCustomerId = await getStripeCustomerId(databases, userId, log, error);
    if (!stripeCustomerId) {
      return res.json({ success: false, error: "No Stripe customer found. Create a subscription first." }, 404);
    }

    if (action === "list") {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: "card",
      });
      const list = (paymentMethods.data || []).map((pm) => ({
        id: pm.id,
        type: pm.type,
        card: pm.card
          ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
            }
          : null,
      }));
      return res.json({ success: true, paymentMethods: list });
    }

    if (action === "create-setup-intent") {
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        usage: "off_session",
        automatic_payment_methods: { enabled: true },
      });
      return res.json({ success: true, clientSecret: setupIntent.client_secret });
    }

    if (action === "attach") {
      const { paymentMethodId, setAsDefault } = payload;
      if (!paymentMethodId) {
        return res.json({ success: false, error: "paymentMethodId required" }, 400);
      }
      await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
      if (setAsDefault) {
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
        const subs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: "all", limit: 1 });
        if (subs.data.length > 0) {
          await stripe.subscriptions.update(subs.data[0].id, { default_payment_method: paymentMethodId });
        }
      }
      return res.json({ success: true });
    }

    if (action === "detach") {
      const { paymentMethodId } = payload;
      if (!paymentMethodId) {
        return res.json({ success: false, error: "paymentMethodId required" }, 400);
      }
      await stripe.paymentMethods.detach(paymentMethodId);
      return res.json({ success: true });
    }

    if (action === "set-default") {
      const { paymentMethodId } = payload;
      if (!paymentMethodId) {
        return res.json({ success: false, error: "paymentMethodId required" }, 400);
      }
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      const subs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: "all", limit: 10 });
      for (const sub of subs.data) {
        if (sub.status === "active" || sub.status === "trialing") {
          await stripe.subscriptions.update(sub.id, { default_payment_method: paymentMethodId });
          break;
        }
      }
      return res.json({ success: true });
    }

    return res.json(
      { success: false, error: 'Invalid action. Use: list, create-setup-intent, attach, detach, set-default' },
      400
    );
  } catch (err) {
    error("stripe-payment-methods failed: " + err.message);
    return res.json({ success: false, error: err.message || "Request failed" }, err.statusCode || 500);
  }
};
