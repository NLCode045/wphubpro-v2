/**
 * Appwrite bootstrap for Stripe consumer functions (SDK + gateway execution).
 * Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY on the function.
 * Legacy fallbacks (APPWRITE_FUNCTION_*, APPWRITE_KEY) live only here.
 */

function getAppwriteBootstrapFromEnv(env) {
  const e = env && typeof env === 'object' ? env : process.env;
  return {
    endpoint:
      e.APPWRITE_ENDPOINT ||
      e.APPWRITE_FUNCTION_ENDPOINT ||
      e.APPWRITE_FUNCTION_API_ENDPOINT,
    projectId: e.APPWRITE_PROJECT_ID || e.APPWRITE_FUNCTION_PROJECT_ID,
    apiKey:
      e.APPWRITE_API_KEY ||
      e.APPWRITE_FUNCTION_API_KEY ||
      e.APPWRITE_KEY,
  };
}

function getAppwriteBootstrap() {
  return getAppwriteBootstrapFromEnv(process.env);
}

function hasAppwriteBootstrap(env) {
  const { endpoint, projectId, apiKey } =
    env !== undefined && env !== null
      ? getAppwriteBootstrapFromEnv(env)
      : getAppwriteBootstrap();
  return Boolean(endpoint && projectId && apiKey);
}

module.exports = {
  getAppwriteBootstrap,
  getAppwriteBootstrapFromEnv,
  hasAppwriteBootstrap,
};
