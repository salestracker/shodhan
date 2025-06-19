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

/* eslint-disable no-console */
// Placeholder for Workbox manifest injection
// This is where Workbox will inject the list of files to precache
const manifest = self.__WB_MANIFEST;

// Log the manifest to ensure it's recognized during build
console.log('Service Worker: Workbox manifest placeholder initialized', manifest);

// Set cache names (optional, but good practice)
setCacheNameDetails({
  prefix: 'search-gpt',
  suffix: 'v1',
  precache: 'precache',
  runtime: 'runtime-cache',
});

console.log('Service Worker: Initialized with debug mode:', self.location.hostname === 'localhost' ? 'ON (localhost detected)' : 'OFF');

let webhookUrl = '';
let debugMode = self.location.hostname === 'localhost'; // Debug mode flag, default to true for localhost

console.log('Service Worker: Setting up message listener for main thread communication');

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  console.log('Service Worker: Raw message event received:', event);
  console.log('Service Worker: Raw message data:', event.data);
  console.log('*** SERVICE WORKER: MESSAGE RECEIVED ***', event.data);
  const data = event.data as { type?: string; webhookUrl?: string; useMock?: boolean; debugMode?: boolean; results?: unknown[] };
  if (data) {
    if (data.type === 'SET_CONFIG' && data.webhookUrl) {
      webhookUrl = data.webhookUrl;
      if (data.useMock === false) {
        console.log('Service Worker: Using actual webhook URL (mock disabled):', webhookUrl);
      } else {
        console.log('Service Worker: Webhook URL set:', webhookUrl);
      }
    }
    if (data.type === 'SET_DEBUG_MODE') {
      debugMode = data.debugMode || false;
      console.log('Service Worker: Debug mode set to:', debugMode);
    }
    if (data.type === 'TRIGGER_FOREGROUND_SYNC') {
      console.log('Service Worker: Foreground sync triggered by main thread. Initiating sync process.');
      event.waitUntil(syncCacheData()); // Reuse existing sync logic
      console.log('Service Worker: syncCacheData() called and event.waitUntil() set.');
    }
    if (data.type === 'CACHE_NEW_ENTRY' && data.results) {
      console.log('Service Worker: Received notification of new cache entries from main thread:', data.results.length, 'entries');
      console.log('Service Worker: Triggering sync for new entries (not saving in SW, main thread handles cache).');
      event.waitUntil(syncCacheData());
    }
  } else {
    console.log('Service Worker: Received message with no data or empty data from main thread.');
  }
});


