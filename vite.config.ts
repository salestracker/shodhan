import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: './', // Set to relative path for serving from any directory
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      registerType: 'autoUpdate',
      minify: mode === 'production' && (process.env.VITE_SW_MINIFY || 'true') !== 'false',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: false,
    }),
    // Removed custom middleware to avoid conflict with vite-plugin-pwa
    // Relying on default behavior for serving dev-sw.js
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
