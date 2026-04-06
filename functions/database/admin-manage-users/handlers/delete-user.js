const sdk = require("node-appwrite");

module.exports = async function handleDeleteUser({ req, res, log, error }, { client }) {
  const payload = req._parsedPayload || {};
  const userId = payload.userId || payload.user_id;
  const confirm = payload.confirm === true || payload.confirm === "true";

  if (!userId) {
    return res.json({ success: false, message: "userId is required" }, 400);
  }
  if (!confirm) {
    return res.json(
      { success: false, message: "Set confirm: true to permanently delete this user." },
      400,
    );
  }

  const users = new sdk.Users(client);
  try {
    await users.delete(userId);
    log(`Deleted user ${userId}`);
    return res.json({ success: true, message: "User deleted." });
  } catch (e) {
    error("delete-user: " + e.message);
    return res.json({ success: false, message: e.message || "Delete failed" }, 500);
  }
};
