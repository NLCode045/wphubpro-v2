import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, __dirname, '');
  const stripePublishable = (
    fileEnv.STRIPE_PUBLISHABLE_KEY ||
    fileEnv._STRIPE_PUBLISHABLE_KEY ||
    ''
  ).trim();

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
    proxy: {
      '/api': {
        target: 'https://api.wphub.pro',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
};
});
