const sdk = require('node-appwrite');

/**
 * Appwrite + Stripe sync for verified webhook events. Keeps index.js thin.
 */
async function processStripeWebhookEvent({
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
}) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const subscriptionId = session.subscription;

      if (subscriptionId) {
        try {
          const subscriptionResult = await callStripeGateway(
            'get-subscription',
            { subscriptionId },
            log,
            error
          );

          const subscription = subscriptionResult.subscription;
          const userId = subscription.metadata?.appwrite_user_id;
          const productLabel = subscription.metadata?.product_label;

          log('Subscription metadata - userId: ' + userId + ', productLabel: ' + productLabel);

          if (userId && productLabel) {
            try {
              const user = await users.get(userId);
              const currentLabels = user.labels || [];
              const adminLabels = currentLabels.filter((l) => l.toLowerCase() === 'admin');
              const updatedLabels = [...adminLabels, productLabel];

              await users.updateLabels(userId, updatedLabels);
              log('Set Stripe product label for user: ' + userId + ', label: ' + productLabel);

              try {
                const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
                  sdk.Query.equal('user_id', userId),
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
                  log('Updated accounts.current_plan_id to ' + productLabel + ' for user ' + userId);
                } else {
                  log('Warning: No accounts document found for user ' + userId);
                }
              } catch (accountErr) {
                error('Failed to update accounts.current_plan_id: ' + accountErr.message);
              }

              try {
                const priceId = subscription.items.data[0]?.price?.id;

                let priceData = null;
                let productData = null;

                if (priceId) {
                  const priceResult = await callStripeGateway('get-price', { priceId }, log, error);
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

                const existingDocs = await databases.listDocuments(DATABASE_ID, SUBSCRIPTIONS_COLLECTION_ID, [
                  sdk.Query.equal('stripe_subscription_id', subscription.id),
                  sdk.Query.limit(1),
                ]);

                if (existingDocs.documents && existingDocs.documents.length > 0) {
                  await databases.updateDocument(
                    DATABASE_ID,
                    SUBSCRIPTIONS_COLLECTION_ID,
                    existingDocs.documents[0].$id,
                    subscriptionData
                  );
                  log('Updated subscription document for user ' + userId);
                } else {
                  await databases.createDocument(
                    DATABASE_ID,
                    SUBSCRIPTIONS_COLLECTION_ID,
                    sdk.ID.unique(),
                    subscriptionData
                  );
                  log('Created subscription document for user ' + userId);
                }
              } catch (subErr) {
                error('Failed to sync subscription to collection: ' + subErr.message);
              }
            } catch (e) {
              error('Failed to set product label for user ' + userId + ': ' + e.message);
            }
          } else {
            log('Warning: Missing userId or productLabel in subscription metadata');
          }
        } catch (e) {
          error('Failed to retrieve subscription: ' + e.message);
        }
      }

      log('Checkout session completed:', session.id);
      break;
    }

    case 'invoice.paid':
      log('Invoice paid:', event.data.object.id);
      break;

    case 'customer.subscription.updated': {
      const updatedSubscription = event.data.object;
      const updatedUserId = updatedSubscription.metadata?.appwrite_user_id;
      const updatedProductLabel = updatedSubscription.metadata?.product_label;

      if (updatedUserId) {
        try {
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
            const priceResult = await callStripeGateway('get-price', { priceId }, log, error);
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
            sdk.Query.equal('stripe_subscription_id', updatedSubscription.id),
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
              'Updated subscription document for user ' +
                updatedUserId +
                ' - status: ' +
                fullSubscription.status
            );
          }

          if (updatedProductLabel) {
            try {
              const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
                sdk.Query.equal('user_id', updatedUserId),
                sdk.Query.limit(1),
              ]);
              if (accountDocs.documents?.length > 0) {
                await databases.updateDocument(
                  DATABASE_ID,
                  ACCOUNTS_COLLECTION_ID,
                  accountDocs.documents[0].$id,
                  {
                    current_plan_id: updatedProductLabel,
                    stripe_customer_id: fullSubscription.customer,
                  }
                );
              }
            } catch (accountErr) {
              error('Failed to update accounts during subscription.updated: ' + accountErr.message);
            }
          }
        } catch (e) {
          error('Failed to update subscription in collection: ' + e.message);
        }
      }

      log('Subscription updated:', updatedSubscription.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const deletedUserId = subscription.metadata?.appwrite_user_id;

      if (deletedUserId) {
        try {
          const user = await users.get(deletedUserId);
          const currentLabels = user.labels || [];
          const adminLabels = currentLabels.filter((l) => l.toLowerCase() === 'admin');
          await users.updateLabels(deletedUserId, adminLabels);
          log('Removed subscription labels from user: ' + deletedUserId);

          try {
            const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
              sdk.Query.equal('user_id', deletedUserId),
              sdk.Query.limit(1),
            ]);

            if (accountDocs.documents && accountDocs.documents.length > 0) {
              await databases.updateDocument(DATABASE_ID, ACCOUNTS_COLLECTION_ID, accountDocs.documents[0].$id, {
                current_plan_id: null,
              });
              log('Cleared accounts.current_plan_id for user ' + deletedUserId);
            }
          } catch (accountErr) {
            error('Failed to clear accounts.current_plan_id: ' + accountErr.message);
          }
        } catch (e) {
          error('Failed to remove subscription labels from user ' + deletedUserId + ': ' + e.message);
        }
      }

      log('Subscription deleted:', subscription.id);
      break;
    }

    default:
      log('Unhandled event type:', event.type);
  }

  return res.json({ success: true });
}

module.exports = { processStripeWebhookEvent };
