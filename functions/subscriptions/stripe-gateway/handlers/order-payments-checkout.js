const sdk = require('node-appwrite');
const { success, fail } = require('../lib/responses');
const { buildPaymentFromSubscription } = require('./lib/buildPaymentFromSubscription');

module.exports = async function orderPaymentsCheckout(ctx) {
  const { stripe, res, log, error, databases } = ctx;
  const payload = ctx.payload || {};

  const DATABASE_ID =
    process.env.APPWRITE_DATABASE_ID || process.env.DATABASE_ID || 'platform_db';
  const ACCOUNTS_COLLECTION_ID =
    process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || process.env.ACCOUNTS_COLLECTION_ID || 'accounts';

  const { priceId, returnUrl, updateType, paymentMethodId, userId } = payload;

  if (!userId) {
    return fail(res, 'userId is required', 400);
  }
  if (!priceId) {
    return fail(res, 'priceId is required', 400);
  }

  if (returnUrl) {
    log('Client returnUrl (informational): ' + returnUrl);
  }

  const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
    sdk.Query.equal('user_id', userId),
  ]);

  if (accountDocs.total === 0) {
    return fail(res, 'No account found. Set up billing first.', 404);
  }

  const stripeCustomerId = accountDocs.documents[0].stripe_customer_id;
  if (!stripeCustomerId) {
    return fail(res, 'Stripe customer ID not configured. Set up billing first.', 404);
  }

  log('Found Stripe customer: ' + stripeCustomerId);

  async function assertPaymentMethodBelongsToCustomer(pmId) {
    const pm = await stripe.paymentMethods.retrieve(pmId);
    if (pm.customer !== stripeCustomerId) {
      throw new Error('Payment method does not belong to this customer');
    }
  }

  if (paymentMethodId) {
    try {
      await assertPaymentMethodBelongsToCustomer(paymentMethodId);
    } catch (pmErr) {
      error('Invalid paymentMethodId: ' + (pmErr.message || pmErr));
      return fail(res, pmErr.message || 'Invalid payment method', 400);
    }
  }

  const subscriptionsList = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    limit: 10,
  });
  const activeSubscription = (subscriptionsList.data || []).find(
    (s) => s.status && s.status !== 'canceled' && s.status !== 'incomplete_expired'
  );

  const price = await stripe.prices.retrieve(priceId);
  const product = await stripe.products.retrieve(price.product);
  const productLabel = product.metadata?.label || null;

  log('Product label from metadata: ' + productLabel);

  if (!productLabel) {
    return fail(res, 'Product configuration error. Please contact support.', 400);
  }

  if (activeSubscription) {
    log('User has active subscription: ' + activeSubscription.id + '. Attempting in-place update...');

    const existingItem =
      activeSubscription.items &&
      activeSubscription.items.data &&
      activeSubscription.items.data[0];
    if (!existingItem) {
      return fail(res, 'Your subscription has no billable items. Contact support.', 400);
    }

    if (existingItem.price && existingItem.price.id === priceId) {
      log('Selected price is same as current price, returning existing subscription info');
      return success(res, {
        subscriptionId: activeSubscription.id,
        status: activeSubscription.status,
        message: 'Already on selected plan',
        url: null,
        payment: null,
      });
    }

    const getMonthlyCost = (p) => {
      if (!p || !p.unit_amount) return 0;
      let divisor = 1;
      if (p.recurring) {
        if (p.recurring.interval === 'year') divisor = 12;
        if (p.recurring.interval === 'month') divisor = 1;
        divisor = divisor * (p.recurring.interval_count || 1);
      }
      return p.unit_amount / divisor;
    };

    const currentCost = getMonthlyCost(existingItem.price);
    const newCost = getMonthlyCost(price);
    const isDowngrade = newCost < currentCost && price.currency === existingItem.price.currency;

    log(`Plan Change Check: Current ${currentCost} vs New ${newCost}. Is Downgrade? ${isDowngrade}`);

    try {
      let updated;

      if (updateType === 'downgrade' || isDowngrade) {
        log('Processing downgrade (scheduling for period end)...');

        let scheduleId = activeSubscription.schedule;
        if (!scheduleId) {
          const schedule = await stripe.subscriptionSchedules.create({
            from_subscription: activeSubscription.id,
          });
          scheduleId = schedule.id;
          log('Created subscription schedule: ' + scheduleId);
        }

        const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
        const currentPhase = schedule.phases[0];

        const currentItems = currentPhase.items.map((item) => ({
          price: item.price,
          quantity: item.quantity,
        }));

        const periodEnd = activeSubscription.current_period_end || currentPhase.end_date;
        if (!periodEnd) {
          throw new Error('Missing current_period_end for downgrade scheduling');
        }

        await stripe.subscriptionSchedules.update(scheduleId, {
          end_behavior: 'release',
          phases: [
            {
              start_date: currentPhase.start_date,
              end_date: periodEnd,
              items: currentItems,
            },
            {
              start_date: periodEnd,
              items: [{ price: priceId, quantity: 1 }],
              metadata: { product_label: productLabel },
            },
          ],
        });

        log('Schedule updated with new phase');
        updated = await stripe.subscriptions.retrieve(activeSubscription.id);
        return success(res, {
          subscriptionId: updated.id,
          status: updated.status,
          url: null,
          payment: null,
          message: 'Plan change scheduled for next billing period',
        });
      }

      log('Processing upgrade (immediate with proration)...');
      const upgradeParams = {
        proration_behavior: 'always_invoice',
        items: [
          {
            id: existingItem.id,
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: Object.assign({}, activeSubscription.metadata || {}, {
          product_label: productLabel,
          appwrite_user_id: userId,
        }),
      };
      if (paymentMethodId) {
        upgradeParams.default_payment_method = paymentMethodId;
      }
      updated = await stripe.subscriptions.update(activeSubscription.id, upgradeParams);
      log('Subscription updated in-place: ' + updated.id);

      const { payment } = await buildPaymentFromSubscription(stripe, updated.id);
      return success(res, {
        subscriptionId: updated.id,
        status: updated.status,
        url: null,
        payment,
        message: payment ? 'Confirm payment to complete upgrade' : undefined,
      });
    } catch (updateErr) {
      error('Failed to update subscription in-place: ' + (updateErr.message || updateErr));
      return fail(res, updateErr.message || 'Could not update subscription', 500);
    }
  }

  log('No active subscription — creating subscription (in-app payment flow)...');
  const createParams = {
    customer: stripeCustomerId,
    items: [{ price: priceId, quantity: 1 }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      appwrite_user_id: userId,
      product_label: productLabel,
    },
  };
  if (paymentMethodId) {
    createParams.default_payment_method = paymentMethodId;
  }
  const created = await stripe.subscriptions.create(createParams);

  const { payment } = await buildPaymentFromSubscription(stripe, created.id);

  if (payment) {
    log('New subscription requires payment confirmation: ' + created.id);
    return success(res, {
      subscriptionId: created.id,
      status: created.status,
      url: null,
      payment,
      message: 'Confirm payment to start your subscription',
    });
  }

  const refreshed = await stripe.subscriptions.retrieve(created.id);
  if (refreshed.status === 'active' || refreshed.status === 'trialing') {
    return success(res, {
      subscriptionId: refreshed.id,
      status: refreshed.status,
      url: null,
      payment: null,
    });
  }

  try {
    await stripe.subscriptions.cancel(created.id);
  } catch (cancelErr) {
    log('Could not cancel incomplete subscription: ' + (cancelErr.message || cancelErr));
  }
  error('Incomplete subscription without confirmable payment intent');
  return fail(
    res,
    'Could not start in-app payment for this plan. Add a default payment method or contact support.',
    502
  );
};
