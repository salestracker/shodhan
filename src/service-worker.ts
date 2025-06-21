// src/service-worker.ts
// This file will be used as the source for the Workbox-powered service worker.
// It will be processed by vite-plugin-pwa during build to create the final service-worker.js in the dist folder.

declare const self: ServiceWorkerGlobalScope & { 
  __WB_MANIFEST: Array<{url: string, revision: string}>;
  __WB_DISABLE_DEV_LOGS: boolean;
};

import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { setCacheNameDetails } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { logger } from './utils/logger';
import type { ServiceWorkerConfigMessage } from './types/service-worker-messages';

/* eslint-disable no-console */
// Placeholder for Workbox manifest injection
// This is where Workbox will inject the list of files to precache
precacheAndRoute(self.__WB_MANIFEST);

// Log the manifest to ensure it's recognized during build
logger.log('Service Worker: Workbox manifest placeholder initialized', self.__WB_MANIFEST);

// Set cache names (optional, but good practice)
setCacheNameDetails({
  prefix: 'search-gpt',
  suffix: 'v1',
  precache: 'precache',
  runtime: 'runtime-cache',
});

let webhookUrl = '';
let debugMode = import.meta.env.DEV; // Debug mode flag, set based on Vite's development environment variable
const REDACTED_URL_PLACEHOLDER = '[REDACTED]';

logger.log('Service Worker: Initialized with debug mode:', debugMode ? 'ON' : 'OFF');

logger.log('Service Worker: Setting up message listener for main thread communication');

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  logger.log('Service Worker: Raw message event received:', event);
  logger.log('Service Worker: Raw message data:', event.data);
  logger.log('*** SERVICE WORKER: MESSAGE RECEIVED ***', event.data);
  const data = event.data as ServiceWorkerConfigMessage | { type?: string; debugMode?: boolean; results?: unknown[] };
  if (data) {
    if (data.type === 'SET_CONFIG' && data.webhookUrl) {
      webhookUrl = data.webhookUrl;
      logger.log('Service Worker: Webhook URL set:', REDACTED_URL_PLACEHOLDER);
    }
    if (data.type === 'SET_DEBUG_MODE') {
      debugMode = data.debugMode || false;
      logger.log('Service Worker: Debug mode set to:', debugMode);
    }
    if (data.type === 'TRIGGER_FOREGROUND_SYNC') {
      logger.log('Service Worker: Foreground sync triggered by main thread. Initiating sync process.');
      event.waitUntil(syncCacheData()); // Reuse existing sync logic
      logger.log('Service Worker: syncCacheData() called and event.waitUntil() set.');
    }
    if (data.type === 'CACHE_NEW_ENTRY' && data.results) {
      logger.log('Service Worker: Received notification of new cache entries from main thread:', data.results.length, 'entries');
      logger.log('Service Worker: Triggering sync for new entries (not saving in SW, main thread handles cache).');
      event.waitUntil(syncCacheData());
    }
  } else {
    logger.log('Service Worker: Received message with no data or empty data from main thread.');
  }
});

