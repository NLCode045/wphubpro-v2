/**
 * After subscription create/update, derive Payment Element payload when user must confirm.
 * @param {import('stripe').Stripe} stripe
 */
async function buildPaymentFromSubscription(stripe, subscriptionId) {
  let sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice.payment_intent'],
  });
  let inv = sub.latest_invoice;
  if (!inv) {
    return { payment: null };
  }
  if (typeof inv === 'string') {
    inv = await stripe.invoices.retrieve(inv, { expand: ['payment_intent'] });
  }
  if (inv.status === 'draft') {
    inv = await stripe.invoices.finalizeInvoice(inv.id, { expand: ['payment_intent'] });
  }
  if (inv.status === 'paid' || (inv.amount_due || 0) <= 0) {
    return { payment: null };
  }
  const pi = inv.payment_intent;
  if (!pi) {
    return { payment: null };
  }
  const piObj = typeof pi === 'string' ? await stripe.paymentIntents.retrieve(pi) : pi;
  if (piObj.status === 'succeeded') {
    return { payment: null };
  }
  const needsConfirm = [
    'requires_payment_method',
    'requires_action',
    'requires_confirmation',
    'requires_capture',
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

module.exports = { buildPaymentFromSubscription };
