import { logger } from './logger';

// This module implements a robust handshake to ensure the service worker is ready.

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
    logger.log('Client: Received PONG from Service Worker. Handshake complete.');
    // Resolve the promise to unblock any waiting application logic.
    resolveSwReady();
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

// Export the promise. Other parts of the app will await this promise.
export { swReady };
