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
      registerType: 'autoUpdate',
      injectManifest: {
        swSrc: 'src/service-worker.ts',
        swDest: 'dist/sw.js',
        minify: mode === 'production' && process.env.VITE_SW_MINIFY !== 'false', // Minify in production unless explicitly disabled
      },
      devOptions: {
        enabled: true, // Enable in dev mode to serve dev SW
        type: 'classic'
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
