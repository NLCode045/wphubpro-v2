const sdk = require("node-appwrite");

const DEFAULT_DB = "platform_db";
const DEFAULT_ACCOUNTS = "accounts";

/**
 * Patch platform `accounts` row for a user (admin notes, optional stripe_customer_id).
 */
module.exports = async function handleUpdateAccount({ req, res, log, error }, { client }) {
  const payload = req._parsedPayload || {};
  const userId = payload.userId || payload.user_id;
  if (!userId) {
    return res.json({ success: false, message: "userId is required" }, 400);
  }

  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || process.env.PLATFORM_DATABASE_ID || DEFAULT_DB;
  const ACCOUNTS_COLLECTION_ID = process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || DEFAULT_ACCOUNTS;

  const databases = new sdk.Databases(client);
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(payload, "adminNotes") || Object.prototype.hasOwnProperty.call(payload, "admin_notes")) {
    const v = payload.adminNotes ?? payload.admin_notes;
    patch.admin_notes = v == null ? null : String(v);
  }
  if (payload.stripe_customer_id !== undefined) {
    const s = payload.stripe_customer_id;
    patch.stripe_customer_id = s === null || s === "" ? null : String(s).trim();
  }

  if (Object.keys(patch).length === 0) {
    return res.json({ success: false, message: "Nothing to update (adminNotes or stripe_customer_id)" }, 400);
  }

  try {
    const existing = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
      sdk.Query.equal("user_id", userId),
      sdk.Query.limit(1),
    ]);
    const doc = existing.documents?.[0];
    if (!doc) {
      return res.json(
        { success: false, message: "No account document for this user. Create an account row first." },
        404,
      );
    }

    await databases.updateDocument(DATABASE_ID, ACCOUNTS_COLLECTION_ID, doc.$id, patch);
    const updated = await databases.getDocument(DATABASE_ID, ACCOUNTS_COLLECTION_ID, doc.$id);
    log(`Updated account ${doc.$id} for user ${userId}`);
    return res.json({ success: true, account: updated });
  } catch (e) {
    if (e.message && e.message.includes("Unknown attribute")) {
      return res.json(
        {
          success: false,
          message:
            "Database missing `admin_notes` on accounts. Add the attribute in Appwrite or run appwrite push.",
        },
        500,
      );
    }
    error("update-account: " + e.message);
    return res.json({ success: false, message: e.message || "Update failed" }, 500);
  }
};
