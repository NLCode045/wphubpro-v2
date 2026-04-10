/** Merge Appwrite function `req.variables` over process.env (same pattern as other Stripe functions). */
function mergedEnv(req) {
  return {
    ...process.env,
    ...(req?.variables && typeof req.variables === 'object' ? req.variables : {}),
  };
}

module.exports = { mergedEnv };