// Define syncCacheData function only once
async function syncCacheData() {
  logger.log('Service Worker: syncCacheData() function entered.');
  logger.log('Service Worker: Sync operation timestamp:', new Date().toISOString());
  if (!webhookUrl) {
    logger.warn('Service Worker: Webhook URL not set. Cannot sync cache.');
    return;
  }

    logger.log('Service Worker: Initiating syncCacheData. Webhook URL:', REDACTED_URL_PLACEHOLDER);

  try {
    logger.log('Service Worker: Beginning request for cached data from main thread...');
    const cacheData = await requestCacheDataFromMainThread() as Array<{ value: { timestamp: string | number }, timestamp: string | number }>;
    logger.log('Service Worker: Successfully received cache data from main thread:', cacheData.length, 'entries');
    logger.log('Service Worker: Raw cache data for inspection:', JSON.stringify(cacheData, null, 2));

    const lastSyncTimestamp = await getLastSyncTimestamp();
    logger.log('Service Worker: Last sync timestamp:', new Date(lastSyncTimestamp).toISOString());

    logger.log('Service Worker: Cache data length before filtering:', cacheData.length);
    const filteredData = [];
    for (const entry of cacheData) {
      if (!entry.value) continue;
      // Check both entry-level timestamp and value-level timestamp
      const entryTimestamp = entry.timestamp ? toMillis(entry.timestamp as string | number, 0) : (entry.value.timestamp ? toMillis(entry.value.timestamp as string | number, 0) : 0);
      const lastTs = toMillis(lastSyncTimestamp as string | number, 0);
      logger.log('Service Worker: Filter - Entry Timestamp:', entryTimestamp, 'Last Sync Timestamp:', lastTs);
      if (entryTimestamp > lastTs) {
        filteredData.push(entry);
      }
    }
    logger.log('Service Worker: Filtered data length after manual filtering:', filteredData.length);
    logger.log('Service Worker: Filtered data for sync (entries newer than last sync):', filteredData);

    if (filteredData.length > 0) {
      logger.log('Service Worker: Sync triggered. Sending filtered cache data to webhook:', REDACTED_URL_PLACEHOLDER);
      logger.log(`Service Worker: Sync packet contains ${filteredData.length} entries to sync`);
      logger.log('Service Worker: Sync packet being sent:', JSON.stringify(filteredData, null, 2));
      
      try {
        logger.log('Service Worker: Initiating fetch request to webhook...');
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filteredData),
        });
        logger.log('Service Worker: Fetch request to webhook completed with status:', response.status);
        
        // Log response body for debugging
        const responseText = await response.text();
        logger.log('Service Worker: Webhook response body:', responseText || '(empty response)');

        if (response.ok) {
          logger.log('Service Worker: Cache data synced successfully.');
          await updateLastSyncTimestamp(Date.now());
          // Notify main thread of successful sync for UX notification
          self.clients.matchAll({ type: 'window' }).then(clients => {
            clients.forEach(client => {
              logger.log('Service Worker: Notifying client of successful sync:', REDACTED_URL_PLACEHOLDER);
              client.postMessage({ type: 'SYNC_SUCCESS_NOTIFICATION' });
            });
          });
        } else {
          logger.error('Service Worker: Failed to sync cache data. Status:', response.status, 'Text:', response.statusText);
          logger.error('Service Worker: ERROR - Data was NOT sent to webhook URL:', REDACTED_URL_PLACEHOLDER);
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
          // Throwing will cause Workbox background sync to retry
        }
      } catch (error) {
        logger.error('Service Worker: Fetch request to webhook failed:', error);
        logger.log('Service Worker: Request will be queued for background sync retry');
        throw error; // Re-throw to trigger background sync
      }
    } else {
      logger.log('Service Worker: Sync triggered. No new data to sync (all entries are older than last sync or cache is empty).');
    }
  } catch (error) {
    logger.error('Service Worker: Error during cache sync:', error);
  }
  logger.log('Service Worker: syncCacheData() function exited.');
}

self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-cache' || event.tag === 'one-off-sync-cache') {
    if (debugMode) logger.log('Service Worker: Sync event triggered for tag:', event.tag);
    event.waitUntil(syncCacheData());
  }
});

// Helper to communicate with main thread
async function requestCacheDataFromMainThread() {
  logger.log('Service Worker: Requesting cached data from main thread...');
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        logger.error('Service Worker: Timeout reached while waiting for cache data from main thread');
        reject(new Error('Timeout waiting for cache data from main thread'));
      }
    }, 10000); // 10 second timeout

    // Send message to main thread to request cache data
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients && clients.length > 0) {
        logger.log('Service Worker: Sending REQUEST_CACHE_DATA to', clients.length, 'clients');
        // Create a new MessageChannel for each client to avoid DataCloneError
        clients.forEach(client => {
          logger.log('Service Worker: Sending request to client:', REDACTED_URL_PLACEHOLDER);
          const messageChannel = new MessageChannel();
          logger.log('Service Worker: MessageChannel created for cache data request to client:', REDACTED_URL_PLACEHOLDER);
          messageChannel.port1.onmessage = (event) => {
            logger.log('Service Worker: Message received on port1 from client:', REDACTED_URL_PLACEHOLDER);
            if (event.data && event.data.cacheEntries) {
              logger.log('Service Worker: Cache data received from client:', event.data.cacheEntries.length, 'entries');
              clearTimeout(timeoutId); // Clear the timeout as we have received data
              resolved = true;
              resolve(event.data.cacheEntries);
            } else if (event.data && event.data.error) {
              logger.error('Service Worker: Client reported error:', event.data.error);
              if (!resolved) {
                reject(new Error(event.data.error));
              }
            } else {
              logger.error('Service Worker: Invalid response format from client');
              if (!resolved) {
                reject(new Error('Invalid response format from client'));
              }
            }
          };
          messageChannel.port1.onerror = (error) => {
            logger.error('Service Worker: Message channel error for client:', REDACTED_URL_PLACEHOLDER, error);
            if (!resolved) {
              reject(error);
            }
          };
          logger.log('Service Worker: About to postMessage with port2 to client:', REDACTED_URL_PLACEHOLDER);
          client.postMessage({ type: 'REQUEST_CACHE_DATA' }, [messageChannel.port2]);
        });
      } else {
        logger.error('Service Worker: No clients found to request cache data from');
        reject(new Error('No clients found to request cache data from'));
      }
    }).catch(error => {
      logger.error('Service Worker: Error matching clients:', error);
      reject(error);
    });
  });
}

