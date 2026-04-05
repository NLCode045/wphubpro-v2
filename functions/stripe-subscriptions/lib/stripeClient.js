const Stripe = require("stripe");

const API_VERSION = "2023-10-16";

function mergedEnv(req) {
  return {
    ...process.env,
    ...(req?.variables && typeof req.variables === "object" ? req.variables : {}),
  };
}

/**
 * Lazy Stripe client — never call `new Stripe()` at module load (missing STRIPE_SECRET_KEY crashes the worker → 503).
 */
function createStripeFromReq(req) {
  const key = mergedEnv(req).STRIPE_SECRET_KEY;
  if (!key || !String(key).trim()) return null;
  return new Stripe(String(key).trim(), { apiVersion: API_VERSION });
}

module.exports = { mergedEnv, createStripeFromReq, API_VERSION };
