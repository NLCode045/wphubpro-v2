const fetch = require("node-fetch");
const sdk = require("node-appwrite");

module.exports = async function handleUpdate(
  { req, res, log, error },
  { client, stripe, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY }
) {
  const payload = req._parsedPayload || {};
  const updates = payload.updates || {};
  const userId =
    payload.userId ||
    updates.userId ||
    req.variables?.APPWRITE_FUNCTION_USER_ID ||
    req.variables?.APPWRITE_USER_ID ||
    req.headers?.["x-appwrite-user-id"];

  if (!userId) {
    return res.json({ success: false, message: "userId is required" }, 400);
  }

  const users = new sdk.Users(client);
  const currentUser = await users.get(userId);

  try {
    if (updates.name && updates.name !== currentUser.name) {
      await users.updateName(userId, updates.name);
    }
    if (updates.email && updates.email !== currentUser.email) {
      await users.updateEmail(userId, updates.email);
    }

    const stripeCustomerId = updates.stripe_customer_id || currentUser.prefs?.stripe_customer_id;
    if (stripe && stripeCustomerId && (updates.name || updates.email)) {
      try {
        const stripeUpdate = {};
        if (updates.name) stripeUpdate.name = updates.name;
        if (updates.email) stripeUpdate.email = updates.email;
        await stripe.customers.update(stripeCustomerId, stripeUpdate);
        log(`Updated Stripe customer ${stripeCustomerId} with new details`);
      } catch (stripeErr) {
        log(`Warning: Failed to update Stripe customer: ${stripeErr.message}`);
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "status")) {
      const newStatus = updates.status === "Active";
      if (newStatus !== currentUser.status) {
        await users.updateStatus(userId, newStatus);
      }
    }

    const prefs = {};
    if (updates.planId) prefs.plan_id = updates.planId;
    if (updates.stripe_customer_id) prefs.stripe_customer_id = updates.stripe_customer_id;
    if (Object.keys(updates.customLimits || {}).length > 0) prefs.limits = updates.customLimits;
    if (Object.keys(prefs).length > 0) {
      await users.updatePrefs(userId, { ...currentUser.prefs, ...prefs });
    }
  } catch (err) {
    error(`Appwrite update failed: ${err.message}`);
    return res.json({ success: false, message: err.message || "Failed to update user" }, 500);
  }

  let json = await users.get(userId);

  if (
    Object.prototype.hasOwnProperty.call(updates, "isAdmin") &&
    typeof updates.isAdmin === "boolean"
  ) {
    try {
      const adminExec = await fetch(`${APPWRITE_ENDPOINT}/functions/set-admin/executions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
          "X-Appwrite-Key": APPWRITE_API_KEY,
        },
        body: JSON.stringify({ userId, isAdmin: updates.isAdmin }),
      });
      if (!adminExec.ok) {
        const adminJson = await adminExec.json();
        log(`Warning: Failed to update admin status: ${JSON.stringify(adminJson)}`);
      } else {
        log(`Updated admin status for user ${userId}: ${updates.isAdmin}`);
      }
    } catch (err) {
      log(`Warning: Could not update admin status: ${err.message}`);
    }
  }

  json = await users.get(userId);
  log(`Updated user ${userId}`);
  return res.json({ success: true, user: json });
};
