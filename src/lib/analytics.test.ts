import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const progress = vi.hoisted(() => {
  type MockState = {
    hasHydrated: boolean;
    settings: { analyticsEnabled: boolean };
  };
  type Listener = (next: MockState, previous: MockState) => void;

  let state: MockState = { hasHydrated: true, settings: { analyticsEnabled: false } };
  const listeners = new Set<Listener>();

  return {
    store: {
      getState: () => state,
      subscribe: (listener: Listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    reset: () => {
      state = { hasHydrated: true, settings: { analyticsEnabled: false } };
      listeners.clear();
    },
    setConsent: (analyticsEnabled: boolean, hasHydrated = true, notify = true) => {
      const previous = state;
      state = { hasHydrated, settings: { analyticsEnabled } };
      if (notify) for (const listener of listeners) listener(state, previous);
    },
  };
});

vi.mock('../stores/progress', () => ({ useProgress: progress.store }));
vi.mock('./api', () => ({ apiBase: () => 'https://example.test/api' }));

import { flush, initAnalytics, track } from './analytics';

const cleanups: Array<() => void> = [];

beforeEach(() => {
  progress.reset();
  const local = new Map<string, string>();
  const session = new Map<string, string>([['jyut-open', '1']]);

  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => local.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => local.set(key, value)),
  });
  vi.stubGlobal('sessionStorage', {
    getItem: vi.fn((key: string) => session.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => session.set(key, value)),
  });
  vi.stubGlobal('navigator', { sendBeacon: vi.fn(() => true) });
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setInterval: vi.fn(() => 1),
    clearInterval: vi.fn(),
  });
});

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
  progress.setConsent(false, true, false);
  flush();
  delete (globalThis as typeof globalThis & {
    __jyutDojoAnalyticsRuntimeV1__?: unknown;
  }).__jyutDojoAnalyticsRuntimeV1__;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('analytics lifecycle and consent', () => {
  it('shares one set of listeners and cleans up on the final release', () => {
    const first = initAnalytics();
    const second = initAnalytics();
    cleanups.push(first, second);

    expect(document.addEventListener).toHaveBeenCalledTimes(1);
    expect(window.addEventListener).toHaveBeenCalledTimes(1);
    expect(window.setInterval).toHaveBeenCalledTimes(1);

    first();
    expect(document.removeEventListener).not.toHaveBeenCalled();
    first();
    expect(document.removeEventListener).not.toHaveBeenCalled();

    second();
    expect(document.removeEventListener).toHaveBeenCalledTimes(1);
    expect(window.removeEventListener).toHaveBeenCalledTimes(1);
    expect(window.clearInterval).toHaveBeenCalledTimes(1);
  });

  it('clears queued events on opt-out and refuses to flush while disabled', async () => {
    progress.setConsent(true);
    cleanups.push(initAnalytics());

    track('before_opt_out');
    progress.setConsent(false);
    progress.setConsent(true);
    track('after_opt_in');
    flush();

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    const body = vi.mocked(navigator.sendBeacon).mock.calls[0][1] as Blob;
    const events = JSON.parse(await body.text()) as Array<{ name: string }>;
    expect(events.map((event) => event.name)).toEqual(['after_opt_in']);

    track('must_not_send');
    progress.setConsent(false, true, false);
    flush();
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('does not collect before persisted consent has hydrated', () => {
    progress.setConsent(true, false);
    cleanups.push(initAnalytics());

    track('too_early');
    flush();

    expect(navigator.sendBeacon).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();

    progress.setConsent(true, true);
    track('after_hydration');
    flush();
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });
});
