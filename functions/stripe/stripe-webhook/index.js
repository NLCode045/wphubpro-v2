// Stripe Webhook Handler for Appwrite Function
const sdk = require("node-appwrite");

/**
 * Call stripe-gateway with given action and payload
 */
async function callStripeGateway(action, payload, log, error) {
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

  const gatewayClient = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const functions = new sdk.Functions(gatewayClient);
  const gatewayFunctionId = process.env.STRIPE_GATEWAY_FUNCTION_ID || 'stripe-gateway';

  try {
    const response = await functions.createExecution(
      gatewayFunctionId,
      JSON.stringify({ action, payload }),
      true
    );

    if (!response.responseBody) {
      throw new Error('No response from stripe-gateway');
    }

    const result = typeof response.responseBody === 'string'
      ? JSON.parse(response.responseBody)
      : response.responseBody;

    if (!result.success) {
      throw new Error(result.message || 'Gateway operation failed');
    }

    return result;
  } catch (err) {
    error(`stripe-gateway call failed: ${err.message}`);
    throw err;
  }
}

/**
 * Expects stripe-gateway to provide webhook verification
 */
module.exports = async ({ req, res, log, error }) => {
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

  // Verify webhook signature via stripe-gateway
  let verificationResult;
  try {
    const sig = req.headers["stripe-signature"];
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(req.body || "", "utf8");

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
    error("Webhook signature verification failed: " + err.message);
    return res.json({ success: false, message: "Webhook signature verification failed" }, 400);
  }

  const event = verificationResult.event;
  if (!event) {
    error("No event data from webhook verification");
    return res.json({ success: false, message: "Invalid webhook event" }, 400);
  }

  // Setup Appwrite clients for database updates
  const client = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  const users = new sdk.Users(client);
  const databases = new sdk.Databases(client);

  // Handle event types
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const subscriptionId = session.subscription;

        if (subscriptionId) {
          try {
            // Get subscription details via gateway
            const subscriptionResult = await callStripeGateway(
              'get-subscription',
              { subscriptionId },
              log,
              error
            );

            const subscription = subscriptionResult.subscription;
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
                  
                  let priceData = null;
                  let productData = null;

                  if (priceId) {
                    const priceResult = await callStripeGateway(
                      'get-price',
                      { priceId },
                      log,
                      error
                    );
                    priceData = priceResult.price;

                    if (priceData?.product) {
                      const productResult = await callStripeGateway(
                        'get-product',
                        { productId: priceData.product },
                        log,
                        error
                      );
                      productData = productResult.product;
                    }
                  }

                  const docMetadata = Object.assign(
                    {},
                    productData?.metadata || {},
                    subscription.metadata || {},
                    { product_label: productLabel }
                  );

                  const subscriptionData = {
                    user_id: userId,
                    user_name: user.name || null,
                    user_email: user.email || null,
                    plan_id: productData?.id || null,
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
            // Get subscription details via gateway to get price and product
            const subscriptionDetails = await callStripeGateway(
              'get-subscription',
              { subscriptionId: updatedSubscription.id },
              log,
              error
            );

            const fullSubscription = subscriptionDetails.subscription;
            const priceId = fullSubscription.items.data[0]?.price?.id;

            let priceData = null;
            let productData = null;

            if (priceId) {
              const priceResult = await callStripeGateway(
                'get-price',
                { priceId },
                log,
                error
              );
              priceData = priceResult.price;

              if (priceData?.product) {
                const productResult = await callStripeGateway(
                  'get-product',
                  { productId: priceData.product },
                  log,
                  error
                );
                productData = productResult.product;
              }
            }

            const subscriptionData = {
              plan_id: productData?.id || null,
              plan_label: updatedProductLabel || null,
              stripe_customer_id: fullSubscription.customer,
              stripe_subscription_id: fullSubscription.id,
              status: fullSubscription.status,
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
                  fullSubscription.status
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
                    stripe_customer_id: fullSubscription.customer,
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
