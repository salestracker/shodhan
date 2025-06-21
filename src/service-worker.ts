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
    logger.warn('Service Worker: Received an empty message.');
    return;
  }

  logger.log('Service Worker: Received message:', data);

  switch (data.type) {
    case 'SYNC_DATA':
      if (data.payload) {
        logger.log('Service Worker: Handling SYNC_DATA.');
        event.waitUntil(handleSync(data.payload));
      } else {
        logger.error('Service Worker: SYNC_DATA message received without payload.');
      }
      break;

    case 'PING':
      if (event.source) {
        logger.log('Service Worker: Responding to PING with PONG.');
        event.source.postMessage({ type: 'PONG' }, []);
      } else {
        logger.error('Service Worker: PING message received without a source to reply to.');
      }
      break;

    default:
      logger.warn('Service Worker: Received unknown message type:', data.type);
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
