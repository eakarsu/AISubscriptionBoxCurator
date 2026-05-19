import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  server: {
    port: Number(process.env.FRONTEND_PORT) || 3000,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || ('http://127.0.0.1:' + (process.env.BACKEND_PORT || 3001)),
        changeOrigin: true,
      },
    },
  },
});
