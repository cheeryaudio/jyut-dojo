import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppBootstrap } from './app/AppBootstrap';
import { startServiceWorker } from './app/serviceWorker';
import './index.css';

startServiceWorker();

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <AppBootstrap />
    </StrictMode>
  );
}