// Define syncCacheData function only once
async function syncCacheData() {
  console.log('Service Worker: syncCacheData() function entered.');
  console.log('Service Worker: Sync operation timestamp:', new Date().toISOString());
  if (!webhookUrl) {
    console.warn('Service Worker: Webhook URL not set. Cannot sync cache.');
    return;
  }

  console.log('Service Worker: Initiating syncCacheData. Webhook URL:', webhookUrl);

  try {
    console.log('Service Worker: Beginning request for cached data from main thread...');
    const cacheData = await requestCacheDataFromMainThread() as Array<{ value: { timestamp: string | number }, timestamp: string | number }>;
    console.log('Service Worker: Successfully received cache data from main thread:', cacheData.length, 'entries');
    console.log('Service Worker: Raw cache data for inspection:', JSON.stringify(cacheData, null, 2));

    const lastSyncTimestamp = await getLastSyncTimestamp();
    console.log('Service Worker: Last sync timestamp:', new Date(lastSyncTimestamp).toISOString());

    console.log('Service Worker: Cache data length before filtering:', cacheData.length);
    const filteredData = [];
    for (const entry of cacheData) {
      if (!entry.value) continue;
      // Check both entry-level timestamp and value-level timestamp
      // Ensure compatibility with toMillis expecting a single argument
      const entryTimestamp = entry.timestamp ? toMillis(entry.timestamp as string | number) : (entry.value.timestamp ? toMillis(entry.value.timestamp as string | number) : 0);
      const lastTs = toMillis(lastSyncTimestamp as string | number);
      console.log('Service Worker: Filter - Entry Timestamp:', entryTimestamp, 'Last Sync Timestamp:', lastTs);
      if (entryTimestamp > lastTs) {
        filteredData.push(entry);
      }
    }
    console.log('Service Worker: Filtered data length after manual filtering:', filteredData.length);
    console.log('Service Worker: Filtered data for sync (entries newer than last sync):', filteredData);

    if (filteredData.length > 0) {
      console.log('Service Worker: Sync triggered. Sending filtered cache data to webhook:', webhookUrl);
      console.log(`Service Worker: Sync packet contains ${filteredData.length} entries to sync`);
      console.log('Service Worker: Sync packet being sent:', JSON.stringify(filteredData, null, 2));
      
      try {
        console.log('Service Worker: Initiating fetch request to webhook...');
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filteredData),
        });
        console.log('Service Worker: Fetch request to webhook completed with status:', response.status);
        
        // Log response body for debugging
        const responseText = await response.text();
        console.log('Service Worker: Webhook response body:', responseText || '(empty response)');

        if (response.ok) {
          console.log('Service Worker: Cache data synced successfully.');
          await updateLastSyncTimestamp(Date.now());
          // Notify main thread of successful sync for UX notification
          self.clients.matchAll({ type: 'window' }).then(clients => {
            clients.forEach(client => {
              console.log('Service Worker: Notifying client of successful sync:', client.url);
              client.postMessage({ type: 'SYNC_SUCCESS_NOTIFICATION' });
            });
          });
        } else {
          console.error('Service Worker: Failed to sync cache data. Status:', response.status, 'Text:', response.statusText);
          console.error('Service Worker: ERROR - Data was NOT sent to webhook URL:', webhookUrl);
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
          // Throwing will cause Workbox background sync to retry
        }
      } catch (error) {
        console.error('Service Worker: Fetch request to webhook failed:', error);
        console.log('Service Worker: Request will be queued for background sync retry');
        throw error; // Re-throw to trigger background sync
      }
    } else {
      console.log('Service Worker: Sync triggered. No new data to sync (all entries are older than last sync or cache is empty).');
    }
  } catch (error) {
    console.error('Service Worker: Error during cache sync:', error);
  }
  console.log('Service Worker: syncCacheData() function exited.');
}

self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-cache' || event.tag === 'one-off-sync-cache') {
    if (debugMode) console.log('Service Worker: Sync event triggered for tag:', event.tag);
    event.waitUntil(syncCacheData());
  }
});

// Helper to communicate with main thread
async function requestCacheDataFromMainThread() {
  console.log('Service Worker: Requesting cached data from main thread...');
  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();
    console.log('Service Worker: MessageChannel created for cache data request');
    messageChannel.port1.onmessage = (event) => {
      console.log('Service Worker: Message received on port1 from main thread');
      if (event.data && event.data.cacheEntries) {
        console.log('Service Worker: Cache data received from main thread:', event.data.cacheEntries.length, 'entries');
        resolve(event.data.cacheEntries);
      } else if (event.data && event.data.error) {
        console.error('Service Worker: Main thread reported error:', event.data.error);
        reject(new Error(event.data.error));
      } else {
        console.error('Service Worker: Invalid response format from main thread');
        reject(new Error('Invalid response format from main thread'));
      }
    };
    messageChannel.port1.onerror = (error) => {
      console.error('Service Worker: Message channel error:', error);
      reject(error);
    };
    console.log('Service Worker: Message handlers set up for port1 (onmessage and onerror)');
    // Send message to main thread to request cache data
    self.clients.matchAll().then(clients => {
      if (clients && clients.length > 0) {
        console.log('Service Worker: Sending REQUEST_CACHE_DATA to', clients.length, 'clients');
        clients.forEach(client => {
          console.log('Service Worker: Sending request to client:', client.url);
          console.log('Service Worker: About to postMessage with port2 to client');
          client.postMessage({ type: 'REQUEST_CACHE_DATA' }, [messageChannel.port2]);
        });
      } else {
        console.error('Service Worker: No clients found to request cache data from');
        reject(new Error('No clients found to request cache data from'));
      }
    }).catch(error => {
      console.error('Service Worker: Error matching clients:', error);
      reject(error);
    });
    // Add a timeout to diagnose if the Service Worker is timing out
    setTimeout(() => {
      console.error('Service Worker: Timeout reached while waiting for cache data from main thread');
      reject(new Error('Timeout waiting for cache data from main thread'));
    }, 10000); // 10 second timeout
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
      console.error('Service Worker: Error opening IndexedDB:', (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result as IDBDatabase);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBRequest).result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        console.log('Service Worker: IndexedDB store created:', STORE_NAME);
      }
      if (!db.objectStoreNames.contains('searchResults')) {
        db.createObjectStore('searchResults', { keyPath: 'key' });
        console.log('Service Worker: IndexedDB store created for search results.');
      }
    };
  });
}

