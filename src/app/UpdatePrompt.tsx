import { useSyncExternalStore } from 'react';
import { UI } from '../lib/ui';
import {
  applyServiceWorkerUpdate,
  dismissServiceWorkerUpdate,
  getServiceWorkerState,
  subscribeServiceWorker,
} from './serviceWorker';

/** Bottom banner offering the freshly installed build. Renders nothing until one exists. */
export function UpdatePrompt() {
  const state = useSyncExternalStore(subscribeServiceWorker, getServiceWorkerState, getServiceWorkerState);

  if (!state.needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-card"
    >
      <div className="flex-1">
        <div className="text-sm font-medium text-ink">{UI.pwa_updateTitle}</div>
        <div className="text-xs text-tone6 mt-0.5">{UI.pwa_updateHint}</div>
      </div>
      <button type="button" onClick={dismissServiceWorkerUpdate} className="text-xs text-tone6">
        {UI.pwa_updateLater}
      </button>
      <button
        type="button"
        onClick={() => void applyServiceWorkerUpdate()}
        className="btn-primary !py-2 !px-3 text-sm"
      >
        {UI.pwa_updateNow}
      </button>
    </div>
  );
}
