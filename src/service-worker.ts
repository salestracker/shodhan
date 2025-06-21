import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { Queue } from 'workbox-background-sync';
import { logger } from './utils/logger';

declare const self: ServiceWorkerGlobalScope;

// The queue will store failed requests and replay them when the network is available.
const queue = new Queue('webhook-sync-queue', {
  // This is the crucial part. The onSync callback is triggered when Workbox
  // attempts to replay a request from the queue.
  async onSync({ queue }) {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        // The original request made by the app is to our "magic" /api/sync route.
        // We need to clone it to read the body.
        const requestClone = entry.request.clone();
        
        // The body contains the *actual* destination URL and the payload.
        const body = await requestClone.json();
        const { webhookUrl, payload } = body;

        if (!webhookUrl || !payload) {
          logger.error('Service Worker: Invalid request body in queue.', body);
          continue; // Skip to the next item in the queue
        }

        logger.log(`Service Worker: Replaying request to ${webhookUrl}`);

        // We create a *new* fetch request to the actual webhook URL.
        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        // Log proof of successful transmission, only in development.
        logger.debug('Service Worker: Successfully sent data to webhook (from queue):', { webhookUrl, payload });
        logger.log(`Service Worker: Successfully replayed request to ${webhookUrl}`);
      } catch (error) {
        logger.error('Service Worker: Error replaying request:', error);
        // If the replay fails, put it back in the queue to be retried later.
        await queue.unshiftRequest(entry);
        // We must throw an error to inform Workbox that the sync attempt failed.
        // This prevents Workbox from considering the sync complete.
        throw new Error('Replay failed, will retry.');
      }
    }
    logger.log('Service Worker: Sync complete.');
  },
});

// Custom handler for the /api/sync route.
const syncHandler = async ({ request }) => {
  try {
    // Clone the request to read the body.
    const requestClone = request.clone();
    const body = await requestClone.json();
    const { webhookUrl, payload } = body;

    if (!webhookUrl || !payload) {
      logger.error('Service Worker: Invalid request body for sync.', body);
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    // Attempt to send the data to the actual webhook.
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Log proof of successful transmission, only in development.
    logger.debug('Service Worker: Successfully sent data to webhook (direct):', { webhookUrl, payload });

    // Notify all clients that the sync was successful.
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SYNC_SUCCESS' }, []);
      });
    });

    // If the fetch is successful, respond to the app with a success message.
    logger.log('Service Worker: Sync successful.');
    return new Response(JSON.stringify({ status: 'Sync successful' }), { status: 200 });
  } catch (error) {
    // If the fetch fails (e.g., user is offline), it means we need to queue it.
    logger.log('Service Worker: Sync failed, queuing request.');
    // We add the original request to our named queue.
    // The onSync handler will take care of replaying it later.
    await queue.pushRequest({ request });
    
    // Crucially, we still return a 200 OK response to the main application.
    // This prevents a console error and makes the offline experience seamless.
    // The app thinks the request succeeded, and the service worker handles the retry.
    return new Response(JSON.stringify({ status: 'Request queued for sync' }), { status: 200 });
  }
};

// We register a route for our "magic" local endpoint and use our custom handler.
registerRoute(
  ({ url }) => url.pathname === '/api/sync',
  syncHandler,
  'POST'
);

// This line is automatically injected by VitePWA to precache all our assets.
precacheAndRoute(self.__WB_MANIFEST);

// Add an explicit fetch listener to guarantee interception in all environments.
self.addEventListener('fetch', (event: FetchEvent) => {
  // Parse the request URL to safely access its properties.
  const requestUrl = new URL(event.request.url);

  // If the request is for our sync API, manually trigger the handler.
  if (requestUrl.pathname === '/api/sync' && event.request.method === 'POST') {
    logger.log('Service Worker: Explicitly intercepting /api/sync request.');
    // The `respondWith` method is crucial. It tells the browser that we are
    // handling this request and that it should wait for our async response.
    event.respondWith(syncHandler({ request: event.request }));
  }
  // For all other requests, we don't do anything, allowing them to proceed normally.
});

// Listen for the "PING" message from the client.
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  // Cast the data to a known shape to satisfy TypeScript.
  const data = event.data as { type: string };
  if (data && data.type === 'PING' && event.source) {
    // Respond with "PONG" to complete the handshake.
    logger.log('Service Worker: Received PING, sending PONG.');
    // The second argument is for Transferable objects, which we are not using.
    // We pass an empty array to satisfy the strict TypeScript definition.
    event.source.postMessage({ type: 'PONG' }, []);
  }
});

// When the service worker activates, it should immediately claim all clients
// and notify them, so they can initiate the handshake.
self.addEventListener('activate', (event: ExtendableEvent) => {
  logger.log('Service Worker: Activated. Claiming clients.');
  event.waitUntil(self.clients.claim());
});

// This is the crucial step to ensure the new service worker takes control immediately.
self.addEventListener('install', () => {
  logger.log('Service Worker: Installed. Forcing activation.');
  self.skipWaiting();
});
