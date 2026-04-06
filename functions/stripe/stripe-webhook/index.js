// Stripe Webhook Handler for Appwrite Function
const Stripe = require("stripe");
const sdk = require("node-appwrite");
const { getConnectorCredentials } = require("../_shared/vault-client.js");

/**
 * Expects vault to contain STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY
 */
module.exports = async ({ req, res, log, error }) => {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  const VAULT_DB_ID = process.env.VAULT_DB_ID || "69d2ecf3000f449c752f";
  const APPWRITE_ENDPOINT =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const APPWRITE_PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const APPWRITE_API_KEY =
    process.env.APPWRITE_API_KEY ||
    process.env.APPWRITE_FUNCTION_API_KEY ||
    process.env.APPWRITE_KEY;
  const DATABASE_ID = process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "platform_db";
  const ACCOUNTS_COLLECTION_ID =
    process.env.ACCOUNTS_COLLECTION_ID || process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || "accounts";
  const SUBSCRIPTIONS_COLLECTION_ID =
    process.env.SUBSCRIPTIONS_COLLECTION_ID || process.env.APPWRITE_SUBSCRIPTIONS_COLLECTION_ID || "subscriptions";

  if (!ENCRYPTION_KEY) {
    error("ENCRYPTION_KEY not configured");
    return res.json({ success: false, message: "ENCRYPTION_KEY not configured" }, 500);
  }

  let stripeCredentials;
  try {
    const adminClient = new sdk.Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);
    const databases = new sdk.Databases(adminClient);

    stripeCredentials = await getConnectorCredentials("stripe", ENCRYPTION_KEY, databases, VAULT_DB_ID);
    if (!stripeCredentials || !stripeCredentials.STRIPE_SECRET_KEY || !stripeCredentials.STRIPE_WEBHOOK_SECRET) {
      error("Stripe credentials not found in vault");
      return res.json({ success: false, message: "Stripe credentials not configured" }, 500);
    }
  } catch (err) {
    error("Failed to retrieve Stripe credentials: " + err.message);
    return res.json({ success: false, message: "Failed to retrieve credentials" }, 500);
  }

  const STRIPE_SECRET_KEY = stripeCredentials.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = stripeCredentials.STRIPE_WEBHOOK_SECRET;

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    error("Stripe secret or webhook secret missing in vault");
    return res.json({ success: false, message: "Stripe secret or webhook secret missing" }, 500);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);

  // Setup Appwrite clients
  const client = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  const users = new sdk.Users(client);
  const databases = new sdk.Databases(client);

  let event;
  try {
    // Appwrite passes raw body as req.body (Buffer or string)
    const sig = req.headers["stripe-signature"];
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(req.body || "", "utf8");
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    error("Webhook signature verification failed: " + err.message);
    return res.json({ success: false, message: "Webhook signature verification failed" }, 400);
  }

  // Handle event types
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        // Get the subscription ID from the session
        const subscriptionId = session.subscription;

        if (subscriptionId) {
          try {
            // Fetch the subscription to get the metadata
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const userId = subscription.metadata?.appwrite_user_id;
            const productLabel = subscription.metadata?.product_label;

            log("Subscription metadata - userId: " + userId + ", productLabel: " + productLabel);

            if (userId && productLabel) {
              try {
                // Get current user to read existing labels
                const user = await users.get(userId);
                const currentLabels = user.labels || [];

                // Keep admin label, replace everything else with product label
                const adminLabels = currentLabels.filter((l) => l.toLowerCase() === "admin");
                const updatedLabels = [...adminLabels, productLabel];

                // Update user with Stripe product label
                await users.updateLabels(userId, updatedLabels);
                log("Set Stripe product label for user: " + userId + ", label: " + productLabel);

                // Update accounts.current_plan_id with product label
                try {
                  const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
                    sdk.Query.equal("user_id", userId),
                    sdk.Query.limit(1),
                  ]);

                  if (accountDocs.documents && accountDocs.documents.length > 0) {
                    await databases.updateDocument(
                      DATABASE_ID,
                      ACCOUNTS_COLLECTION_ID,
                      accountDocs.documents[0].$id,
                      {
                        current_plan_id: productLabel,
                        stripe_customer_id: subscription.customer,
                      }
                    );
                    log(
                      "Updated accounts.current_plan_id to " + productLabel + " for user " + userId
                    );
                  } else {
                    log("Warning: No accounts document found for user " + userId);
                  }
                } catch (accountErr) {
                  error("Failed to update accounts.current_plan_id: " + accountErr.message);
                }

                // Sync subscription to subscriptions collection
                try {
                  const priceId = subscription.items.data[0]?.price?.id;
                  const price = priceId ? await stripe.prices.retrieve(priceId) : null;
                  const product = price ? await stripe.products.retrieve(price.product) : null;

                  const docMetadata = Object.assign(
                    {},
                    product?.metadata || {},
                    subscription.metadata || {},
                    { product_label: productLabel }
                  );

                  const subscriptionData = {
                    user_id: userId,
                    user_name: user.name || null,
                    user_email: user.email || null,
                    plan_id: product?.id || null,
                    plan_price: priceId || null,
                    plan_label: productLabel,
                    stripe_customer_id: subscription.customer,
                    stripe_subscription_id: subscription.id,
                    status: subscription.status,
                    billing_start_date: subscription.current_period_start
                      ? subscription.current_period_start.toString()
                      : null,
                    billing_end_date: subscription.current_period_end
                      ? subscription.current_period_end.toString()
                      : null,
                    billing_never: subscription.cancel_at_period_end || false,
                    metadata: JSON.stringify(docMetadata),
                    updated_at: new Date().toISOString(),
                  };

                  // Check if subscription document exists (prefer stripe_subscription_id to prevent duplicates)
                  const existingDocs = await databases.listDocuments(DATABASE_ID, SUBSCRIPTIONS_COLLECTION_ID, [
                    sdk.Query.equal("stripe_subscription_id", subscription.id),
                    sdk.Query.limit(1),
                  ]);

                  if (existingDocs.documents && existingDocs.documents.length > 0) {
                    // Update existing
                    await databases.updateDocument(
                      DATABASE_ID,
                      SUBSCRIPTIONS_COLLECTION_ID,
                      existingDocs.documents[0].$id,
                      subscriptionData
                    );
                    log("Updated subscription document for user " + userId);
                  } else {
                    // Create new
                    await databases.createDocument(
                      DATABASE_ID,
                      SUBSCRIPTIONS_COLLECTION_ID,
                      sdk.ID.unique(),
                      subscriptionData
                    );
                    log("Created subscription document for user " + userId);
                  }
                } catch (subErr) {
                  error("Failed to sync subscription to collection: " + subErr.message);
                }
              } catch (e) {
                error("Failed to set product label for user " + userId + ": " + e.message);
              }
            } else {
              log("Warning: Missing userId or productLabel in subscription metadata");
            }
          } catch (e) {
            error("Failed to retrieve subscription: " + e.message);
          }
        }

        log("Checkout session completed:", session.id);
        break;
      }

      case "invoice.paid":
        log("Invoice paid:", event.data.object.id);
        break;

      case "customer.subscription.updated": {
        const updatedSubscription = event.data.object;
        const updatedUserId = updatedSubscription.metadata?.appwrite_user_id;
        const updatedProductLabel = updatedSubscription.metadata?.product_label;

        if (updatedUserId) {
          try {
            // Sync updated subscription data
            const priceId = updatedSubscription.items.data[0]?.price?.id;
            const price = priceId ? await stripe.prices.retrieve(priceId) : null;
            const product = price ? await stripe.products.retrieve(price.product) : null;

            const subscriptionData = {
              plan_id: product?.id || null,
              plan_label: updatedProductLabel || null,
              stripe_customer_id: updatedSubscription.customer,
              stripe_subscription_id: updatedSubscription.id,
              status: updatedSubscription.status,
              updated_at: new Date().toISOString(),
            };

            const existingDocs = await databases.listDocuments(DATABASE_ID, SUBSCRIPTIONS_COLLECTION_ID, [
              sdk.Query.equal("stripe_subscription_id", updatedSubscription.id),
              sdk.Query.limit(1),
            ]);

            if (existingDocs.documents && existingDocs.documents.length > 0) {
              await databases.updateDocument(
                DATABASE_ID,
                SUBSCRIPTIONS_COLLECTION_ID,
                existingDocs.documents[0].$id,
                subscriptionData
              );
              log(
                "Updated subscription document for user " +
                  updatedUserId +
                  " - status: " +
                  updatedSubscription.status
              );
            }

            // Keep accounts.current_plan_id aligned when label present
            if (updatedProductLabel) {
              try {
                const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
                  sdk.Query.equal("user_id", updatedUserId),
                  sdk.Query.limit(1),
                ]);
                if (accountDocs.documents?.length > 0) {
                  await databases.updateDocument(DATABASE_ID, ACCOUNTS_COLLECTION_ID, accountDocs.documents[0].$id, {
                    current_plan_id: updatedProductLabel,
                    stripe_customer_id: updatedSubscription.customer,
                  });
                }
              } catch (accountErr) {
                error("Failed to update accounts during subscription.updated: " + accountErr.message);
              }
            }
          } catch (e) {
            error("Failed to update subscription in collection: " + e.message);
          }
        }

        log("Subscription updated:", updatedSubscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const deletedUserId = subscription.metadata?.appwrite_user_id;

        if (deletedUserId) {
          try {
            // Get current user to read existing labels
            const user = await users.get(deletedUserId);
            const currentLabels = user.labels || [];

            // Keep only admin label, remove all others (including Stripe price ID)
            const adminLabels = currentLabels.filter((l) => l.toLowerCase() === "admin");
            await users.updateLabels(deletedUserId, adminLabels);
            log("Removed subscription labels from user: " + deletedUserId);

            // Clear accounts.current_plan_id
            try {
              const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
                sdk.Query.equal("user_id", deletedUserId),
                sdk.Query.limit(1),
              ]);

              if (accountDocs.documents && accountDocs.documents.length > 0) {
                await databases.updateDocument(
                  DATABASE_ID,
                  ACCOUNTS_COLLECTION_ID,
                  accountDocs.documents[0].$id,
                  { current_plan_id: null }
                );
                log("Cleared accounts.current_plan_id for user " + deletedUserId);
              }
            } catch (accountErr) {
              error("Failed to clear accounts.current_plan_id: " + accountErr.message);
            }
          } catch (e) {
            error(
              "Failed to remove subscription labels from user " + deletedUserId + ": " + e.message
            );
          }
        }

        log("Subscription deleted:", subscription.id);
        break;
      }

      default:
        log("Unhandled event type:", event.type);
    }
    return res.json({ success: true });
  } catch (err) {
    error("Webhook handler error: " + err.message);
    return res.json({ success: false, message: "Webhook handler error" }, 500);
  }
};
