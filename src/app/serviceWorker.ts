/**
 * Service worker lifecycle, controlled rather than automatic.
 *
 * A silent auto-update can swap the bundle under a learner mid-quiz and lose
 * unsaved answers, so the worker installs quietly and the app asks before
 * activating. Registration happens once per page load; React subscribes to the
 * resulting state instead of owning it.
 */
import { Capacitor } from '@capacitor/core';

type UpdateFn = (reloadPage?: boolean) => Promise<void>;

export interface ServiceWorkerState {
  /** A new build is installed and waiting for the learner to accept it. */
  needRefresh: boolean;
  /** Everything needed to run offline has been precached. */
  offlineReady: boolean;
}

let state: ServiceWorkerState = { needRefresh: false, offlineReady: false };
let applyUpdateFn: UpdateFn | null = null;
let started = false;

const listeners = new Set<() => void>();

function setState(next: Partial<ServiceWorkerState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export function getServiceWorkerState(): ServiceWorkerState {
  return state;
}

export function subscribeServiceWorker(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Activate the waiting worker and reload onto the new build. */
export async function applyServiceWorkerUpdate(): Promise<void> {
  if (!applyUpdateFn) return;
  setState({ needRefresh: false });
  await applyUpdateFn(true);
}

/** Dismiss the prompt for this session; the update lands on the next visit. */
export function dismissServiceWorkerUpdate(): void {
  setState({ needRefresh: false });
}

/** Register the worker on the web. Native shells ship their own assets. */
export function startServiceWorker(): void {
  if (started) return;
  if (Capacitor.isNativePlatform()) return;
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  started = true;

  void import('virtual:pwa-register')
    .then(({ registerSW }) => {
      applyUpdateFn = registerSW({
        immediate: true,
        onNeedRefresh: () => setState({ needRefresh: true }),
        onOfflineReady: () => setState({ offlineReady: true }),
      });
    })
    .catch(() => {
      // Service workers are an enhancement; the app remains usable without one.
    });
}
