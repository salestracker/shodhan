import { precacheAndRoute } from 'workbox-precaching';
import { logger } from './utils/logger';
import type { SearchResult } from './types/search';

declare const self: ServiceWorkerGlobalScope;

interface SyncPayload {
  webhookUrl: string;
  payload: SearchResult[];
}

const postMessageToClients = (message: object) => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message, []);
    });
  });
};

const handleSync = async (data: SyncPayload) => {
  const { webhookUrl, payload } = data;

  if (!webhookUrl || !payload) {
    logger.error('SW: Invalid sync data', data);
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      logger.log('SW: Successfully sent data to webhook:', { webhookUrl, payload });
      postMessageToClients({ type: 'SYNC_SUCCESS' });
    } else {
      logger.error('SW: Failed to send data to webhook.', response.statusText);
    }
  } catch (error) {
    logger.error('SW: Error sending data to webhook.', error);
  }
};

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type: string; payload?: SyncPayload };
  if (!data) return;

  logger.log('SW: Received message:', data);

  switch (data.type) {
    case 'SYNC_DATA':
      if (data.payload) {
        event.waitUntil(handleSync(data.payload));
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
