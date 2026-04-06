const sdk = require("node-appwrite");

/**
 * Sends Appwrite password recovery email to the user.
 * Env: APP_USER_PASSWORD_RECOVERY_URL — full URL of reset-password page (must match Appwrite Auth URL allowlist).
 */
module.exports = async function handleSendPasswordRecovery({ req, res, log, error }, { client }) {
  const payload = req._parsedPayload || {};
  const userId = payload.userId || payload.user_id;
  if (!userId) {
    return res.json({ success: false, message: "userId is required" }, 400);
  }

  const recoveryUrl =
    process.env.APP_USER_PASSWORD_RECOVERY_URL ||
    process.env.APPWRITE_USER_PASSWORD_RECOVERY_URL ||
    "";

  if (!String(recoveryUrl).trim()) {
    return res.json(
      {
        success: false,
        message:
          "Missing APP_USER_PASSWORD_RECOVERY_URL (full URL to your app reset-password page).",
      },
      500,
    );
  }

  const users = new sdk.Users(client);
  try {
    await users.createRecovery(userId, String(recoveryUrl).trim());
    log(`Password recovery email triggered for ${userId}`);
    return res.json({ success: true, message: "Recovery email sent." });
  } catch (e) {
    error("send-password-recovery: " + e.message);
    return res.json({ success: false, message: e.message || "Failed to send recovery" }, 500);
  }
};
