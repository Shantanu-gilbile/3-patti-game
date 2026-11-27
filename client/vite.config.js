import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    port: 3000,
    host: true,
    // Allow Cloudflare tunnel and any tunnel hosts
    allowedHosts: true,
    // Proxy Socket.IO and API requests to port 4000 seamlessly through the tunnel!
    proxy: {
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});
