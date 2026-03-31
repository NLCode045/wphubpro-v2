import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
// https://vite.dev/config/
export default defineConfig({
    /** Expose `APPWRITE_*` alongside `VITE_*` (used in `src/services/appwrite.ts`). */
    envPrefix: ['VITE_', 'APPWRITE_'],
    server: {
        allowedHosts: [ 'dev.wphub.pro', 'api.wphub.pro', 'local.code045.nl', 'localhost', 'code045.wphub.pro'],
        host: true,
        port: 5173,
        strictPort: true,
        open: true,
        https: false,
        warmup: {
            clientFiles: ['./index.html', './src/main.tsx', './src/App.tsx'],
        },
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
            "@": resolve(__dirname, "src"),
        },
    },
})
