import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { logger } from './utils/logger'
import './utils/serviceWorkerClient'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Adjust the path based on Vite build output for service worker
    const swPath = import.meta.env.MODE === 'development' ? '/dev-sw.js?dev-sw' : '/sw.js';
    navigator.serviceWorker.register(swPath).then(registration => {
      logger.log('Service Worker registered with scope:', registration.scope);
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
