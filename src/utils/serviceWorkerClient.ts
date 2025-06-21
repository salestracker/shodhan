import { logger } from './logger';
import { eventBus } from '../lib/eventBus';

// This module implements a robust handshake and centralized communication with the service worker.

// Create a resolver function for our promise. This allows us to resolve it from outside.
let resolveSwReady: () => void;
const swReady = new Promise<void>(resolve => {
  resolveSwReady = resolve;
});

// Function to send a "PING" to the service worker.
const sendPing = () => {
  if (navigator.serviceWorker.controller) {
    logger.log('Client: Sending PING to Service Worker.');
    navigator.serviceWorker.controller.postMessage({ type: 'PING' });
  }
};

// Listen for messages from the service worker.
navigator.serviceWorker.addEventListener('message', event => {
  const { type } = event.data;

  // When we receive a "PONG", it means the handshake is complete.
  if (type === 'PONG') {
    logger.log('Client: Received PONG. Handshake complete. Signaling readiness.');
    // Resolve the promise to unblock any waiting application logic.
    resolveSwReady();
    // Tell the service worker the client is ready to receive messages.
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLIENT_READY' });
    }
  }
});

// When a new service worker takes control, we need to re-initiate the handshake.
navigator.serviceWorker.addEventListener('controllerchange', () => {
  logger.log('Client: New Service Worker controller detected. Re-pinging.');
  sendPing();
});

// Initial ping attempt. We wait for the service worker to be ready first.
navigator.serviceWorker.ready.then(() => {
  sendPing();
});

// Listen for sync requests from the application and forward them to the service worker.
eventBus.addEventListener('sync-request', async (event) => {
  const { detail } = event as CustomEvent;
  
  // Ensure the service worker is ready before sending the message.
  await swReady;

  if (navigator.serviceWorker.controller) {
    logger.log('Client: Forwarding sync-request to Service Worker.');
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_DATA',
      payload: detail,
    });
  } else {
    logger.error('Client: Service worker controller not found. Cannot forward sync message.');
  }
});

// Export the promise. Other parts of the app will await this promise.
export { swReady };
