import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Register the service worker only under http(s); on file:// it would throw.
if (typeof location !== 'undefined' && location.protocol.startsWith('http')) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      try {
        registerSW({ immediate: true });
      } catch {
        /* SW unavailable — app still works fully online */
      }
    })
    .catch(() => {
      /* plugin not present in this build — ignore */
    });
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>
  );
}
