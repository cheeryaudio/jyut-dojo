import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const progress = vi.hoisted(() => {
  type MockState = {
    xpLog: Record<string, number>;
    settings: { syncCode: string };
  };
  type Listener = (next: MockState, previous: MockState) => void;

  let state: MockState = { xpLog: {}, settings: { syncCode: 'SYNC1234' } };
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
      state = { xpLog: {}, settings: { syncCode: 'SYNC1234' } };
      listeners.clear();
    },
    earnXp: () => {
      const previous = state;
      state = { ...state, xpLog: { today: 10 } };
      for (const listener of listeners) listener(state, previous);
    },
    listenerCount: () => listeners.size,
  };
});

vi.mock('../stores/progress', () => ({
  useProgress: progress.store,
  PERSIST_VERSION: 2,
}));
vi.mock('./analytics', () => ({ track: vi.fn() }));
vi.mock('./api', () => ({ apiBase: () => 'https://example.test/api' }));

import { initSync } from './sync';

const cleanups: Array<() => void> = [];

beforeEach(() => {
  vi.useFakeTimers();
  progress.reset();
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
  delete (globalThis as typeof globalThis & {
    __jyutDojoSyncRuntimeV1__?: unknown;
  }).__jyutDojoSyncRuntimeV1__;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('sync initialization lifecycle', () => {
  it('shares one subscription and removes pending work on final cleanup', () => {
    const first = initSync();
    const second = initSync();
    cleanups.push(first, second);

    expect(progress.listenerCount()).toBe(1);
    expect(document.addEventListener).toHaveBeenCalledTimes(1);
    expect(window.addEventListener).toHaveBeenCalledTimes(1);

    progress.earnXp();
    expect(vi.getTimerCount()).toBe(1);

    first();
    expect(progress.listenerCount()).toBe(1);
    expect(vi.getTimerCount()).toBe(1);

    second();
    expect(progress.listenerCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(document.removeEventListener).toHaveBeenCalledTimes(1);
    expect(window.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
