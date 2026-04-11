const sdk = require('node-appwrite');
const { callStripeGateway } = require('../lib/callStripeGateway');
const { mergeGatewayPayload } = require('../lib/mergeGatewayPayload');
const { getAppwriteBootstrap, hasAppwriteBootstrap } = require('../lib/appwriteEnv');

/**
 * Invoice + payment-intent admin/member flows (replaces stripe-invoices).
 * If no `action` is sent, lists invoices for the authenticated user's Stripe customer (member UX).
 */
module.exports = async ({ req, res, log, error, payload }) => {
  try {
    const p = payload && typeof payload === 'object' ? payload : {};
    const action = String(p.action || req.query?.action || '')
      .toLowerCase()
      .trim();

    if (!action) {
      const userId =
        process.env.APPWRITE_FUNCTION_USER_ID ||
        req.headers?.['x-appwrite-user-id'] ||
        req.headers?.['X-Appwrite-User-Id'];
      if (!userId || !hasAppwriteBootstrap()) {
        return res.json({ success: false, message: 'action required' }, 400);
      }
      const { endpoint, projectId, apiKey } = getAppwriteBootstrap();
      const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
      const databases = new sdk.Databases(client);
      const DATABASE_ID = process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID || 'platform_db';
      const ACCOUNTS_COLLECTION_ID =
        process.env.ACCOUNTS_COLLECTION_ID || process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || 'accounts';
      const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
        sdk.Query.equal('user_id', userId),
        sdk.Query.limit(1),
      ]);
      const stripeCustomerId =
        accountDocs.total > 0 ? accountDocs.documents[0].stripe_customer_id : null;
      if (!stripeCustomerId) {
        return res.json({ invoices: [] });
      }
      const result = await callStripeGateway(
        'list-invoices',
        { customer: stripeCustomerId, limit: p.limit || 100 },
        log,
        error,
      );
      return res.json(result);
    }

    const result = await callStripeGateway(action, mergeGatewayPayload(p), log, error);
    return res.json(result);
  } catch (err) {
    error(`stripe invoices error: ${err.message}`);
    return res.json({ success: false, message: err.message }, 500);
  }
};
