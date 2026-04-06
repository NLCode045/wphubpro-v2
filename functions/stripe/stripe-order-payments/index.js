const sdk = require("node-appwrite");
const StripeLib = require("stripe");

/**
 * After subscription create/update, return Payment Element payload when user must confirm.
 */
async function buildPaymentFromSubscriptionId(stripeClient, subscriptionId) {
  let sub = await stripeClient.subscriptions.retrieve(subscriptionId, {
    expand: ["latest_invoice.payment_intent"],
  });
  let inv = sub.latest_invoice;
  if (!inv) {
    return { payment: null };
  }
  if (typeof inv === "string") {
    inv = await stripeClient.invoices.retrieve(inv, { expand: ["payment_intent"] });
  }
  if (inv.status === "draft") {
    inv = await stripeClient.invoices.finalizeInvoice(inv.id, { expand: ["payment_intent"] });
  }
  if (inv.status === "paid" || (inv.amount_due || 0) <= 0) {
    return { payment: null };
  }
  const pi = inv.payment_intent;
  if (!pi) {
    return { payment: null };
  }
  const piObj = typeof pi === "string" ? await stripeClient.paymentIntents.retrieve(pi) : pi;
  if (piObj.status === "succeeded") {
    return { payment: null };
  }
  const needsConfirm = [
    "requires_payment_method",
    "requires_action",
    "requires_confirmation",
    "requires_capture",
  ].includes(piObj.status);
  if (needsConfirm && piObj.client_secret) {
    return {
      payment: {
        clientSecret: piObj.client_secret,
        invoiceId: inv.id,
        amountDue: inv.amount_due,
        currency: inv.currency,
        status: piObj.status,
      },
    };
  }
  return { payment: null };
}

