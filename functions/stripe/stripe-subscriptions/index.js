/**
 * stripe-subscriptions: Consumer function for Stripe subscription operations
 * NEW PATTERN: Gets credentials from stripe-gateway, instantiates Stripe SDK locally
 * 
 * This consumer function now:
 * 1. Requests credentials from stripe-gateway
 * 2. Caches credentials for the execution duration
 * 3. Instantiates Stripe SDK with cached credentials
 * 4. Makes Stripe API calls directly
 * 5. Handles business logic (e.g., admin-finance-summary with multiple calls)
 */
const sdk = require('node-appwrite');
const Stripe = require('stripe');

// Cache credentials for duration of this execution
let cachedCredentials = null;

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.bodyRaw && typeof req.bodyRaw === 'string') {
    try { return JSON.parse(req.bodyRaw); } catch { return {}; }
  }
  if (req.payload && typeof req.payload === 'string') {
    try { return JSON.parse(req.payload); } catch { return {}; }
  }
  if (req.payload && typeof req.payload === 'object') return req.payload;
  return {};
}

/**
 * Fetch Stripe credentials from the stripe-gateway
 * Credentials are cached for the duration of the function execution
 */
async function getStripeCredentials(log, error) {
  if (cachedCredentials) {
    log('getStripeCredentials: Using cached credentials');
    return cachedCredentials;
  }
  
  try {
    log('getStripeCredentials: Fetching fresh credentials from gateway');
    const endpoint = process.env.APPWRITE_ENDPOINT ||
      process.env.APPWRITE_FUNCTION_ENDPOINT ||
      process.env.APPWRITE_FUNCTION_API_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY ||
      process.env.APPWRITE_FUNCTION_API_KEY ||
      process.env.APPWRITE_KEY;
    
    log(`getStripeCredentials: endpoint=${endpoint ? 'SET' : 'MISSING'}, projectId=${projectId ? 'SET' : 'MISSING'}, apiKey=${apiKey ? 'SET' : 'MISSING'}`);
    
    const gatewayClient = new sdk.Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);
    
    const functions = new sdk.Functions(gatewayClient);
    const gatewayFunctionId = process.env.STRIPE_GATEWAY_FUNCTION_ID || 'stripe-gateway';
    
    log(`getStripeCredentials: Calling ${gatewayFunctionId} with action="get-credentials"`);
    const response = await functions.createExecution(
      gatewayFunctionId,
      JSON.stringify({ action: 'get-credentials' }),
      true  // Sync execution
    );
    
    log(`getStripeCredentials: Got response, statusCode=${response.statusCode}, has responseBody=${!!response.responseBody}`);
    log(`getStripeCredentials: Response keys: ${Object.keys(response).join(', ')}`);
    
    if (response.statusCode && response.statusCode >= 400) {
      throw new Error(`Gateway returned status ${response.statusCode}`);
    }
    
    // Handle different possible response structures
    let responseBody = response.responseBody;
    
    // If no responseBody, check if response has a response property (nested response)
    if (!responseBody && response.response) {
      log('getStripeCredentials: Using nested response.response');
      responseBody = response.response;
    }
    
    // If still no responseBody, try the entire response object (shouldn't happen but fallback)
    if (!responseBody) {
      error(`getStripeCredentials: No responseBody found. Full response: ${JSON.stringify(response)}`);
      throw new Error('No credentials response from stripe-gateway');
    }
    
    const result = typeof responseBody === 'string'
      ? JSON.parse(responseBody)
      : responseBody;
    
    log(`getStripeCredentials: Parsed result, has STRIPE_SECRET_KEY=${!!result.STRIPE_SECRET_KEY}`);
    
    if (!result.success && !result.STRIPE_SECRET_KEY) {
      throw new Error(result.message || 'Failed to get credentials');
    }
    
    if (!result.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not found in gateway response');
    }
    
    cachedCredentials = result;
    log('getStripeCredentials: SUCCESS - Credentials cached');
    return cachedCredentials;
  } catch (err) {
    error(`getStripeCredentials failed: ${err.message}`);
    throw err;
  }
}

/**
 * Execute a Stripe API operation using locally instantiated Stripe SDK
 * @param {string} resource - Stripe resource (e.g., 'subscriptions', 'customers')
 * @param {string} method - API method (e.g., 'list', 'retrieve', 'update')
 * @param {object} params - Parameters to pass to the Stripe API method
 */
