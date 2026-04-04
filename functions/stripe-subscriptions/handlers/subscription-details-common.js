/**
 * Build the same JSON shape as get-details (subscription, customer, plan, invoices, etc.)
 * @param {import('stripe').Stripe} stripe
 * @param {import('stripe').Stripe.Subscription} subscription - already retrieved with expand
 */
module.exports = async function buildSubscriptionDetailsPayload(stripe, subscription, log) {
  const subscriptionId = subscription.id;

  const invoices = await stripe.invoices.list({
    subscription: subscriptionId,
    limit: 100,
  });

  const priceId = subscription.items.data[0]?.price?.id;
  const price = priceId ? await stripe.prices.retrieve(priceId) : null;
  const product = price ? await stripe.products.retrieve(price.product) : null;

  let upcomingInvoice = null;
  if (subscription.status === "active" || subscription.status === "trialing") {
    try {
      upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        subscription: subscriptionId,
      });
    } catch (e) {
      if (log) log("No upcoming invoice: " + e.message);
    }
  }

  let pendingUpdate = null;
  if (subscription.schedule) {
    const schedule =
      typeof subscription.schedule === "object"
        ? subscription.schedule
        : await stripe.subscriptionSchedules.retrieve(subscription.schedule);

    if (schedule.phases && schedule.phases.length > 1) {
      const nextPhase = schedule.phases.find((p) => p.start_date >= subscription.current_period_end);

      if (nextPhase) {
        const nextPriceId = nextPhase.items[0]?.price;
        if (nextPriceId && nextPriceId !== priceId) {
          try {
            const nextPrice =
              typeof nextPriceId === "string" ? await stripe.prices.retrieve(nextPriceId) : nextPriceId;
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
            if (log) log("Error fetching pending update details: " + e.message);
          }
        }
      }
    }
  }

  const cust = subscription.customer;
  const customerObj = typeof cust === "object" && cust ? cust : null;

  let dpm = subscription.default_payment_method;
  if (typeof dpm === "string") {
    try {
      dpm = await stripe.paymentMethods.retrieve(dpm);
    } catch {
      dpm = null;
    }
  }
  const payment_method =
    dpm && typeof dpm === "object"
      ? {
          id: dpm.id,
          type: dpm.type,
          card: dpm.card
            ? {
                brand: dpm.card.brand,
                last4: dpm.card.last4,
                exp_month: dpm.card.exp_month,
                exp_year: dpm.card.exp_year,
              }
            : null,
        }
      : null;

  return {
    subscription: {
      id: subscription.id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
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
      pause_collection: subscription.pause_collection || null,
    },
    customer: {
      id: customerObj?.id || (typeof cust === "string" ? cust : null),
      email: customerObj?.email || null,
      name: customerObj?.name || null,
      phone: customerObj?.phone || null,
      address: customerObj?.address || null,
      created: customerObj?.created || null,
      balance: customerObj?.balance || 0,
      currency: customerObj?.currency || null,
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
        sites_limit: product?.metadata?.sites_limit ? parseInt(product.metadata.sites_limit, 10) : null,
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
    payment_method,
  };
};
