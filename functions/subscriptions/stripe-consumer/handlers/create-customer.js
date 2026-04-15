const sdk = require('node-appwrite');
const { ensureStripeCustomerForUser } = require('./ensureStripeCustomer');
const { callStripeGateway } = require('../lib/callStripeGateway');
const { mergedEnv } = require('../lib/mergedEnv');
const { hasAppwriteBootstrap } = require('../lib/appwriteEnv');
const { createServerClientAndDatabases } = require('../../../database/fetchAppwriteCredentialsFromGateway');

module.exports = async ({ req, res, error, log, payload }) => {
  const env = mergedEnv(req);
  const databaseId = env.APPWRITE_DATABASE_ID || env.DATABASE_ID;

  if (!hasAppwriteBootstrap(env) || !databaseId || !env.ACCOUNTS_COLLECTION_ID) {
    error('Missing environment variables. Please check your function settings.');
    return res.json({ error: 'Internal Server Error: Missing configuration.' }, 500);
  }

  let databases;
  let users;
  try {
    ({ databases, users } = await createServerClientAndDatabases(log, error));
  } catch (e) {
    error(e.message);
    return res.json({ error: 'Internal Server Error: credentials.' }, 500);
  }

  const gateway = { callStripeGateway, log, error };

  const p = payload && typeof payload === 'object' ? payload : {};
  const action = (p.action || req.query?.action || '').toString().toLowerCase();

  if (action === 'ensure') {
    const userId =
      process.env.APPWRITE_FUNCTION_USER_ID ||
      req.headers?.['x-appwrite-user-id'] ||
      req.headers?.['X-Appwrite-User-Id'];
    if (!userId) {
      return res.json({ error: 'User not authenticated.' }, 401);
    }
    try {
      const appwriteUser = await users.get(userId);
      const email = appwriteUser.email;
      if (!email) {
        return res.json({ success: false, message: 'User email required for billing.' }, 400);
      }
      const user = {
        $id: appwriteUser.$id,
        email,
        name: appwriteUser.name || undefined,
      };
      const result = await ensureStripeCustomerForUser(
        user,
        databases,
        env,
        { skipDefaultSubscription: true },
        gateway,
      );
      return res.json(result);
    } catch (err) {
      error('ensure failed: ' + err.message);
      return res.json({ error: err.message || 'Could not set up billing' }, 500);
    }
  }

  const eventData = req?.env?.APPWRITE_FUNCTION_EVENT_DATA || req?.variables?.APPWRITE_FUNCTION_EVENT_DATA;
  if (!eventData) {
    return res.json(
      {
        error: 'Missing APPWRITE_FUNCTION_EVENT_DATA. For browser clients use { "action": "ensure" }.',
      },
      400,
    );
  }

  try {
    const user = JSON.parse(eventData);
    if (!user?.$id || !user.email) {
      return res.json({ success: false, message: 'User id/email required.' }, 400);
    }
    const result = await ensureStripeCustomerForUser(
      user,
      databases,
      env,
      { skipDefaultSubscription: false },
      gateway,
    );
    return res.json(result);
  } catch (err) {
    error('Failed to create stripe customer:', err);
    return res.json({ error: err.message }, 500);
  }
};
