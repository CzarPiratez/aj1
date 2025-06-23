import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0', // Changed from true to explicit IP to ensure external access
    port: 5173,
    strictPort: false,
    open: false, // Prevent auto-opening to avoid conflicts
    cors: true, // Enable CORS for cross-origin requests
    hmr: {
      port: 5174, // Use different port for HMR to avoid conflicts
    },
  },
  preview: {
    host: '0.0.0.0', // Changed from true to explicit IP
    port: 4173,
    strictPort: false,
    open: false, // Prevent auto-opening
    cors: true, // Enable CORS
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // Enable source maps for debugging
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
  base: './', // Use relative paths for better compatibility
});