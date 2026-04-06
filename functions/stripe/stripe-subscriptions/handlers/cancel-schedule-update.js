const Stripe = require("stripe");
const sdk = require("node-appwrite");

/**
 * Cancels/releases a pending subscription schedule so future plan changes won't apply.
 * Payload: { scheduleId?: string, subscriptionId?: string }
 * Verifies the schedule/subscription belongs to the authenticated user's Stripe customer.
 */
module.exports = async ({ req, res, log, error }) => {
  const env =
    req && req.variables && Object.keys(req.variables).length ? req.variables : process.env;
  const stripeKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const APPWRITE_ENDPOINT =
    env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const APPWRITE_PROJECT_ID =
    env.APPWRITE_PROJECT_ID ||
    process.env.APPWRITE_PROJECT_ID ||
    process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const APPWRITE_API_KEY =
    env.APPWRITE_API_KEY ||
    process.env.APPWRITE_API_KEY ||
    process.env.APPWRITE_FUNCTION_API_KEY ||
    process.env.APPWRITE_KEY;
  const DATABASE_ID =
    env.APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || process.env.DATABASE_ID;
  const ACCOUNTS_COLLECTION_ID =
    env.APPWRITE_ACCOUNTS_COLLECTION_ID ||
    process.env.APPWRITE_ACCOUNTS_COLLECTION_ID ||
    process.env.ACCOUNTS_COLLECTION_ID;

  if (!stripeKey) {
    error("Missing STRIPE_SECRET_KEY");
    return res.json({ success: false, message: "Stripe key not configured" }, 500);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  let payload = {};
  try {
    if (req.payload && typeof req.payload === "string") payload = JSON.parse(req.payload);
    else if (req.payload && typeof req.payload === "object") payload = req.payload;
    else if (req.bodyRaw) payload = JSON.parse(req.bodyRaw);
    else if (req.body && typeof req.body === "object") payload = req.body;
  } catch (e) {
    payload = req.query || {};
  }

  const { scheduleId, subscriptionId } = payload;

  const userId =
    process.env.APPWRITE_FUNCTION_USER_ID ||
    req.headers?.["x-appwrite-user-id"] ||
    req.headers?.["X-Appwrite-User-Id"];

  if (!userId) {
    return res.json({ success: false, message: "User not authenticated" }, 401);
  }

  try {
    let targetScheduleId = scheduleId;

    if (!targetScheduleId && subscriptionId) {
      const list = await stripe.subscriptionSchedules.list({
        subscription: subscriptionId,
        limit: 5,
      });
      if (!list || !list.data || list.data.length === 0) {
        return res.json(
          { success: false, message: "No subscription schedule found for subscription" },
          404
        );
      }
      const candidate = list.data.find((s) => s.status !== "released") || list.data[0];
      targetScheduleId = candidate.id;
    }

    if (!targetScheduleId) {
      return res.json({ success: false, message: "Missing scheduleId or subscriptionId" }, 400);
    }

    const schedule = await stripe.subscriptionSchedules.retrieve(targetScheduleId);
    const subRef = schedule.subscription;
    const subId = typeof subRef === "string" ? subRef : subRef?.id;
    if (!subId) {
      return res.json({ success: false, message: "Could not resolve subscription for schedule" }, 400);
    }

    const subscription = await stripe.subscriptions.retrieve(subId);
    const subscriptionCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

    if (
      APPWRITE_ENDPOINT &&
      APPWRITE_PROJECT_ID &&
      APPWRITE_API_KEY &&
      DATABASE_ID &&
      ACCOUNTS_COLLECTION_ID
    ) {
      const client = new sdk.Client();
      client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
      const databases = new sdk.Databases(client);
      const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
        sdk.Query.equal("user_id", userId),
        sdk.Query.limit(1),
      ]);
      if (accountDocs.total === 0 || !accountDocs.documents[0]?.stripe_customer_id) {
        return res.json({ success: false, message: "No billing account found" }, 404);
      }
      if (accountDocs.documents[0].stripe_customer_id !== subscriptionCustomerId) {
        return res.json({ success: false, message: "This schedule does not belong to your account." }, 403);
      }
    } else {
      log("Skipping ownership verification (missing Appwrite env)");
    }

    const released = await stripe.subscriptionSchedules.release(targetScheduleId);

    return res.json({ success: true, scheduleId: targetScheduleId, released: released });
  } catch (e) {
    error(e.message || e.toString());
    return res.json({ success: false, message: e.message || "Stripe error" }, 500);
  }
};
