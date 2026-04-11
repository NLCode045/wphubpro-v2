const sdk = require("node-appwrite");
const { mergedEnv } = require("./mergedEnv");
const { getAppwriteBootstrapFromEnv } = require("./appwriteEnv");

module.exports = async function ensureAdmin(req) {
  const env = mergedEnv(req);
  const { endpoint: APPWRITE_ENDPOINT, projectId: APPWRITE_PROJECT_ID, apiKey: APPWRITE_API_KEY } =
    getAppwriteBootstrapFromEnv(env);
  const userId =
    env.APPWRITE_FUNCTION_USER_ID ||
    req.headers?.["x-appwrite-user-id"] ||
    req.headers?.["X-Appwrite-User-Id"];

  if (!userId || !APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    return false;
  }

  const client = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  const teams = new sdk.Teams(client);
  const users = new sdk.Users(client);

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
