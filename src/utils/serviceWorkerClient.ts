import { logger } from './logger';
import { eventBus } from '../lib/eventBus';

if ('serviceWorker' in navigator) {
  eventBus.addEventListener('sync-request', async (event: Event) => {
    const { detail } = event as CustomEvent;
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        logger.log('Client: Forwarding sync-request to active Service Worker.');
        registration.active.postMessage({
          type: 'SYNC_DATA',
          payload: detail,
        });
      }
    } catch (error) {
      logger.error('Client: Error forwarding sync-request to Service Worker.', error);
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    logger.log('Client: Service Worker controller has changed.');
  });
}
