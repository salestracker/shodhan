// src/utils/serviceWorkerMessenger.ts
// Utility to handle communication with the Service Worker, ensuring it's ready before sending messages.
import { logger } from './logger';

/**
 * Sends a message to the Service Worker, waiting for it to be ready if necessary.
 * @param message The message object to send to the Service Worker.
 * @param retries Number of retries to attempt if the Service Worker controller is not available.
 * @param delay Delay in milliseconds between retries.
 * @returns Promise that resolves when the message is sent or rejects if retries are exhausted.
 */
export function sendToServiceWorker(message: object, retries = 30, delay = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('serviceWorker' in navigator)) {
      logger.error('Service Worker not supported in this environment.');
      reject(new Error('Service Worker not supported'));
      return;
    }

    // Function to attempt sending the message
    const attemptSend = (remainingRetries: number) => {
      logger.log('[SW Messenger] Checking Service Worker controller state:', navigator.serviceWorker.controller ? 'Controller exists' : 'No controller');
      
      if (navigator.serviceWorker.controller) {
        logger.log('[SW Messenger] Sending message to Service Worker:', message);
        navigator.serviceWorker.controller.postMessage(message);
        resolve();
      } else if (remainingRetries > 0) {
        logger.log(`[SW Messenger] No active Service Worker controller found, retrying... Retries left: ${remainingRetries}`);
        setTimeout(() => attemptSend(remainingRetries - 1), delay);
      } else {
        logger.error('[SW Messenger] No active Service Worker controller found after retries.');
        // Attempt to re-register the Service Worker as a last resort
        navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        }).then(registration => {
          logger.log(`[SW Messenger] Re-registered Service Worker with scope: ${registration.scope}`);
          if (navigator.serviceWorker.controller) {
            logger.log('[SW Messenger] Controller found after re-registration, sending message');
            navigator.serviceWorker.controller.postMessage(message);
            resolve();
          } else {
            reject(new Error('No active Service Worker controller found even after re-registration'));
          }
        }).catch(error => {
          logger.error('[SW Messenger] Re-registration of Service Worker failed:', error);
          reject(new Error('No active Service Worker controller found after retries and re-registration failed'));
        });
      }
    };

    // First, check if the Service Worker is already ready
    navigator.serviceWorker.ready.then(() => {
      logger.log('[SW Messenger] Service Worker is ready, proceeding to send message.');
      attemptSend(retries);
    }).catch(error => {
      logger.error('[SW Messenger] Error waiting for Service Worker to be ready:', error);
      reject(error);
    });
  });
}

/**
 * Sends new search results to the Service Worker for caching and synchronization.
 * @param results The search results to send to the Service Worker.
 * @returns Promise that resolves when the message is sent.
 */
export function sendSearchResultsToServiceWorker(results: object[]): Promise<void> {
  logger.log('[SW Messenger] Invoking sendSearchResultsToServiceWorker with results:', results.length, 'entries');
  return sendToServiceWorker({
    type: 'CACHE_NEW_ENTRY',
    results: results
  });
}
