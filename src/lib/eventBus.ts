// src/lib/eventBus.ts

/**
 * A simple, centralized event bus for browser-based communication.
 * This allows decoupled components to communicate without direct dependencies.
 *
 * Example:
 *
 * // Dispatching an event
 * eventBus.dispatchEvent(new CustomEvent('my-event', { detail: { data: 'some-data' } }));
 *
 * // Listening for an event
 * eventBus.addEventListener('my-event', (event) => {
 *   console.log('Event received:', (event as CustomEvent).detail);
 * });
 */
export const eventBus = new EventTarget();
