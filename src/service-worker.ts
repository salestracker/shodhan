import { precacheAndRoute } from 'workbox-precaching';
import { Queue } from 'workbox-background-sync';
import { logger } from './utils/logger';
import type { SearchResult } from './types/search';

declare const self: ServiceWorkerGlobalScope;

interface SyncPayload {
  webhookUrl: string;
  payload: SearchResult[];
}

// The queue will store failed requests and replay them when the network is available.
const queue = new Queue('webhook-sync-queue');

// Function to send a message to all clients.
const postMessageToClients = (message: object) => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message, []);
    });
  });
};

// The core sync logic, now triggered by a message.
const handleSync = async (data: SyncPayload) => {
  const { webhookUrl, payload } = data;

  if (!webhookUrl || !payload) {
    logger.error('Service Worker: Invalid sync data received.', data);
    return;
  }

  try {
    // Attempt to send the data to the actual webhook.
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    logger.debug('Service Worker: Successfully sent data to webhook:', { webhookUrl, payload });
    postMessageToClients({ type: 'SYNC_SUCCESS' });
  } catch (error) {
    logger.log('Service Worker: Sync failed, queuing request.');
    // If the fetch fails, add the data to the queue.
    await queue.pushRequest({
      request: new Request(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    });
  }
};

// This line is automatically injected by VitePWA to precache all our assets.
precacheAndRoute(self.__WB_MANIFEST);

// Listen for messages from the client.
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type: string; payload?: SyncPayload };

  if (!data) {
    return;
  }

  // Handle SYNC_DATA message, which doesn't require a source.
  if (data.type === 'SYNC_DATA' && data.payload) {
    logger.log('Service Worker: Received SYNC_DATA, handling sync.');
    event.waitUntil(handleSync(data.payload));
  }

  // Handle PING message, which requires a source to reply to.
  if (data.type === 'PING' && event.source) {
    logger.log('Service Worker: Received PING, sending PONG.');
    event.source.postMessage({ type: 'PONG' }, []);
  }
});

// When the service worker activates, it should immediately claim all clients.
self.addEventListener('activate', (event: ExtendableEvent) => {
  logger.log('Service Worker: Activated. Claiming clients.');
  event.waitUntil(self.clients.claim());
});

// Ensure the new service worker takes control immediately.
self.addEventListener('install', () => {
  logger.log('Service Worker: Installed. Forcing activation.');
  self.skipWaiting();
});
