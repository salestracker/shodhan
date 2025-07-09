import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { logger } from './utils/logger';
import type { SearchResult } from './types/search';

declare const self: ServiceWorkerGlobalScope;

const cacheSyncQueue = new BackgroundSyncPlugin('sync-cache');

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

const webhookUrl = import.meta.env.VITE_CACHE_WEBHOOK_URL;

if (webhookUrl) {
  registerRoute(
    ({ url, request }) => request.method === 'POST' && url.href === webhookUrl,
    new NetworkOnly({ plugins: [cacheSyncQueue] }),
    'POST'
  );
}

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

self.addEventListener('sync', event => {
  if (event.tag === 'workbox-background-sync:sync-cache') {
    logger.log('SW: Background sync event received');
    // Workbox handles replaying queued requests automatically
  }
});
