/**
 * Consumer function utility - Simple gateway caller
 * No credentials needed - uses Appwrite's built-in function execution
 */

/**
 * Call a gateway function and return the result
 * This uses Appwrite's native function execution without needing credentials
 */
async function callGateway(gatewayFunctionId, action, payload = {}) {
  // Use fetch to call the gateway via Appwrite's built-in HTTP endpoint
  // This is available within the Appwrite function environment
  const functionUrl = `${process.env.APPWRITE_FUNCTION_ENDPOINT}/functions/${gatewayFunctionId}/executions`;

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        payload,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gateway returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (err) {
    throw new Error(`Failed to call gateway: ${err.message}`);
  }
}

module.exports = {
  callGateway,
};
