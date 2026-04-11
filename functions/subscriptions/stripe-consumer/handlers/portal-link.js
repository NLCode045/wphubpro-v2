const sdk = require('node-appwrite');
const { callStripeGateway } = require('../lib/callStripeGateway');
const { getAppwriteBootstrap, hasAppwriteBootstrap } = require('../lib/appwriteEnv');

module.exports = async ({ req, res, log, error, payload }) => {
  try {
    if (!hasAppwriteBootstrap()) {
      error('Appwrite configuration missing');
      return res.json({ success: false, message: 'Appwrite configuration missing' }, 500);
    }

    const userId = process.env.APPWRITE_FUNCTION_USER_ID || req.headers?.['x-appwrite-user-id'];
    if (!userId) {
      error('User not authenticated');
      return res.json({ success: false, message: 'User not authenticated' }, 401);
    }

    const p = payload && typeof payload === 'object' ? payload : {};
    const returnUrl = p.returnUrl || 'https://wphubpro.netlify.app/#/subscription';

    const DATABASE_ID = process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID || 'platform_db';
    const ACCOUNTS_COLLECTION_ID =
      process.env.ACCOUNTS_COLLECTION_ID || process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || 'accounts';

    log(`Creating billing portal session for user: ${userId}`);

    const { endpoint, projectId, apiKey } = getAppwriteBootstrap();
    const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new sdk.Databases(client);

    let stripeCustomerId = null;
    const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
      sdk.Query.equal('user_id', userId),
      sdk.Query.limit(1),
    ]);

    if (accountDocs.total > 0 && accountDocs.documents[0].stripe_customer_id) {
      stripeCustomerId = accountDocs.documents[0].stripe_customer_id;
      log('Found Stripe customer from accounts: ' + stripeCustomerId);
    }

    if (!stripeCustomerId) {
      const subscriptions = await databases.listDocuments(DATABASE_ID, 'subscriptions', [
        sdk.Query.equal('user_id', userId),
        sdk.Query.limit(1),
      ]);
      if (subscriptions.documents?.length > 0 && subscriptions.documents[0].stripe_customer_id) {
        stripeCustomerId = subscriptions.documents[0].stripe_customer_id;
        log('Found Stripe customer from subscriptions (fallback): ' + stripeCustomerId);
      }
    }

    if (!stripeCustomerId) {
      error('No Stripe customer ID found for user');
      return res.json(
        {
          success: false,
          message: 'No Stripe customer found. Please create a subscription first or contact support.',
        },
        404,
      );
    }

    const portalResult = await callStripeGateway(
      'create-portal-session',
      { customerId: stripeCustomerId, returnUrl },
      log,
      error,
    );

    log(`Billing portal session created: ${portalResult.session_id}`);

    return res.json({
      success: true,
      url: portalResult.url,
      session_id: portalResult.session_id,
    });
  } catch (err) {
    error(`Failed to create billing portal session: ${err.message}`);
    return res.json(
      { success: false, message: err.message || 'Failed to create billing portal session' },
      500,
    );
  }
};
