/**
 * Anonymous, privacy-light usage analytics.
 *
 * Analytics starts only after progress hydration. The persisted preference is
 * checked both when accepting and when flushing events, so opting out clears
 * pending data immediately and prevents any later send.
 */
import { apiBase } from './api';
import { useProgress } from '../stores/progress';

export interface AnalyticsEvent {
  name: string;
  props?: Record<string, string | number | boolean>;
  device: string;
  ts: string;
}

const DEVICE_KEY = 'jyut-device';
const SESSION_OPEN_KEY = 'jyut-open';
const MAX_BATCH = 50;
const FLUSH_AT = 20;
const FLUSH_EVERY_MS = 60_000;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

interface AnalyticsRuntime {
  queue: AnalyticsEvent[];
  consumers: number;
  stop?: () => void;
}

type AnalyticsGlobal = typeof globalThis & {
  __jyutDojoAnalyticsRuntimeV1__?: AnalyticsRuntime;
};

function runtime(): AnalyticsRuntime {
  const host = globalThis as AnalyticsGlobal;
  host.__jyutDojoAnalyticsRuntimeV1__ ??= { queue: [], consumers: 0 };
  return host.__jyutDojoAnalyticsRuntimeV1__;
}

function randomId(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

/** Stable anonymous device id (created + persisted on first accepted event). */
export function deviceId(): string {
  if (typeof localStorage === 'undefined') return 'nodevice0000';
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = randomId(12);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'nodevice0000';
  }
}

function enabled(): boolean {
  try {
    const state = useProgress.getState();
    return state.hasHydrated && state.settings.analyticsEnabled;
  } catch {
    return false;
  }
}

/** Send up to MAX_BATCH queued events. Disabled analytics always clears/refuses. */
export function flush(): void {
  const state = runtime();
  if (!enabled()) {
    state.queue = [];
    return;
  }
  if (state.queue.length === 0 || typeof navigator === 'undefined') return;

  const batch = state.queue.slice(0, MAX_BATCH);
  state.queue = state.queue.slice(MAX_BATCH);
  const url = `${apiBase()}/events`;
  const body = JSON.stringify(batch);

  try {
    const beacon = navigator.sendBeacon?.bind(navigator);
    if (beacon && beacon(url, new Blob([body], { type: 'application/json' }))) return;
  } catch {
    // Fall through to fetch.
  }

  try {
    void fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Failed analytics are deliberately dropped and never surfaced.
    });
  } catch {
    // Fetch can be unavailable in non-browser runtimes.
  }
}

/** Queue an event. No-op until hydration completes or when analytics is disabled. */
export function track(name: string, props?: Record<string, string | number | boolean>): void {
  if (!enabled()) return;
  const state = runtime();
  state.queue.push({ name, props, device: deviceId(), ts: new Date().toISOString() });
  if (state.queue.length >= FLUSH_AT) flush();
}

function trackSessionOpen(): void {
  if (!enabled()) return;
  if (typeof sessionStorage === 'undefined') {
    track('app_open');
    return;
  }

  try {
    if (sessionStorage.getItem(SESSION_OPEN_KEY)) return;
  } catch {
    track('app_open');
    return;
  }

  track('app_open');
  try {
    sessionStorage.setItem(SESSION_OPEN_KEY, '1');
  } catch {
    // The event was accepted; blocked session storage should not duplicate it.
  }
}

/**
 * Wire up flush triggers and preference changes. Multiple callers share one
 * process-wide runtime; each receives an idempotent cleanup function.
 */
export function initAnalytics(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;

  const state = runtime();
  if (state.consumers === 0) {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    const onPageHide = () => flush();
    const unsubscribe = useProgress.subscribe((next, previous) => {
      const isEnabled = next.hasHydrated && next.settings.analyticsEnabled;
      const wasEnabled = previous.hasHydrated && previous.settings.analyticsEnabled;
      if (!isEnabled) {
        runtime().queue = [];
      } else if (!wasEnabled) {
        trackSessionOpen();
      }
    });
    const interval = window.setInterval(flush, FLUSH_EVERY_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    state.stop = () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.clearInterval(interval);
    };
    trackSessionOpen();
  }

  state.consumers += 1;
  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;
    state.consumers = Math.max(0, state.consumers - 1);
    if (state.consumers === 0) {
      state.stop?.();
      state.stop = undefined;
    }
  };
}
