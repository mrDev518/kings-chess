import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  cacheDir: 'node_modules/.vite-kings',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)), // so "@/..." points to /src
    },
  },
  optimizeDeps: {
    exclude: ['chess.js'],
  },
  server: { port: 8080, strictPort: true },
  preview: { port: 8080, strictPort: true },
});