import { toMillis } from './utils/timestampUtils';

// IndexedDB operations for storing last sync timestamp - defined only once
const DB_NAME = 'SearchGPT';
const DB_VERSION = 1;
const STORE_NAME = 'syncStore';

async function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (event) => {
      logger.error('Service Worker: Error opening IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result as IDBDatabase);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBRequest).result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        logger.log('Service Worker: IndexedDB store created:', STORE_NAME);
      }
      if (!db.objectStoreNames.contains('searchResults')) {
        db.createObjectStore('searchResults', { keyPath: 'key' });
        logger.log('Service Worker: IndexedDB store created for search results.');
      }
    };
  });
}

async function getLastSyncTimestamp(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise<number>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('lastSyncTimestamp');
      request.onsuccess = () => {
        const result = request.result ? (request.result as { value: number }).value : 0;
        logger.log('Service Worker: Retrieved last sync timestamp from IndexedDB:', new Date(result).toISOString());
        resolve(result);
      };
      request.onerror = () => {
        logger.error('Service Worker: Error getting last sync timestamp from IndexedDB:', request.error);
        resolve(0);
      };
    });
  } catch (error) {
    logger.error('Service Worker: Failed to open IndexedDB for getting timestamp:', error);
    return Promise.resolve(0);
  }
}

async function updateLastSyncTimestamp(timestamp: number): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key: 'lastSyncTimestamp', value: timestamp });
      request.onsuccess = () => {
        logger.log('Service Worker: Updated last sync timestamp in IndexedDB to', new Date(timestamp).toISOString());
        resolve();
      };
      request.onerror = () => {
        logger.error('Service Worker: Error updating last sync timestamp in IndexedDB:', request.error);
        resolve();
      };
    });
  } catch (error) {
    logger.error('Service Worker: Failed to open IndexedDB for updating timestamp:', error);
    return Promise.resolve();
  }
}

// Activate event listener
self.addEventListener('activate', (event: ExtendableEvent) => {
  logger.log('Service Worker: Activate event listener started.');
  
    // Log the current clients that will be claimed
    self.clients.matchAll({ type: 'window' }).then(clients => {
      logger.log(`Service Worker: Found ${clients.length} client(s) to claim`);
      clients.forEach(client => {
        logger.log('Service Worker: Client URL:', REDACTED_URL_PLACEHOLDER);
      });
    });
    
    event.waitUntil(self.clients.claim().then(() => {
      logger.log('Service Worker: self.clients.claim() completed. Service Worker now controls all clients.');
      // Notify main thread explicitly that Service Worker is active and controlling
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          logger.log('Service Worker: Notifying client of activation:', REDACTED_URL_PLACEHOLDER);
          client.postMessage({ type: 'SERVICE_WORKER_ACTIVATED' });
        });
      });
    }).catch(error => {
      logger.error('Service Worker: Error in self.clients.claim():', error);
    }));
  
  logger.log('Service Worker: Activated and ready to handle fetch events and cache sync operations');
  logger.log('Service Worker: Activate event listener finished setting up event.waitUntil calls.');
});

// Install event listener
self.addEventListener('install', (event) => {
  logger.log('Service Worker: Install event triggered');
  logger.log('Service Worker: Debug mode is', debugMode ? 'ON' : 'OFF');
  logger.log('Service Worker: Calling skipWaiting() to activate immediately');
  self.skipWaiting();
});

// Background Sync for outgoing cache data - defined only once
const cacheSyncQueue = new BackgroundSyncPlugin('cache-sync-queue', {
  maxRetentionTime: 24 * 60, // Retry for a maximum of 24 hours
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        // Replay the request to your webhook
        await fetch(entry.request);
        logger.log('Workbox: Successfully replayed failed sync request.');
      } catch (error) {
        logger.error('Workbox: Failed to replay sync request:', error);
        await queue.unshiftRequest(entry); // Put it back in queue if it fails again
        throw error; // Re-throw to signal sync failure
      }
    }
  },
});

// Route for your cache sync webhook (e.g., /sync-cache)
registerRoute(
  ({ url, request }) => url.pathname === '/sync-cache' && request.method === 'POST',
  new NetworkOnly({
    plugins: [cacheSyncQueue],
  })
);
