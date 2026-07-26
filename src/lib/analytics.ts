/**
 * Anonymous, privacy-light usage analytics.
 *
 * - A random 12-char device id is generated once and kept in localStorage
 *   (survives a progress reset; never contains anything personal).
 * - `track()` queues an event; the queue flushes in batches (≤50) via
 *   `navigator.sendBeacon` (with a keepalive `fetch` fallback) on page-hide,
 *   every 60s, and whenever it reaches 20 events. Everything is fire-and-forget
 *   — a failed send just drops that batch, never throws, never blocks the UI.
 * - Honours the 匿名使用統計 setting: when off, `track()` is a no-op.
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

function randomId(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

/** Stable anonymous device id (created + persisted on first read). */
export function deviceId(): string {
  if (typeof localStorage === 'undefined') return 'nodevice0000';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = randomId(12);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

let queue: AnalyticsEvent[] = [];

function enabled(): boolean {
  try {
    return useProgress.getState().settings.analyticsEnabled;
  } catch {
    return false;
  }
}

/** Send up to MAX_BATCH queued events. Fire-and-forget; drops on failure. */
export function flush(): void {
  if (queue.length === 0) return;
  if (typeof navigator === 'undefined') return;
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);
  const url = `${apiBase()}/events`;
  const body = JSON.stringify(batch);
  try {
    const beacon = navigator.sendBeacon?.bind(navigator);
    if (beacon && beacon(url, new Blob([body], { type: 'application/json' }))) return;
  } catch {
    /* fall through to fetch */
  }
  void fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    /* dropped — nothing we can do, and we never surface it */
  });
}

/** Queue an event. No-op when analytics is disabled. */
export function track(name: string, props?: Record<string, string | number | boolean>): void {
  if (!enabled()) return;
  queue.push({ name, props, device: deviceId(), ts: new Date().toISOString() });
  if (queue.length >= FLUSH_AT) flush();
}

let started = false;

/** Wire up flush triggers + fire a once-per-session app_open. Idempotent. */
export function initAnalytics(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
  window.setInterval(flush, FLUSH_EVERY_MS);

  try {
    if (!sessionStorage.getItem(SESSION_OPEN_KEY)) {
      sessionStorage.setItem(SESSION_OPEN_KEY, '1');
      track('app_open');
    }
  } catch {
    track('app_open');
  }
}
