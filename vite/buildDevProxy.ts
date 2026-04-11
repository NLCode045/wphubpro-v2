import type { ProxyOptions } from 'vite';

export type BuildDevProxyOptions = {
  /** Default host for `/api/*` except Stripe (e.g. `https://api.wphub.pro`). */
  apiTarget: string;
  /**
   * Optional origin that implements JSON routes under `/api/stripe` (same path prefix as the dev server).
   * When unset, `/api/stripe` is not forwarded to `apiTarget` (which would return HTML).
   */
  stripeTarget?: string;
};

/**
 * Dev-only proxy: avoid forwarding `/api/stripe` to the generic API host — that rewrite strips `/api`
 * and usually hits an HTML shell (`/stripe/...`), which breaks `fetchStripeJson`.
 *
 * - With `stripeTarget`: `/api/stripe` → that origin (real JSON backend).
 * - Without: `/api/stripe` is skipped by the main proxy; use `stripeApiDevPlugin` for stubs or 501 JSON.
 */
export function buildDevProxy(opts: BuildDevProxyOptions): Record<string, ProxyOptions> {
  const { apiTarget, stripeTarget } = opts;
  const proxy: Record<string, ProxyOptions> = {};

  if (stripeTarget) {
    proxy['/api/stripe'] = {
      target: stripeTarget,
      changeOrigin: true,
      secure: false,
    };
  }

  proxy['/api'] = {
    target: apiTarget,
    changeOrigin: true,
    secure: false,
    /**
     * Do not proxy legacy `/api/stripe/*` to the generic API host unless `stripeTarget` is set above.
     * Returning `false` skips proxying so the next middleware can respond (mock or explicit JSON error).
     */
    bypass(req) {
      if ((req.url ?? '').startsWith('/api/stripe')) {
        return false;
      }
    },
    rewrite: (path) => path.replace(/^\/api/, ''),
  };

  return proxy;
}
