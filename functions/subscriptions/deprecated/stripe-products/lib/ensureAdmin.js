const { mergedEnv } = require("./mergedEnv");
const { hasAppwriteBootstrap } = require("./appwriteEnv");
const { createServerClientAndDatabases } = require("../../../../database/fetchAppwriteCredentialsFromGateway");

module.exports = async function ensureAdmin(req) {
  const env = mergedEnv(req);
  const userId =
    env.APPWRITE_FUNCTION_USER_ID ||
    req.headers?.["x-appwrite-user-id"] ||
    req.headers?.["X-Appwrite-User-Id"];

  if (!userId || !hasAppwriteBootstrap()) {
    return false;
  }

  let teams;
  let users;
  try {
    ({ teams, users } = await createServerClientAndDatabases(null, null));
  } catch {
    return false;
  }

  try {
    const memberships = await teams.listMemberships("admin");
    if (memberships.memberships?.some((m) => m.userId === userId)) return true;
  } catch {
    /* ignore */
  }

  try {
    const user = await users.get(userId);
    if (
      user.labels?.some(
        (l) => String(l).toLowerCase() === "admin" || String(l).toLowerCase() === "administrator"
      )
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }

  return false;
};
