/**
 * Build the object passed to stripe-gateway.
 *
 * Appwrite / clients often send `{ action, subscriptionId, payload: {} }`. Using `p.payload || p`
 * is wrong: `{}` is truthy, so the gateway only sees `{}` and loses `subscriptionId`.
 *
 * Merge nested `payload` with top-level fields; top-level wins on conflicts.
 */
function mergeGatewayPayload(p) {
  if (!p || typeof p !== 'object') return {};
  const { action: _a, payload: nestedRaw, ...rest } = p;
  const nested =
    nestedRaw && typeof nestedRaw === 'object' && !Array.isArray(nestedRaw) ? nestedRaw : {};
  return { ...nested, ...rest };
}

module.exports = { mergeGatewayPayload };
