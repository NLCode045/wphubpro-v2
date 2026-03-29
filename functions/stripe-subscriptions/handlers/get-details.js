const sdk = require("node-appwrite");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

function parsePayload(req, payloadFromIndex) {
  if (payloadFromIndex && typeof payloadFromIndex === "object") return payloadFromIndex;
  try {
    if (req.body && typeof req.body === "object") return req.body;
    if (req.body && typeof req.body === "string") return JSON.parse(req.body || "{}");
    if (req.payload && typeof req.payload === "object") return req.payload;
    if (req.payload && typeof req.payload === "string") return JSON.parse(req.payload || "{}");
  } catch (e) {}
  return {};
}

/**
 * Get detailed subscription data from Stripe
 * Including subscription, customer, invoices, and payment methods
 * Verifies the subscription belongs to the authenticated user before returning.
 */
module.exports = async ({ req, res, log, error, payload: payloadFromIndex }) => {
  const {
    STRIPE_SECRET_KEY,
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY,
    APPWRITE_DATABASE_ID,
    APPWRITE_ACCOUNTS_COLLECTION_ID,
  } = process.env;

  if (!STRIPE_SECRET_KEY) {
    error("Missing STRIPE_SECRET_KEY");
    return res.json({ error: "Missing required environment variables" }, 500);
  }

  try {
    const payload = parsePayload(req, payloadFromIndex);
    const { subscriptionId } = payload;

    if (!subscriptionId) {
      return res.json({ error: "subscriptionId is required" }, 400);
    }

    const userId =
      process.env.APPWRITE_FUNCTION_USER_ID || req.headers?.["x-appwrite-user-id"];
    if (!userId) {
      error("No user ID found. User must be authenticated.");
      return res.json({ error: "User not authenticated." }, 401);
    }

    log("Fetching subscription details for: " + subscriptionId + " (user: " + userId + ")");

    // Fetch subscription with expanded data
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice", "customer", "default_payment_method", "schedule"],
    });

    // Verify ownership: subscription must belong to the authenticated user's Stripe customer
    const subscriptionCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

    const DATABASE_ID = APPWRITE_DATABASE_ID || process.env.DATABASE_ID;
    const ACCOUNTS_COLLECTION_ID =
      APPWRITE_ACCOUNTS_COLLECTION_ID || process.env.ACCOUNTS_COLLECTION_ID;

    if (
      APPWRITE_ENDPOINT &&
      APPWRITE_PROJECT_ID &&
      APPWRITE_API_KEY &&
      DATABASE_ID &&
      ACCOUNTS_COLLECTION_ID
    ) {
      const client = new sdk.Client();
      const databases = new sdk.Databases(client);
      client
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setKey(APPWRITE_API_KEY);

      const accountDocs = await databases.listDocuments(
        DATABASE_ID,
        ACCOUNTS_COLLECTION_ID,
        [sdk.Query.equal("user_id", userId), sdk.Query.limit(1)]
      );

      if (accountDocs.total === 0 || !accountDocs.documents[0]?.stripe_customer_id) {
        log("No account or stripe_customer_id for user " + userId);
        return res.json({ error: "Subscription not found for your account." }, 404);
      }

      const userStripeCustomerId = accountDocs.documents[0].stripe_customer_id;
      if (subscriptionCustomerId !== userStripeCustomerId) {
        error(
          "Subscription " +
            subscriptionId +
            " belongs to customer " +
            subscriptionCustomerId +
            " but user " +
            userId +
            " has customer " +
            userStripeCustomerId
        );
        return res.json(
          { error: "This subscription does not belong to your account." },
          403
        );
      }
    } else {
      log("Skipping ownership verification (missing env vars)");
    }

    // Fetch all invoices for this subscription
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      limit: 100,
    });

    // Fetch price and product details
    const priceId = subscription.items.data[0]?.price?.id;
    const price = priceId ? await stripe.prices.retrieve(priceId) : null;
    const product = price ? await stripe.products.retrieve(price.product) : null;

    // Fetch upcoming invoice if subscription is active
    let upcomingInvoice = null;
    if (subscription.status === "active" || subscription.status === "trialing") {
      try {
        upcomingInvoice = await stripe.invoices.retrieveUpcoming({
          subscription: subscriptionId,
        });
      } catch (e) {
        log("No upcoming invoice: " + e.message);
      }
    }

    // Check for pending updates via Schedule
    let pendingUpdate = null;
    if (subscription.schedule) {
      const schedule =
        typeof subscription.schedule === "object"
          ? subscription.schedule
          : await stripe.subscriptionSchedules.retrieve(subscription.schedule);

      // Look for future phases
      // Simplistic approach: if phases.length > 1, the next one is the update.
      if (schedule.phases && schedule.phases.length > 1) {
        // Find the phase that matches current active period? No, subscription object IS the current phase instantiation.
        // The schedule phases list ALL phases.
        // We want the one starting AFTER the current period end.
        const nextPhase = schedule.phases.find(
          (p) => p.start_date >= subscription.current_period_end
        );

        if (nextPhase) {
          const nextPriceId = nextPhase.items[0]?.price;
          // If next price is different from current
          if (nextPriceId && nextPriceId !== priceId) {
            // Fetch next product details
            try {
              const nextPrice =
                typeof nextPriceId === "string"
                  ? await stripe.prices.retrieve(nextPriceId)
                  : nextPriceId;
              const nextProduct = await stripe.products.retrieve(nextPrice.product);

              pendingUpdate = {
                date: nextPhase.start_date,
                plan_name: nextProduct.name,
                price_amount: nextPrice.unit_amount,
                currency: nextPrice.currency,
                interval: nextPrice.recurring?.interval,
                schedule_id: schedule.id,
              };
            } catch (e) {
              log("Error fetching pending update details: " + e.message);
            }
          }
        }
      }
    }

    // Build response
    const response = {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        created: subscription.created,
        start_date: subscription.start_date,
        cancel_at: subscription.cancel_at,
        canceled_at: subscription.canceled_at,
        ended_at: subscription.ended_at,
        trial_start: subscription.trial_start,
        trial_end: subscription.trial_end,
        metadata: subscription.metadata,
        collection_method: subscription.collection_method,
        days_until_due: subscription.days_until_due,
      },
      customer: {
        id: subscription.customer?.id || subscription.customer,
        email: subscription.customer?.email || null,
        name: subscription.customer?.name || null,
        phone: subscription.customer?.phone || null,
        address: subscription.customer?.address || null,
        created: subscription.customer?.created || null,
        balance: subscription.customer?.balance || 0,
        currency: subscription.customer?.currency || null,
      },
      plan: {
        product_id: product?.id || null,
        product_name: product?.name || null,
        product_description: product?.description || null,
        price_id: price?.id || null,
        unit_amount: price?.unit_amount || null,
        currency: price?.currency || null,
        interval: price?.recurring?.interval || null,
        interval_count: price?.recurring?.interval_count || null,
        metadata: product?.metadata || {},
        limits: {
          sites_limit: product?.metadata?.sites_limit
            ? parseInt(product.metadata.sites_limit, 10)
            : null,
          library_limit: product?.metadata?.library_limit
            ? parseInt(product.metadata.library_limit, 10)
            : null,
          storage_limit: product?.metadata?.storage_limit
            ? parseInt(product.metadata.storage_limit, 10)
            : null,
        },
      },
      pending_update: pendingUpdate,
      invoices: invoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount_due: inv.amount_due,
        amount_paid: inv.amount_paid,
        amount_remaining: inv.amount_remaining,
        currency: inv.currency,
        created: inv.created,
        due_date: inv.due_date,
        period_start: inv.period_start,
        period_end: inv.period_end,
        invoice_pdf: inv.invoice_pdf,
        hosted_invoice_url: inv.hosted_invoice_url,
        paid: inv.paid,
      })),
      upcoming_invoice: upcomingInvoice
        ? {
            amount_due: upcomingInvoice.amount_due,
            currency: upcomingInvoice.currency,
            period_start: upcomingInvoice.period_start,
            period_end: upcomingInvoice.period_end,
            next_payment_attempt: upcomingInvoice.next_payment_attempt,
          }
        : null,
      payment_method: subscription.default_payment_method
        ? {
            id: subscription.default_payment_method.id,
            type: subscription.default_payment_method.type,
            card: subscription.default_payment_method.card
              ? {
                  brand: subscription.default_payment_method.card.brand,
                  last4: subscription.default_payment_method.card.last4,
                  exp_month: subscription.default_payment_method.card.exp_month,
                  exp_year: subscription.default_payment_method.card.exp_year,
                }
              : null,
          }
        : null,
    };

    log("Successfully fetched subscription details");
    return res.json(response, 200);
  } catch (e) {
    error("Error fetching subscription details: " + e.message);
    return res.json({ error: e.message }, e.statusCode || 500);
  }
};
