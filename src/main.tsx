import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { logger } from './utils/logger'

// Function to register the Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const swUrl = '/sw.js';
    const webhookUrl = import.meta.env.VITE_CACHE_WEBHOOK_URL;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swUrl, { scope: '/' })
        .then(registration => {
          logger.log(`Service Worker registered with scope: ${registration.scope}`);

          // Function to send configuration to the service worker
          const sendConfig = (sw: ServiceWorker) => {
            logger.log('Sending configuration to Service Worker:', sw);
            sw.postMessage({
              type: 'SET_CONFIG',
              webhookUrl: webhookUrl,
              useMock: import.meta.env.VITE_USE_MOCK_WEBHOOK === 'true'
            });
            if (import.meta.env.DEV) {
              sw.postMessage({ type: 'SET_DEBUG_MODE', debugMode: true });
              logger.log('Service Worker debug mode set to ON for development');
            }
          };

          // A new service worker has been found, but is waiting to activate.
          if (registration.waiting) {
            logger.log('A new service worker is waiting to activate.');
            // We can prompt the user to update. For now, we'll just log it.
          }

          // A new service worker is installing.
          if (registration.installing) {
            logger.log('A new service worker is installing.');
            // Listen for state changes on the installing worker
            registration.installing.addEventListener('statechange', (e) => {
              if ((e.target as ServiceWorker).state === 'installed') {
                logger.log('New service worker installed.');
              }
            });
          }

// Send config to the active service worker if it exists
if (registration.active) {
  logger.log('An active service worker is found.');
  sendConfig(registration.active);
}

// Register background sync if supported
if ('sync' in registration) {
  registration.sync.register('sync-cache')
    .then(() => {
      logger.log('Background Sync registered for tag: sync-cache');
    })
    .catch(error => {
      logger.error('Background Sync registration failed:', error);
    });
} else {
  logger.log('Background Sync not supported by this browser. Falling back to push model only.');
}

          // Listen for new worker to take control
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            logger.log('New service worker has taken control.');
            if (navigator.serviceWorker.controller) {
              sendConfig(navigator.serviceWorker.controller);
            }
          });
        })
        .catch(error => logger.error('Service Worker registration failed:', error));
    });
  }
}

/* Call the function to register the Service Worker */
registerServiceWorker();

import { getAllCacheEntries } from './services/cacheService';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Set up a message listener for Service Worker requests
if ('serviceWorker' in navigator) {
  // Use the same webhookUrl as defined earlier for consistency
  const webhookUrl = import.meta.env.VITE_CACHE_WEBHOOK_URL;
  navigator.serviceWorker.addEventListener('message', (event) => {
    logger.log('Main thread: Received message from Service Worker:', event.data);
    if (event.data && event.data.type === 'REQUEST_CACHE_DATA') {
      logger.log('Main thread: Service Worker requested cache data');
      getAllCacheEntries().then(cacheEntries => {
        logger.log('Main thread: Sending cache data to Service Worker:', cacheEntries.length, 'entries');
        if (event.ports && event.ports[0]) {
          logger.log('Main thread: About to send response via message port to Service Worker');
          event.ports[0].postMessage({ cacheEntries });
          logger.log('Main thread: Response sent to Service Worker via message port');
        } else {
          logger.warn('Main thread: No message port available to respond to Service Worker');
          logger.warn('Main thread: event.ports is', event.ports ? 'defined' : 'undefined');
        }
      }).catch(error => {
        logger.error('Main thread: Error fetching cache data for Service Worker:', error);
        if (event.ports && event.ports[0]) {
          logger.log('Main thread: Sending error response to Service Worker via message port');
          event.ports[0].postMessage({ error: 'Failed to fetch cache data' });
        } else {
          logger.warn('Main thread: No message port available to send error to Service Worker');
        }
      });
    } else if (event.data && event.data.type === 'SERVICE_WORKER_ACTIVATED') {
      logger.log('Main thread: Service Worker has activated and claimed clients, sending configuration');
      const controller = navigator.serviceWorker.controller;
      if (controller) {
        logger.log('Sending configuration to Service Worker:', controller);
        controller.postMessage({ type: 'SET_CONFIG', webhookUrl, useMock: false });
        if (import.meta.env.DEV) {
          controller.postMessage({ type: 'SET_DEBUG_MODE', debugMode: true });
          logger.log('Service Worker debug mode set to ON for development');
        }
      } else {
        logger.warn('No Service Worker controller available to send config');
      }
    } else if (event.data && event.data.type === 'SYNC_SUCCESS_NOTIFICATION') {
      logger.log('Main thread: Received sync success notification from Service Worker');
      // This will be handled in App.tsx or a component with access to useToast
    }
  });
}
