import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Function to register the Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // Always register the Service Worker as /sw.js, vite-plugin-pwa handles dev/prod differences
    const swUrl = '/sw.js';
    // Webhook URL for cache synchronization - use environment variable or fallback to default
    const webhookUrl = import.meta.env.VITE_CACHE_WEBHOOK_URL;

    window.addEventListener('load', () => {
      // Helper to send configuration messages to the active Service Worker
      function sendSWConfig() {
        const controller = navigator.serviceWorker.controller;
        if (controller) {
          console.log('Sending configuration to Service Worker:', controller);
          controller.postMessage({ type: 'SET_CONFIG', webhookUrl: webhookUrl, useMock: false });
          if (import.meta.env.DEV) {
            controller.postMessage({ type: 'SET_DEBUG_MODE', debugMode: true });
            console.log('Service Worker debug mode set to ON for development');
          }
        } else {
          console.warn('No Service Worker controller available to send config');
        }
      }

      // Listen for controller change events to send config when a new SW takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controllerchange event fired');
        if (navigator.serviceWorker.controller) {
          sendSWConfig();
        } else {
          console.warn('Controllerchange fired but no controller available yet');
        }
      });

      // Ensure configuration is sent when Service Worker is ready
      navigator.serviceWorker.ready.then(() => {
        console.log('Service Worker ready, sending configuration now');
        console.log('Service Worker controller state at ready:', navigator.serviceWorker.controller ? 'Controller exists' : 'No controller');
        console.log('Diagnostic: Service Worker controller at ready:', navigator.serviceWorker.controller);
        if (navigator.serviceWorker.controller) {
          sendSWConfig();
        } else {
          console.log('No controller available yet, configuration will be sent on controllerchange or activation message');
        }
      });

      // Register the Service Worker without manual cache-busting
      console.log(`Registering Service Worker: ${swUrl}`);
      navigator.serviceWorker.register(swUrl, {
        type: import.meta.env.DEV ? 'classic' : 'classic',
        scope: '/'
      })
        .then(registration => {
          console.log(`Service Worker registered with scope: ${registration.scope}`);
          // If controller already active, send config immediately
          if (navigator.serviceWorker.controller) {
            console.log('Active controller detected post-registration');
            sendSWConfig();
          } else {
            console.log('Awaiting controllerchange to send config');
          }
        })
        .catch(error => console.error('Service Worker registration failed:', error));
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
    console.log('Main thread: Received message from Service Worker:', event.data);
    if (event.data && event.data.type === 'REQUEST_CACHE_DATA') {
      console.log('Main thread: Service Worker requested cache data');
      getAllCacheEntries().then(cacheEntries => {
        console.log('Main thread: Sending cache data to Service Worker:', cacheEntries.length, 'entries');
        if (event.ports && event.ports[0]) {
          console.log('Main thread: About to send response via message port to Service Worker');
          event.ports[0].postMessage({ cacheEntries });
          console.log('Main thread: Response sent to Service Worker via message port');
        } else {
          console.warn('Main thread: No message port available to respond to Service Worker');
          console.warn('Main thread: event.ports is', event.ports ? 'defined' : 'undefined');
        }
      }).catch(error => {
        console.error('Main thread: Error fetching cache data for Service Worker:', error);
        if (event.ports && event.ports[0]) {
          console.log('Main thread: Sending error response to Service Worker via message port');
          event.ports[0].postMessage({ error: 'Failed to fetch cache data' });
        } else {
          console.warn('Main thread: No message port available to send error to Service Worker');
        }
      });
    } else if (event.data && event.data.type === 'SERVICE_WORKER_ACTIVATED') {
      console.log('Main thread: Service Worker has activated and claimed clients, sending configuration');
      const controller = navigator.serviceWorker.controller;
      if (controller) {
        console.log('Sending configuration to Service Worker:', controller);
        controller.postMessage({ type: 'SET_CONFIG', webhookUrl, useMock: false });
        if (import.meta.env.DEV) {
          controller.postMessage({ type: 'SET_DEBUG_MODE', debugMode: true });
          console.log('Service Worker debug mode set to ON for development');
        }
      } else {
        console.warn('No Service Worker controller available to send config');
      }
    } else if (event.data && event.data.type === 'SYNC_SUCCESS_NOTIFICATION') {
      console.log('Main thread: Received sync success notification from Service Worker');
      // This will be handled in App.tsx or a component with access to useToast
    }
  });
}
