import { precacheAndRoute } from 'workbox-precaching';
import { Queue } from 'workbox-background-sync';
import { logger } from './utils/logger';
import type { SearchResult } from './types/search';

declare const self: ServiceWorkerGlobalScope;

interface SyncPayload {
  webhookUrl: string;
  payload: SearchResult[];
}

// State variables
let isClientReady = false;
const earlySyncQueue: SyncPayload[] = [];

const webhookSyncQueue = new Queue('webhook-sync-queue');

const postMessageToClients = (message: object) => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message, []);
    });
  });
};

const handleSync = async (data: SyncPayload) => {
  postMessageToClients({ type: 'SYNC_RECEIVED' });
  const { webhookUrl, payload } = data;

  if (!webhookUrl || !payload) {
    logger.error('SW: Invalid sync data', data);
    return;
  }

    try {
      // We use fetch to send a POST request to the webhook.
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        logger.log('SW: Successfully sent data to webhook:', { webhookUrl, payload });
      } else {
        logger.error('SW: Failed to send data to webhook.', response.statusText);
      }
    } catch (error) {
      logger.error('SW: Error sending data to webhook.', error);
    }
};

const processEarlySyncQueue = () => {
  while (earlySyncQueue.length > 0) {
    const data = earlySyncQueue.shift();
    if (data) {
      logger.log('SW: Processing queued sync data.');
      handleSync(data);
    }
  }
};

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type: string; payload?: SyncPayload };
  if (!data) return;

  logger.log('SW: Received message:', data);

  switch (data.type) {
    case 'CLIENT_READY':
      isClientReady = true;
      logger.log('SW: Client is ready. Processing early sync queue.');
      processEarlySyncQueue();
      break;

    case 'SYNC_DATA':
      if (data.payload) {
        if (isClientReady) {
          logger.log('SW: Handling SYNC_DATA immediately.');
          event.waitUntil(handleSync(data.payload));
        } else {
          logger.log('SW: Client not ready. Queuing SYNC_DATA.');
          earlySyncQueue.push(data.payload);
        }
      }
      break;

    case 'PING':
      if (event.source) {
        logger.log('SW: Responding to PING.');
        event.source.postMessage({ type: 'PONG' }, []);
      }
      break;
  }
});

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('activate', (event: ExtendableEvent) => {
  logger.log('SW: Activated. Claiming clients.');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('install', () => {
  logger.log('SW: Installed. Forcing activation.');
  self.skipWaiting();
});
