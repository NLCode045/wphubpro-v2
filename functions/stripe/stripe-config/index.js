/**
 * stripe-config: Consumer function that fetches Stripe configuration for frontend
 *
 * This function:
 * - Calls stripe-gateway to get publishable key
 * - Returns ready-to-use Stripe config for frontend
 * - Frontend never needs to know about credentials
 *
 * The frontend receives: { stripe_publishable_key: "pk_..." }
 * Frontend never sees: Secret keys, webhook secrets, or any sensitive data
 */
const sdk = require('node-appwrite');
const { executeFunction } = require('node-appwrite/functions');

async function callStripeGateway(req, res, log, error, action) {
  try {
    const endpoint = process.env.APPWRITE_FUNCTION_ENDPOINT;
    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const apiKey = process.env.APPWRITE_FUNCTION_API_KEY;

    const client = new sdk.Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const functions = new sdk.Functions(client);

    const response = await functions.createExecution(
      'stripe-gateway',
      JSON.stringify({ action }),
      false
    );

    if (response.status !== 'completed') {
      throw new Error(`Gateway execution failed: ${response.statusCode}`);
    }

    return JSON.parse(response.responseBody);
  } catch (err) {
    error(`Failed to call stripe-gateway: ${err.message}`);
    throw err;
  }
}

module.exports = async ({ req, res, log, error }) => {
  try {
    // This function is called by frontend to get Stripe configuration
    // Frontend: GET /functions/stripe-config
    // Response: { success: true, stripe_publishable_key: "pk_..." }

    const result = await callStripeGateway(req, res, log, error, 'get-publishable-key');

    if (!result.success) {
      error('stripe-gateway returned error: ' + result.message);
      return res.json(
        {
          success: false,
          message: 'Failed to retrieve Stripe configuration',
        },
        500
      );
    }

    // Return only the publishable key - safe for frontend
    return res.json({
      success: true,
      stripe_publishable_key: result.publishable_key,
    });
  } catch (err) {
    error(`stripe-config error: ${err.message}`);
    return res.json(
      {
        success: false,
        message: 'Configuration service unavailable',
      },
      500
    );
  }
};
