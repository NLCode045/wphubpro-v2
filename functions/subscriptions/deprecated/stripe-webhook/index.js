// Stripe Webhook Handler for Appwrite Function
const sdk = require('node-appwrite');
const { callStripeGateway } = require('./lib/callStripeGateway');
const { getAppwriteBootstrap, hasAppwriteBootstrap } = require('./lib/appwriteEnv');
const { processStripeWebhookEvent } = require('./processStripeWebhookEvent');

/**
 * Expects stripe-gateway to provide webhook verification
 */
module.exports = async ({ req, res, log, error }) => {
  if (!hasAppwriteBootstrap()) {
    error('Appwrite configuration missing');
    return res.json({ success: false, message: 'Appwrite configuration missing' }, 500);
  }

  const { endpoint: APPWRITE_ENDPOINT, projectId: APPWRITE_PROJECT_ID, apiKey: APPWRITE_API_KEY } =
    getAppwriteBootstrap();
  const DATABASE_ID = process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID || 'platform_db';
  const ACCOUNTS_COLLECTION_ID =
    process.env.ACCOUNTS_COLLECTION_ID || process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || 'accounts';
  const SUBSCRIPTIONS_COLLECTION_ID =
    process.env.SUBSCRIPTIONS_COLLECTION_ID || process.env.APPWRITE_SUBSCRIPTIONS_COLLECTION_ID || 'subscriptions';

  let verificationResult;
  try {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(req.body || '', 'utf8');

    verificationResult = await callStripeGateway(
      'verify-webhook',
      {
        signature: sig,
        body: rawBody.toString('utf8'),
      },
      log,
      error
    );
  } catch (err) {
    error('Webhook signature verification failed: ' + err.message);
    return res.json({ success: false, message: 'Webhook signature verification failed' }, 400);
  }

  const event = verificationResult.event;
  if (!event) {
    error('No event data from webhook verification');
    return res.json({ success: false, message: 'Invalid webhook event' }, 400);
  }

  const client = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  const users = new sdk.Users(client);
  const databases = new sdk.Databases(client);

  try {
    return await processStripeWebhookEvent({
      event,
      res,
      log,
      error,
      callStripeGateway,
      databases,
      users,
      DATABASE_ID,
      ACCOUNTS_COLLECTION_ID,
      SUBSCRIPTIONS_COLLECTION_ID,
    });
  } catch (err) {
    error('Webhook handler error: ' + err.message);
    return res.json({ success: false, message: 'Webhook handler error' }, 500);
  }
};
