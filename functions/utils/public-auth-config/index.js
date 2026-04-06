const sdk = require("node-appwrite");

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (req.payload && typeof req.payload === "object") return req.payload;
  const raw = req.payload || req.bodyRaw || req.body;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    return JSON.parse(trimmed);
  }
  return {};
}

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

function parseStoredValue(str) {
  if (str == null || str === "") return {};
  try {
    return JSON.parse(str);
  } catch {
    return { _invalidJson: true, _raw: String(str) };
  }
}

const DATABASE_ID = "platform_db";
const COLLECTION_ID = "platform_settings";
const AUTH_KEY = "auth";

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;

  if (!endpoint || !projectId || !apiKey) {
    error("Function environment variables are not configured correctly.");
    return fail(res, "Function environment is not configured.", 500);
  }

  let payload = {};
  try {
    payload = parsePayload(req);
  } catch (e) {
    return fail(res, "Invalid request body", 400);
  }

  const actionRaw = (payload.action || "").toString().toLowerCase().replace(/-/g, "_");

  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new sdk.Databases(client);
  const users = new sdk.Users(client);

  async function readAuthSettings() {
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [sdk.Query.equal("key", AUTH_KEY)]);
    if (!existing.total) return {};
    return parseStoredValue(existing.documents[0].value);
  }

  try {
    if (actionRaw === "public_auth_config") {
      const auth = await readAuthSettings();
      const forceMfaForAllUsers = Boolean(auth.forceMfaForAllUsers);
      const mfaOtpMailEnabled = auth.mfaOtpMailEnabled !== false;
      const mfaAuthenticatorEnabled = auth.mfaAuthenticatorEnabled !== false;
      return ok(res, {
        success: true,
        forceMfaForAllUsers,
        mfaOtpMailEnabled,
        mfaAuthenticatorEnabled,
      });
    }

    if (actionRaw === "login_methods") {
      const email = (payload.email || "").toString().trim().toLowerCase();
      if (!email) {
        return fail(res, "Missing email", 400);
      }

      let mfaFactorEmailEnabled = true;
      let mfaFactorAuthenticatorEnabled = true;
      let mfaFactorEmailRegistered = false;
      let mfaFactorTotpRegistered = false;

      try {
        const listRes = await users.list({
          queries: [sdk.Query.equal("email", email), sdk.Query.limit(1)],
        });
        const batch = listRes.users || listRes.documents || [];
        if (batch.length > 0) {
          const prefs = batch[0].prefs || {};
          if (prefs.mfaFactorEmailEnabled === false || prefs.mfaFactorEmailEnabled === "false") {
            mfaFactorEmailEnabled = false;
          }
          if (prefs.mfaFactorAuthenticatorEnabled === false || prefs.mfaFactorAuthenticatorEnabled === "false") {
            mfaFactorAuthenticatorEnabled = false;
          }
          const userId = batch[0].$id;
          if (userId) {
            try {
              const factors = await users.listMFAFactors({ userId });
              mfaFactorEmailRegistered = Boolean(factors.email);
              mfaFactorTotpRegistered = Boolean(factors.totp);
            } catch (factorErr) {
              log("listMFAFactors failed: " + factorErr.message);
              mfaFactorEmailRegistered = true;
              mfaFactorTotpRegistered = true;
            }
          }
        }
      } catch (lookupErr) {
        log("users.list by email failed: " + lookupErr.message);
      }

      return ok(res, {
        success: true,
        otpOnly: false,
        globalOtp: false,
        userOtp: false,
        passwordAndOtp: false,
        globalPwdOtp: false,
        userPwdOtp: false,
        mfaFactorEmailEnabled,
        mfaFactorAuthenticatorEnabled,
        mfaFactorEmailRegistered,
        mfaFactorTotpRegistered,
      });
    }

    return fail(res, "Unknown action", 400);
  } catch (e) {
    error(e.message);
    return fail(res, e.message, 500);
  }
};
