/**
 * Routes a request to a handler bucket. Legacy code used separate Appwrite functions; overlapping
 * `action` values (e.g. `list`, `get`) are disambiguated the same way as before.
 *
 * Optional `payload.stripeScope` (or `stripeConsumer`): `config` | `invoices` for empty-body cases.
 */
function resolveRoute(req, payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const action = String(p.action || req.query?.action || '')
    .toLowerCase()
    .trim();

  const sig = req.headers?.['stripe-signature'] || req.headers?.['Stripe-Signature'];
  if (sig) return 'webhook';

  const scope = String(p.stripeScope || p.stripeConsumer || '')
    .toLowerCase()
    .trim();
  /** Disambiguates `{}` (publishable key vs member invoice list) when using one function id. */
  if (scope === 'config') return 'config';
  if (scope === 'invoices') return 'invoices';

  const hasEventData = Boolean(
    req?.variables?.APPWRITE_FUNCTION_EVENT_DATA || req?.env?.APPWRITE_FUNCTION_EVENT_DATA,
  );

  if (p.priceId) return 'order-payments';

  if (!action && p.returnUrl && !p.priceId) return 'portal-link';

  if (action === 'ensure') return 'create-customer';
  if (!action && hasEventData) return 'create-customer';

  const pmOnly = new Set([
    'get-customer',
    'create-setup-intent',
    'attach',
    'detach',
    'set-default',
    'update-customer',
  ]);
  if (pmOnly.has(action)) return 'payment-methods';

  if (action === 'list') {
    const isProductList =
      'active_only' in p ||
      'exclude_hidden' in p ||
      'exclude_non_sellable' in p ||
      'include_active_subscription_counts' in p;
    if (isProductList) return 'products';
    return 'payment-methods';
  }

  const productActions = new Set(['update', 'set-active', 'set-price-active', 'delete-plan', 'create-price']);
  if (action === 'get' && p.productId) return 'products';
  if (productActions.has(action)) return 'products';

  const subLocal = new Set(['get', 'cancel', 'get-details', 'preview-proration', 'cancel-schedule-update']);
  if (subLocal.has(action)) return 'subscriptions';

  if (
    action.includes('invoice') ||
    action.includes('payment-intent') ||
    action === 'prepare-pay-invoice' ||
    action === 'invoice-create-preview'
  ) {
    return 'invoices';
  }

  if (action.startsWith('admin-') || action.startsWith('member-')) {
    return 'subscriptions';
  }

  if (action === 'list-customers' || action === 'search-customers') return 'gateway';

  return 'gateway';
}

module.exports = { resolveRoute };
