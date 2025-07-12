import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { logger } from './utils/logger'
import './utils/serviceWorkerClient'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { type: 'module' }).then(registration => {
      logger.log('Service Worker registered with scope:', registration.scope);
      if (registration.sync) {
        registration.sync.register('sync-cache').catch(err => {
          logger.error('Background sync registration failed:', err);
        });
      }
    }).catch(error => {
      logger.error('Service Worker registration failed:', error);
    });
  });
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
