import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served by Hono at /app/*. In dev, /api is proxied to the backend on :3456.
export default defineConfig({
  base: '/app/',
  plugins: [react()],
  server: { proxy: { '/api': { target: 'http://localhost:3456', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') } } },
});
