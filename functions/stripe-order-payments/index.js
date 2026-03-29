const sdk = require("node-appwrite");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  const {
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY,
    STRIPE_SECRET_KEY,
    DATABASE_ID: DATABASE_ID_RAW,
    ACCOUNTS_COLLECTION_ID: ACCOUNTS_COLLECTION_ID_RAW,
  } = process.env;

  // Defaults for this project (avoid hard failure when not explicitly set in function env)
  const DATABASE_ID = DATABASE_ID_RAW || process.env.APPWRITE_DATABASE_ID || "platform_db";
  const ACCOUNTS_COLLECTION_ID = ACCOUNTS_COLLECTION_ID_RAW || process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || "accounts";

  const missingVars = [];
  if (!APPWRITE_ENDPOINT) missingVars.push("APPWRITE_ENDPOINT");
  if (!APPWRITE_PROJECT_ID) missingVars.push("APPWRITE_PROJECT_ID");
  if (!APPWRITE_API_KEY) missingVars.push("APPWRITE_API_KEY");
  if (!STRIPE_SECRET_KEY) missingVars.push("STRIPE_SECRET_KEY");
  // DATABASE_ID / ACCOUNTS_COLLECTION_ID have safe defaults

  if (missingVars.length > 0) {
    const errorMsg = `Missing environment variables: ${missingVars.join(
      ", "
    )}. See STRIPE_SETUP.md for configuration instructions.`;
    error(errorMsg);
    return res.json({ error: errorMsg }, 500);
  }

  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);

  try {
    // Parse payload from different possible sources (Appwrite versions handle this differently)
    let payload = {};

    log("Request body type: " + typeof req.body);
    log("Request bodyRaw type: " + typeof req.bodyRaw);
    log("Request payload type: " + typeof req.payload);

    if (req.body && typeof req.body === "object") {
      payload = req.body;
      log("Using req.body (already parsed object)");
    } else if (req.bodyRaw) {
      payload = JSON.parse(req.bodyRaw);
      log("Using req.bodyRaw (parsed from string)");
    } else if (req.payload) {
      payload = typeof req.payload === "string" ? JSON.parse(req.payload) : req.payload;
      log("Using req.payload");
    } else {
      error("No payload found in request");
      log("Available req properties: " + Object.keys(req).join(", "));
    }

    log("Parsed payload: " + JSON.stringify(payload));

    // In Appwrite functions, the user ID is available when called from authenticated context
    let userId = process.env.APPWRITE_FUNCTION_USER_ID || req.headers["x-appwrite-user-id"];

    log("User ID from env: " + process.env.APPWRITE_FUNCTION_USER_ID);
    log("User ID from headers: " + req.headers["x-appwrite-user-id"]);
    log("Final userId: " + userId);

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

    const { priceId, returnUrl, updateType } = payload;
    if (!priceId) {
      error("Missing priceId in request payload");
      return res.json({ error: "priceId is required" }, 400);
    }

    // Build dynamic URLs from client or use defaults (land on account subscription page)
    const baseUrl = returnUrl || "http://localhost:3000";
    const successUrl = baseUrl + "/#/account/subscription?success=true";
    const cancelUrl = baseUrl + "/#/account/subscription?canceled=true";

    log("Creating checkout session with returnUrl: " + baseUrl);

    // 1. Get the user's account to find their Stripe Customer ID
    const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
      sdk.Query.equal("user_id", user.$id),
    ]);

    if (accountDocs.total === 0) {
      error("No account found for user " + user.$id);
      return res.json({ error: "No Stripe customer found. Please contact support." }, 404);
    }

    const stripeCustomerId = accountDocs.documents[0].stripe_customer_id;

    if (!stripeCustomerId) {
      error("Account exists but no stripe_customer_id for user " + user.$id);
      return res.json({ error: "Stripe customer ID not configured. Please contact support." }, 404);
    }

    log("Found Stripe customer: " + stripeCustomerId);

    // 2. Check for existing subscription via Stripe API only
    const subscriptionsList = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 10,
    });
    const activeSubscription = (subscriptionsList.data || []).find(
      (s) => s.status && s.status !== "canceled" && s.status !== "incomplete_expired"
    );

    // 3. Fetch price and product to get metadata label
    const price = await stripe.prices.retrieve(priceId);
    const product = await stripe.products.retrieve(price.product);
    const productLabel = product.metadata?.label || null;

    log("Product label from metadata: " + productLabel);

    if (!productLabel) {
      error("Product does not have a label in metadata");
      return res.json({ error: "Product configuration error. Please contact support." }, 400);
    }

    // 4. If an existing non-canceled subscription exists, update it in-place
    //    instead of creating a new subscription. This prevents duplicate
    //    subscriptions for the same customer when swapping plans.
    if (activeSubscription) {
      log(
        "User has active subscription: " + activeSubscription.id + ". Attempting in-place update..."
      );

      const existingItem =
        activeSubscription.items &&
        activeSubscription.items.data &&
        activeSubscription.items.data[0];
      if (!existingItem) {
        log("No existing subscription item found, falling back to portal session");
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: successUrl,
        });
        return res.json({ sessionId: portalSession.id, url: portalSession.url });
      }

      // If the selected price is already the current price, return current subscription
      if (existingItem.price && existingItem.price.id === priceId) {
        log("Selected price is same as current price, returning existing subscription info");
        return res.json({
          subscriptionId: activeSubscription.id,
          status: activeSubscription.status,
          message: "Already on selected plan",
        });
      }

      // Detect Upgrade vs Downgrade to enforce logic
      const getMonthlyCost = (p) => {
        if (!p || !p.unit_amount) return 0;
        let divisor = 1;
        if (p.recurring) {
          if (p.recurring.interval === "year") divisor = 12;
          // if 'month', divisor = 1 * interval_count
          if (p.recurring.interval === "month") divisor = 1;
          divisor = divisor * (p.recurring.interval_count || 1);
        }
        return p.unit_amount / divisor;
      };

      const currentCost = getMonthlyCost(existingItem.price);
      const newCost = getMonthlyCost(price);

      // If new cost is strictly less than current, treat as downgrade
      // Also verify currency matches to be safe
      const isDowngrade = newCost < currentCost && price.currency === existingItem.price.currency;

      log(
        `Plan Change Check: Current ${currentCost} vs New ${newCost}. Is Downgrade? ${isDowngrade}`
      );

      // Perform update based on type
      try {
        let updated;

        if (updateType === "downgrade" || isDowngrade) {
          log("Processing downgrade (scheduling for period end)...");

          // Create schedule if none exists
          let scheduleId = activeSubscription.schedule;
          if (!scheduleId) {
            const schedule = await stripe.subscriptionSchedules.create({
              from_subscription: activeSubscription.id,
            });
            scheduleId = schedule.id;
            log("Created subscription schedule: " + scheduleId);
          }

          // Get schedule to find current phase details
          const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
          const currentPhase = schedule.phases[0];

          // Map current items for Phase 1
          const currentItems = currentPhase.items.map((item) => ({
            price: item.price,
            quantity: item.quantity,
          }));

          // Update schedule with two phases
          // Phase 1: Now -> Period End (Current Plan)
          // Phase 2: Period End -> Future (New Plan)
          const periodEnd = activeSubscription.current_period_end || currentPhase.end_date;
          if (!periodEnd) {
            throw new Error("Missing current_period_end for downgrade scheduling");
          }

          await stripe.subscriptionSchedules.update(scheduleId, {
            // After the schedule completes, release back to a normal subscription (continue indefinitely).
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
        } else {
          // UPGRADE or DEFAULT: Immediate update
          log("Processing upgrade (immediate with proration)...");
          updated = await stripe.subscriptions.update(activeSubscription.id, {
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
          });
          log("Subscription updated in-place: " + updated.id);
        }

        return res.json({ subscriptionId: updated.id, status: updated.status, url: null });
      } catch (updateErr) {
        // If update fails for any reason, fallback to Billing Portal so user can manage
        error("Failed to update subscription in-place: " + (updateErr.message || updateErr));
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: successUrl,
        });
        return res.json({
          sessionId: portalSession.id,
          url: portalSession.url,
          warning: "Fell back to billing portal",
        });
      }
    }

    // 5. No existing subscription found — create a new Stripe Checkout Session for new subscribers
    const session = await stripe.checkout.sessions.create({
      payment_method_collection: "if_required",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer: stripeCustomerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          appwrite_user_id: user.$id,
          product_label: productLabel,
        },
      },
    });

    log("Checkout session created: " + session.id);
    return res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    error("Failed to create Stripe checkout session:", err);
    return res.json(
      {
        error: err.message || "An unexpected error occurred",
        details: err.stack,
      },
      500
    );
  }
};
