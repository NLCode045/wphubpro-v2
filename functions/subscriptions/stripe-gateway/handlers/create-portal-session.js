const { success, fail } = require('../lib/responses');

module.exports = async function createPortalSession(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const { customerId, returnUrl } = payload;
  if (!customerId) return fail(res, 'customerId required', 400);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || 'https://wphubpro.netlify.app/#/subscription',
    });
    log(`Created billing portal session: ${session.id}`);
    return success(res, { url: session.url, session_id: session.id });
  } catch (err) {
    error(`Failed to create portal session: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
