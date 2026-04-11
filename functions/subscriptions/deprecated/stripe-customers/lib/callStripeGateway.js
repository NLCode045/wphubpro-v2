/**
 * Single implementation for all Stripe consumer functions under functions/stripe/.
 * Invokes stripe-gateway via Appwrite Functions API (no vault credentials here).
 */
const sdk = require('node-appwrite');
const { getAppwriteBootstrap } = require('./appwriteEnv');

/**
 * @param {string} action - Gateway action (kebab-case)
 * @param {object} [payload] - Passed to gateway as JSON payload
 * @param {import('node-appwrite').Log} log
 * @param {import('node-appwrite').Error} error
 * @returns {Promise<object>} Parsed gateway JSON (success === true)
 */
async function callStripeGateway(action, payload, log, error) {
  const { endpoint, projectId, apiKey } = getAppwriteBootstrap();

  const gatewayClient = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

  const functions = new sdk.Functions(gatewayClient);
  const gatewayFunctionId = process.env.STRIPE_GATEWAY_FUNCTION_ID || 'stripe-gateway';

  const body = { action, payload: payload && typeof payload === 'object' ? payload : {} };

  try {
    const response = await functions.createExecution(gatewayFunctionId, JSON.stringify(body), false);

    if (!response.responseBody) {
      throw new Error('No response from stripe-gateway');
    }

    const result =
      typeof response.responseBody === 'string' ? JSON.parse(response.responseBody) : response.responseBody;

    if (!result.success) {
      throw new Error(result.message || 'Gateway operation failed');
    }

    return result;
  } catch (err) {
    error(`stripe-gateway call failed: ${err.message}`);
    throw err;
  }
}

module.exports = { callStripeGateway };
