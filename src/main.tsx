import { StrictMode } from 'react'
import { logger } from './utils/logger';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './utils/serviceWorkerClient'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = import.meta.env.MODE === 'development' 
      ? '/dev-sw.js?dev-sw' 
      : '/sw.js';
    navigator.serviceWorker.register(swPath, { type: 'module' }).then(registration => {
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
