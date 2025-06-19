// src/service-worker.js
// This file is a temporary workaround to match the expected file extension by vite-plugin-pwa.
// It imports the actual Service Worker logic from service-worker.ts.

import * as serviceWorker from './service-worker.ts';

// Placeholder for Workbox manifest injection
self.__WB_MANIFEST;

// Forward all exports from the TypeScript file
Object.assign(self, serviceWorker);
