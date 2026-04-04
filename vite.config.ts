import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  /**
   * Expose client-safe env vars (no empty prefix — Vite rejects `''` and it over-exposes `.env`).
   * Matches `APPWRITE_*`, `STRIPE_*` (e.g. publishable key), and default `VITE_*`.
   */
  envPrefix: ['VITE_', 'APPWRITE_', 'STRIPE_'],
  server: {
    allowedHosts: [
        '*.wearecode045s-projects.vercel.app',
        'jhb.wphub.pro',
        '*.wphub.pro',
        '*.code045.nl',
        '*.localhost',
        '*.code045.wphub.pro',
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
});