async function getLastSyncTimestamp() {
  try {
    const db = await openDB();
    return new Promise<number>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('lastSyncTimestamp');
      request.onsuccess = () => {
        const result = request.result ? (request.result as { value: number }).value : 0;
        console.log('Service Worker: Retrieved last sync timestamp from IndexedDB:', new Date(result).toISOString());
        resolve(result);
      };
      request.onerror = () => {
        console.error('Service Worker: Error getting last sync timestamp from IndexedDB:', request.error);
        resolve(0);
      };
    });
  } catch (error) {
    console.error('Service Worker: Failed to open IndexedDB for getting timestamp:', error);
    return Promise.resolve(0);
  }
}

async function updateLastSyncTimestamp(timestamp: number) {
  try {
    const db = await openDB();
    return new Promise<void>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key: 'lastSyncTimestamp', value: timestamp });
      request.onsuccess = () => {
        console.log('Service Worker: Updated last sync timestamp in IndexedDB to', new Date(timestamp).toISOString());
        resolve();
      };
      request.onerror = () => {
        console.error('Service Worker: Error updating last sync timestamp in IndexedDB:', request.error);
        resolve();
      };
    });
  } catch (error) {
    console.error('Service Worker: Failed to open IndexedDB for updating timestamp:', error);
    return Promise.resolve();
  }
}

// Activate event listener
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('Service Worker: Activate event listener started.');
  
    // Log the current clients that will be claimed
    self.clients.matchAll({ type: 'window' }).then(clients => {
      console.log(`Service Worker: Found ${clients.length} client(s) to claim`);
      clients.forEach(client => {
        console.log('Service Worker: Client URL:', client.url);
      });
    });
    
    event.waitUntil(self.clients.claim().then(() => {
      console.log('Service Worker: self.clients.claim() completed. Service Worker now controls all clients.');
      // Notify main thread explicitly that Service Worker is active and controlling
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          console.log('Service Worker: Notifying client of activation:', client.url);
          client.postMessage({ type: 'SERVICE_WORKER_ACTIVATED' });
        });
      });
    }).catch(error => {
      console.error('Service Worker: Error in self.clients.claim():', error);
    }));
  
  console.log('Service Worker: Activated and ready to handle fetch events and cache sync operations');
  console.log('Service Worker: Activate event listener finished setting up event.waitUntil calls.');
});

// Install event listener
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event triggered');
  console.log('Service Worker: Debug mode is', debugMode ? 'ON' : 'OFF');
  console.log('Service Worker: Calling skipWaiting() to activate immediately');
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
        console.log('Workbox: Successfully replayed failed sync request.');
      } catch (error) {
        console.error('Workbox: Failed to replay sync request:', error);
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
