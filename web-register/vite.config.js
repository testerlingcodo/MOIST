import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'https://moist-production-7b79.up.railway.app',
        changeOrigin: true,
      },
    },
  },
});