module.exports = async ({ req, res, log, error }) => {
  const env = {
    ...process.env,
    ...(req?.variables && typeof req.variables === "object" ? req.variables : {}),
  };
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
  const APPWRITE_ENDPOINT =
    env.APPWRITE_ENDPOINT ||
    env.APPWRITE_FUNCTION_ENDPOINT ||
    env.APPWRITE_FUNCTION_API_ENDPOINT;
  const APPWRITE_PROJECT_ID = env.APPWRITE_PROJECT_ID || env.APPWRITE_FUNCTION_PROJECT_ID;
  const APPWRITE_API_KEY =
    env.APPWRITE_API_KEY || env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_KEY;
  const DATABASE_ID_RAW = env.DATABASE_ID;
  const ACCOUNTS_COLLECTION_ID_RAW = env.ACCOUNTS_COLLECTION_ID;

  const DATABASE_ID = DATABASE_ID_RAW || env.APPWRITE_DATABASE_ID || "platform_db";
  const ACCOUNTS_COLLECTION_ID =
    ACCOUNTS_COLLECTION_ID_RAW || env.APPWRITE_ACCOUNTS_COLLECTION_ID || "accounts";

  const missingVars = [];
  if (!APPWRITE_ENDPOINT) missingVars.push("APPWRITE_ENDPOINT");
  if (!APPWRITE_PROJECT_ID) missingVars.push("APPWRITE_PROJECT_ID");
  if (!APPWRITE_API_KEY) missingVars.push("APPWRITE_API_KEY");
  if (!STRIPE_SECRET_KEY) missingVars.push("STRIPE_SECRET_KEY");

  if (missingVars.length > 0) {
    const errorMsg = `Missing environment variables: ${missingVars.join(
      ", "
    )}. See STRIPE_SETUP.md for configuration instructions.`;
    error(errorMsg);
    return res.json({ error: errorMsg }, 500);
  }

  const stripe = new StripeLib(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);

  try {
    let payload = {};

    if (req.body && typeof req.body === "object") {
      payload = req.body;
    } else if (req.bodyRaw) {
      payload = JSON.parse(req.bodyRaw);
    } else if (req.payload) {
      payload = typeof req.payload === "string" ? JSON.parse(req.payload) : req.payload;
    } else {
      error("No payload found in request");
    }

    log("Parsed payload: " + JSON.stringify(payload));

    let userId =
      env.APPWRITE_FUNCTION_USER_ID ||
      req.headers?.["x-appwrite-user-id"] ||
      req.headers?.["X-Appwrite-User-Id"];

    if (!userId) {
      error("No user ID found. User must be authenticated.");
      return res.json(
        {
          error: "User not authenticated. Please log in and try again.",
          hint: "Make sure you are logged in before subscribing to a plan.",
        },
        401
      );
    }

    const user = { $id: userId };
    log("Processing checkout for user: " + user.$id);

    const { priceId, returnUrl, updateType, paymentMethodId } = payload;
    if (!priceId) {
      error("Missing priceId in request payload");
      return res.json({ error: "priceId is required" }, 400);
    }

    async function assertPaymentMethodBelongsToCustomer(pmId) {
      const pm = await stripe.paymentMethods.retrieve(pmId);
      if (pm.customer !== stripeCustomerId) {
        throw new Error("Payment method does not belong to this customer");
      }
    }

    if (returnUrl) {
      log("Client returnUrl (informational): " + returnUrl);
    }

    const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
      sdk.Query.equal("user_id", user.$id),
    ]);

    if (accountDocs.total === 0) {
      error("No account found for user " + user.$id);
      return res.json({ error: "No account found. Set up billing first." }, 404);
    }

    const stripeCustomerId = accountDocs.documents[0].stripe_customer_id;

    if (!stripeCustomerId) {
      error("Account exists but no stripe_customer_id for user " + user.$id);
      return res.json({ error: "Stripe customer ID not configured. Set up billing first." }, 404);
    }

    log("Found Stripe customer: " + stripeCustomerId);

    if (paymentMethodId) {
      try {
        await assertPaymentMethodBelongsToCustomer(paymentMethodId);
      } catch (pmErr) {
        error("Invalid paymentMethodId: " + (pmErr.message || pmErr));
        return res.json(
          { error: pmErr.message || "Invalid payment method", code: "invalid_payment_method" },
          400
        );
      }
    }

    const subscriptionsList = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 10,
    });
    const activeSubscription = (subscriptionsList.data || []).find(
      (s) => s.status && s.status !== "canceled" && s.status !== "incomplete_expired"
    );

    const price = await stripe.prices.retrieve(priceId);
    const product = await stripe.products.retrieve(price.product);
    const productLabel = product.metadata?.label || null;

    log("Product label from metadata: " + productLabel);

    if (!productLabel) {
      error("Product does not have a label in metadata");
      return res.json({ error: "Product configuration error. Please contact support." }, 400);
    }

    if (activeSubscription) {
      log("User has active subscription: " + activeSubscription.id + ". Attempting in-place update...");

      const existingItem =
        activeSubscription.items &&
        activeSubscription.items.data &&
        activeSubscription.items.data[0];
      if (!existingItem) {
        error("No subscription line items on active subscription");
        return res.json(
          { error: "Your subscription has no billable items. Contact support." },
          400
        );
      }

      if (existingItem.price && existingItem.price.id === priceId) {
        log("Selected price is same as current price, returning existing subscription info");
        return res.json({
          subscriptionId: activeSubscription.id,
          status: activeSubscription.status,
          message: "Already on selected plan",
          url: null,
          payment: null,
        });
      }

      const getMonthlyCost = (p) => {
        if (!p || !p.unit_amount) return 0;
        let divisor = 1;
        if (p.recurring) {
          if (p.recurring.interval === "year") divisor = 12;
          if (p.recurring.interval === "month") divisor = 1;
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

        if (updateType === "downgrade" || isDowngrade) {
          log("Processing downgrade (scheduling for period end)...");

          let scheduleId = activeSubscription.schedule;
          if (!scheduleId) {
            const schedule = await stripe.subscriptionSchedules.create({
              from_subscription: activeSubscription.id,
            });
            scheduleId = schedule.id;
            log("Created subscription schedule: " + scheduleId);
          }

          const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
          const currentPhase = schedule.phases[0];

          const currentItems = currentPhase.items.map((item) => ({
            price: item.price,
            quantity: item.quantity,
          }));

          const periodEnd = activeSubscription.current_period_end || currentPhase.end_date;
          if (!periodEnd) {
            throw new Error("Missing current_period_end for downgrade scheduling");
          }

          await stripe.subscriptionSchedules.update(scheduleId, {
            end_behavior: "release",
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

          log("Schedule updated with new phase");
          updated = await stripe.subscriptions.retrieve(activeSubscription.id);
          return res.json({
            subscriptionId: updated.id,
            status: updated.status,
            url: null,
            payment: null,
            message: "Plan change scheduled for next billing period",
          });
        }

        log("Processing upgrade (immediate with proration)...");
        const upgradeParams = {
          proration_behavior: "always_invoice",
          items: [
            {
              id: existingItem.id,
              price: priceId,
              quantity: 1,
            },
          ],
          metadata: Object.assign({}, activeSubscription.metadata || {}, {
            product_label: productLabel,
            appwrite_user_id: user.$id,
          }),
        };
        if (paymentMethodId) {
          upgradeParams.default_payment_method = paymentMethodId;
        }
        updated = await stripe.subscriptions.update(activeSubscription.id, upgradeParams);
        log("Subscription updated in-place: " + updated.id);

        const { payment } = await buildPaymentFromSubscriptionId(stripe, updated.id);
        return res.json({
          subscriptionId: updated.id,
          status: updated.status,
          url: null,
          payment,
          message: payment ? "Confirm payment to complete upgrade" : undefined,
        });
      } catch (updateErr) {
        error("Failed to update subscription in-place: " + (updateErr.message || updateErr));
        return res.json(
          {
            error: updateErr.message || "Could not update subscription",
            code: "subscription_update_failed",
          },
          500
        );
      }
    }

    log("No active subscription — creating subscription (in-app payment flow)...");
    const createParams = {
      customer: stripeCustomerId,
      items: [{ price: priceId, quantity: 1 }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        appwrite_user_id: user.$id,
        product_label: productLabel,
      },
    };
    if (paymentMethodId) {
      createParams.default_payment_method = paymentMethodId;
    }
    const created = await stripe.subscriptions.create(createParams);

    const { payment } = await buildPaymentFromSubscriptionId(stripe, created.id);

    if (payment) {
      log("New subscription requires payment confirmation: " + created.id);
      return res.json({
        subscriptionId: created.id,
        status: created.status,
        url: null,
        payment,
        message: "Confirm payment to start your subscription",
      });
    }

    const refreshed = await stripe.subscriptions.retrieve(created.id);
    if (refreshed.status === "active" || refreshed.status === "trialing") {
      return res.json({
        subscriptionId: refreshed.id,
        status: refreshed.status,
        url: null,
        payment: null,
      });
    }

    try {
      await stripe.subscriptions.cancel(created.id);
    } catch (cancelErr) {
      log("Could not cancel incomplete subscription: " + (cancelErr.message || cancelErr));
    }
    error("Incomplete subscription without confirmable payment intent");
    return res.json(
      {
        error:
          "Could not start in-app payment for this plan. Add a default payment method or contact support.",
        code: "subscription_payment_intent_missing",
      },
      502
    );
  } catch (err) {
    error("Failed to process order payment:", err);
    return res.json(
      {
        error: err.message || "An unexpected error occurred",
        details: err.stack,
      },
      500
    );
  }
};
