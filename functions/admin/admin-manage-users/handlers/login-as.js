const sdk = require("node-appwrite");

module.exports = async function handleLoginAs({ req, res, log, error }, { client }) {
  const payload = req._parsedPayload || {};
  const targetUserId = payload.userId || payload.user_id || payload.targetUserId;
  if (!targetUserId) {
    return res.json({ success: false, message: "Missing userId in payload" }, 400);
  }

  const users = new sdk.Users(client);
  const target = await users.get(targetUserId);
  if (!target) return res.json({ success: false, message: "Target user not found" }, 404);

  if (typeof users.createJWT !== "function") {
    return res.json(
      {
        success: false,
        message: "createJWT not available in Appwrite SDK in this runtime.",
      },
      500
    );
  }

  const jwtResp = await users.createJWT(targetUserId);
  return res.json({ success: true, token: jwtResp.jwt, expiresAt: jwtResp.expiresAt });
};