async function executeStripeOperation(resource, method, params, log, error) {
  try {
    log(`executeStripeOperation: START - stripe.${resource}.${method}()`);
    const credentials = await getStripeCredentials(log, error);
    const stripe = new Stripe(credentials.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
    
    if (!stripe[resource] || typeof stripe[resource][method] !== 'function') {
      throw new Error(`Invalid operation: stripe.${resource}.${method}() not found`);
    }
    
    log(`executeStripeOperation: Calling stripe.${resource}.${method}() with params:`, JSON.stringify(params || {}));
    const result = await stripe[resource][method](params);
    log(`executeStripeOperation: SUCCESS - ${resource}.${method}`);
    return result;
  } catch (err) {
    error(`executeStripeOperation failed: ${err.message}`);
    throw err;
  }
}

module.exports = async ({ req, res, log, error }) => {
  try {
    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '').toLowerCase().trim();

    if (!action) {
      return res.json({ success: false, message: 'action required' }, 400);
    }

    log(`stripe-subscriptions: action="${action}"`);

    // Route actions to local handlers
    switch (action) {
      case 'admin-list-subscriptions': {
        log('stripe-subscriptions: Handling admin-list-subscriptions');
        const result = await executeStripeOperation('subscriptions', 'list',
          { status: payload.status, limit: Math.min(payload.limit || 100, 100) },
          log, error);
        return res.json({ success: true, subscriptions: result.data, has_more: result.has_more });
      }

      case 'admin-get-details': {
        log('stripe-subscriptions: Handling admin-get-details');
        const { subscription_id } = payload;
        if (!subscription_id) {
          return res.json({ success: false, message: 'subscription_id required' }, 400);
        }
        const result = await executeStripeOperation('subscriptions', 'retrieve',
          subscription_id,
          log, error);
        return res.json({ success: true, subscription: result });
      }

      case 'admin-cancel-subscription': {
        log('stripe-subscriptions: Handling admin-cancel-subscription');
        const { subscription_id } = payload;
        if (!subscription_id) {
          return res.json({ success: false, message: 'subscription_id required' }, 400);
        }
        const result = await executeStripeOperation('subscriptions', 'del',
          subscription_id,
          log, error);
        return res.json({ success: true, subscription: result });
      }

      case 'admin-pause-subscription': {
        log('stripe-subscriptions: Handling admin-pause-subscription');
        const { subscription_id } = payload;
        if (!subscription_id) {
          return res.json({ success: false, message: 'subscription_id required' }, 400);
        }
        const result = await executeStripeOperation('subscriptions', 'update',
          subscription_id,
          { pause_collection: { behavior: 'mark_uncollectible' } },
          log, error);
        return res.json({ success: true, subscription: result });
      }

      case 'admin-resume-subscription': {
        log('stripe-subscriptions: Handling admin-resume-subscription');
        const { subscription_id } = payload;
        if (!subscription_id) {
          return res.json({ success: false, message: 'subscription_id required' }, 400);
        }
        const result = await executeStripeOperation('subscriptions', 'update',
          subscription_id,
          { pause_collection: {} },
          log, error);
        return res.json({ success: true, subscription: result });
      }

      case 'admin-archive-subscription': {
        log('stripe-subscriptions: Handling admin-archive-subscription');
        const { subscription_id, archive_reason } = payload;
        if (!subscription_id) {
          return res.json({ success: false, message: 'subscription_id required' }, 400);
        }
        const metadata = {
          archived: 'true',
          archived_at: new Date().toISOString(),
          archived_reason: archive_reason || 'admin_request'
        };
        const result = await executeStripeOperation('subscriptions', 'update',
          subscription_id,
          { metadata },
          log, error);
        return res.json({ success: true, subscription: result });
      }

      case 'admin-update-subscription-price': {
        log('stripe-subscriptions: Handling admin-update-subscription-price');
        const { subscription_id, price_id } = payload;
        if (!subscription_id || !price_id) {
          return res.json({ success: false, message: 'subscription_id and price_id required' }, 400);
        }
        
        // Get current subscription to find item ID
        const subscription = await executeStripeOperation('subscriptions', 'retrieve',
          subscription_id,
          log, error);
        
        const itemId = subscription.items?.data?.[0]?.id;
        if (!itemId) {
          return res.json({ success: false, message: 'No subscription items found' }, 400);
        }
        
        const result = await executeStripeOperation('subscriptions', 'update',
          subscription_id,
          {
            items: [{ id: itemId, price: price_id }],
            proration_behavior: 'create_prorations'
          },
          log, error);
        
        return res.json({ success: true, subscription: result });
      }

      case 'get':
      case 'list':
      case 'create': {
        log(`stripe-subscriptions: Handling generic action="${action}"`);
        const { operation } = payload;
        if (!operation) {
          return res.json({ success: false, message: 'operation required in payload (format: "resource.method")' }, 400);
        }
        
        const [resource, method] = operation.split('.');
        if (!resource || !method) {
          return res.json({ success: false, message: 'operation must be "resource.method" format' }, 400);
        }
        
        const result = await executeStripeOperation(resource, method, payload.params, log, error);
        return res.json({ success: true, result });
      }

      default:
        log(`stripe-subscriptions: Unknown action="${action}"`);
        return res.json({ success: false, message: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    error(`stripe-subscriptions error: ${err.message}`);
    return res.json({ success: false, message: err.message }, 500);
  }
};
