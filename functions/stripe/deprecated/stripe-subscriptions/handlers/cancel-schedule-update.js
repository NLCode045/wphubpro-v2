const sdk = require("node-appwrite");
const { mergedEnv } = require("../lib/mergedEnv");
const { getAppwriteBootstrapFromEnv, hasAppwriteBootstrap } = require("../lib/appwriteEnv");
const { callStripeGateway } = require("../lib/callStripeGateway");

/**
 * Cancels/releases a pending subscription schedule so future plan changes won't apply.
 * Payload: { scheduleId?: string, subscriptionId?: string }
 * Verifies the schedule/subscription belongs to the authenticated user's Stripe customer.
 */
module.exports = async ({ req, res, log, error }) => {
  const env = mergedEnv(req);
  const { endpoint, projectId, apiKey } = getAppwriteBootstrapFromEnv(env);
  const DATABASE_ID = env.APPWRITE_DATABASE_ID || env.DATABASE_ID;
  const ACCOUNTS_COLLECTION_ID =
    env.APPWRITE_ACCOUNTS_COLLECTION_ID || env.ACCOUNTS_COLLECTION_ID;

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
    env.APPWRITE_FUNCTION_USER_ID ||
    req.headers?.["x-appwrite-user-id"] ||
    req.headers?.["X-Appwrite-User-Id"];

  if (!userId) {
    return res.json({ success: false, message: "User not authenticated" }, 401);
  }

  try {
    let targetScheduleId = scheduleId;

    if (!targetScheduleId && subscriptionId) {
      const list = await callStripeGateway(
        "list-subscription-schedules",
        { subscription: subscriptionId, limit: 5 },
        log,
        error
      );
      const data = list.schedules || [];
      if (!data.length) {
        return res.json(
          { success: false, message: "No subscription schedule found for subscription" },
          404
        );
      }
      const candidate = data.find((s) => s.status !== "released") || data[0];
      targetScheduleId = candidate.id;
    }

    if (!targetScheduleId) {
      return res.json({ success: false, message: "Missing scheduleId or subscriptionId" }, 400);
    }

    const schedWrap = await callStripeGateway(
      "get-subscription-schedule",
      { schedule_id: targetScheduleId },
      log,
      error
    );
    const schedule = schedWrap.schedule;
    const subRef = schedule.subscription;
    const subId = typeof subRef === "string" ? subRef : subRef?.id;
    if (!subId) {
      return res.json({ success: false, message: "Could not resolve subscription for schedule" }, 400);
    }

    const subResult = await callStripeGateway("get-subscription", { subscriptionId: subId }, log, error);
    const subscription = subResult.subscription;
    const subscriptionCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

    if (hasAppwriteBootstrap(env) && DATABASE_ID && ACCOUNTS_COLLECTION_ID) {
      const client = new sdk.Client();
      client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
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

    const released = await callStripeGateway(
      "release-subscription-schedule",
      { schedule_id: targetScheduleId },
      log,
      error
    );

    return res.json({
      success: true,
      scheduleId: targetScheduleId,
      released: released.schedule,
    });
  } catch (e) {
    error(e.message || e.toString());
    return res.json({ success: false, message: e.message || "Stripe error" }, 500);
  }
};
