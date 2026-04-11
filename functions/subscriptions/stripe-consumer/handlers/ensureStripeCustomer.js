const { Query } = require("node-appwrite");

/**
 * Ensures a Stripe customer exists for an Appwrite user and updates the account document.
 * All Stripe calls go through stripe-gateway (no STRIPE_SECRET_KEY in this function).
 */
async function ensureStripeCustomerForUser(user, databases, env, options, gateway) {
  const { callStripeGateway, log, error } = gateway;
  const { skipDefaultSubscription = false } = options || {};

  const accountsCollectionId = env.ACCOUNTS_COLLECTION_ID;
  const defaultPriceId = env.STRIPE_DEFAULT_PRICE_ID;

  const accounts = await databases.listDocuments(env.APPWRITE_DATABASE_ID, accountsCollectionId, [
    Query.equal("user_id", user.$id),
  ]);

  if (accounts.documents.length === 0) {
    throw new Error("Account document not found for user");
  }

  const accountDoc = accounts.documents[0];
  let stripeCustomerId = accountDoc.stripe_customer_id;

  if (!stripeCustomerId) {
    const search = await callStripeGateway(
      "search-customers",
      {
        query: `metadata['appwrite_user_id']:'${user.$id}'`,
        limit: 1,
      },
      log,
      error
    );
    const existing = search.customers && search.customers[0];
    if (existing) {
      stripeCustomerId = existing.id;
    } else {
      const created = await callStripeGateway(
        "create-customer",
        {
          email: user.email,
          name: user.name,
          metadata: { appwrite_user_id: user.$id },
          idempotency_key: `create_customer_${user.$id}`,
        },
        log,
        error
      );
      stripeCustomerId = created.customer.id;
    }

    await databases.updateDocument(
      env.APPWRITE_DATABASE_ID,
      accountsCollectionId,
      accountDoc.$id,
      { stripe_customer_id: stripeCustomerId }
    );
  }

  if (!skipDefaultSubscription && defaultPriceId) {
    const subs = await callStripeGateway(
      "list-subscriptions",
      {
        customer: stripeCustomerId,
        status: "all",
        limit: 1,
      },
      log,
      error
    );
    if (!subs.subscriptions || subs.subscriptions.length === 0) {
      await callStripeGateway(
        "create-subscription",
        {
          customer: stripeCustomerId,
          items: [{ price: defaultPriceId }],
          metadata: { appwrite_user_id: user.$id },
        },
        log,
        error
      );
    }
  }

  return {
    success: true,
    stripe_customer_id: stripeCustomerId,
    message: "Stripe customer ensured",
  };
}

module.exports = { ensureStripeCustomerForUser };
