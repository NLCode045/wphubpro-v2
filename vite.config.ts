import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDevProxy } from './vite/buildDevProxy';
import { stripeAdminDevMockPlugin } from './vite/stripeAdminDevMockPlugin';

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, __dirname, '');
  const stripePublishable = (
    fileEnv.STRIPE_PUBLISHABLE_KEY ||
    fileEnv._STRIPE_PUBLISHABLE_KEY ||
    ''
  ).trim();

  const stripeAdminDevMock =
    fileEnv.VITE_STRIPE_ADMIN_DEV_MOCK === '1' || fileEnv.VITE_STRIPE_ADMIN_DEV_MOCK === 'true';

  const stripeApiProxyTarget = (fileEnv.VITE_STRIPE_API_PROXY_TARGET ?? '').trim();
  const devApiProxyTarget = (fileEnv.VITE_DEV_API_PROXY_TARGET ?? '').trim() || 'https://api.wphub.pro';

  return {
  /**
   * Expose client-safe env vars (no empty prefix — Vite rejects `''` and it over-exposes `.env`).
   * Matches `APPWRITE_*`, `STRIPE_*` (e.g. publishable key), and default `VITE_*`.
   */
  /** `_FOO` matches `.env` keys like `_ENDPOINT` / `_DATABASE_ID` (see `src/services/appwrite.ts`). */
  envPrefix: ['VITE_', 'APPWRITE_', 'STRIPE_', '_'],
  /** Stripe Elements use `STRIPE_PUBLISHABLE_KEY`; allow `_STRIPE_PUBLISHABLE_KEY` in .env only. */
  define: {
    'import.meta.env.STRIPE_PUBLISHABLE_KEY': JSON.stringify(stripePublishable),
  },
  server: {
    allowedHosts: [
        '*.wearecode045s-projects.vercel.app',
        'jhb.wphub.pro',
        '*.wphub.pro',
        '*.code045.nl',
        '*.localhost',
        '*.code045.wphub.pro',
        'jhb.wphub.pro',
      'app.wphub.pro',
      'dev.wphub.pro',
      'local.code045.nl',
      'localhost',
      'code045.wphub.pro',
    ],
    host: true,
    port: 5173,
    strictPort: false,
    open: true,
    proxy: buildDevProxy({
      apiTarget: devApiProxyTarget,
      stripeTarget: stripeApiProxyTarget || undefined,
    }),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
  plugins: [
    stripeAdminDevMockPlugin({
      mock: stripeAdminDevMock,
      forwardStripeTo: stripeApiProxyTarget || undefined,
    }),
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
};
});
