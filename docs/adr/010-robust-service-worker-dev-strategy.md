# ADR 010: Robust Service Worker Development Strategy

## Status
Accepted

## Context
Throughout the development of the SearchGPT project, a persistent and critical issue was the browser running a stale, cached version of the Service Worker. This manifested as a failure in the "ping-pong" handshake between the client and the worker, as the active worker did not have the latest message handling logic. This failure blocked all subsequent cache synchronization requests, halting development progress on this core feature. Previous attempts to resolve this, including manual workarounds with static files (`ADR-006`), proved to be temporary fixes for symptoms rather than the root cause.

## Decision
To definitively resolve the stale Service Worker issue, a two-pronged strategy, aligned with industry best practices, was implemented:
1.  **Enable Auto-Update in Vite**: The `vite-plugin-pwa` configuration in `vite.config.ts` was set with `registerType: 'autoUpdate'`. This instructs the browser to automatically download a new version of the service worker file in the background as soon as it detects a change.
2.  **Force Immediate Activation in Worker**: An `install` event listener was added to the service worker (`src/service-worker.ts`) that calls `self.skipWaiting()`. This command instructs the newly downloaded service worker to bypass the standard "waiting" lifecycle state and activate immediately, forcibly replacing the old, stale worker that is currently controlling the page.

This ADR supersedes **ADR 006**, as the workaround described there is now obsolete.

## Rationale
1.  **Addresses Root Cause**: This strategy directly targets the two key phases of the service worker lifecycle. `autoUpdate` ensures the latest code is fetched, and `skipWaiting` ensures it is immediately put into use.
2.  **Reliability and Consistency**: This is the standard, recommended pattern for ensuring fresh service workers during development. It eliminates the unpredictability of browser caching behavior and provides a consistent developer experience.
3.  **Simplicity**: It removes the need for complex, environment-specific workarounds like maintaining a separate `public/service-worker-dev.js` file, simplifying the codebase and reducing the risk of divergence between development and production logic.
4.  **Unblocks Development**: By ensuring the latest service worker is always active, it guarantees that the client-worker handshake succeeds, allowing for reliable testing and development of features that depend on this communication channel, such as background sync.

## Consequences
- **Immediate Worker Updates**: Developers must be aware that any change to the service worker file will now trigger an immediate update and activation in the browser. This is desirable for development but differs from the default production behavior where a new worker typically waits until all client tabs are closed.
- **Clean Codebase**: The project no longer requires the `public/service-worker-dev.js` file or the conditional registration logic in `src/main.tsx`, leading to a cleaner and more maintainable codebase.
- **Focus on Core Logic**: With the lifecycle issues resolved, development can focus on the actual application logic within the service worker rather than on debugging the environment.

## Implementation Details
Key changes implemented:
1.  **Vite Configuration (`vite.config.ts`)**: Confirmed that `VitePWA` plugin options include `registerType: 'autoUpdate'`.
2.  **Service Worker (`src/service-worker.ts`)**: Added the following event listener:
    ```typescript
    self.addEventListener('install', () => {
      logger.log('Service Worker: Installed. Forcing activation.');
      self.skipWaiting();
    });
    ```
3.  **Code Cleanup**: Removed the now-obsolete `public/service-worker-dev.js` file and the conditional registration logic from `src/main.tsx`.
