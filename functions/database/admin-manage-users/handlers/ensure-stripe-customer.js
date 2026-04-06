const sdk = require("node-appwrite");
const { ensureStripeCustomerForUser } = require("../../stripe-create-customer/ensureStripeCustomer");

/**
 * Admin: create or link Stripe customer for a user (updates/creates `accounts` row).
 * Optional assignDefaultSubscription: if true, may create default signup subscription (same as user registration).
 */
module.exports = async function handleEnsureStripeCustomer({ req, res, log, error }, { client, stripe }) {
  if (!stripe) {
    return res.json({ success: false, message: "Stripe not configured on this function." }, 500);
  }

  const payload = req._parsedPayload || {};
  const userId = payload.userId || payload.user_id;
  if (!userId) {
    return res.json({ success: false, message: "userId is required" }, 400);
  }

  const env = {
    ...process.env,
    APPWRITE_DATABASE_ID:
      process.env.APPWRITE_DATABASE_ID || process.env.PLATFORM_DATABASE_ID || "platform_db",
    DATABASE_ID: process.env.APPWRITE_DATABASE_ID || process.env.PLATFORM_DATABASE_ID || "platform_db",
    ACCOUNTS_COLLECTION_ID: process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || "accounts",
    SETTINGS_COLLECTION_ID: process.env.SETTINGS_COLLECTION_ID || "platform_settings",
  };

  const databases = new sdk.Databases(client);
  const users = new sdk.Users(client);

  try {
    const appwriteUser = await users.get(userId);
    if (!appwriteUser.email) {
      return res.json({ success: false, message: "User email required for Stripe customer." }, 400);
    }
    const user = {
      $id: appwriteUser.$id,
      email: appwriteUser.email,
      name: appwriteUser.name || undefined,
    };
    const assignDefaultSub =
      payload.assignDefaultSubscription === true || payload.assignDefaultSubscription === "true";
    const result = await ensureStripeCustomerForUser(user, databases, stripe, env, {
      skipDefaultSubscription: !assignDefaultSub,
    });
    log(`ensure-stripe-customer for ${userId}: ${JSON.stringify({ skipped: result.skipped })}`);
    return res.json(result);
  } catch (e) {
    error("ensure-stripe-customer: " + e.message);
    return res.json({ success: false, message: e.message || "Failed to ensure Stripe customer" }, 500);
  }
};
