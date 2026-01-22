import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// In Docker, use the service name 'api'; locally use localhost:3001
const API_TARGET = process.env.DOCKER_ENV === 'true' 
  ? 'http://api:3001' 
  : 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true, // Allow external connections
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        ws: true, // Enable WebSocket proxy
      },
    },
  },
});
