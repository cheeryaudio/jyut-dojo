import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The registration path needs a browser; these cover the state machine React
 * subscribes to — the part that decides whether a learner is interrupted.
 */
async function freshModule() {
  vi.resetModules();
  return import('./serviceWorker');
}

describe('service worker state', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('starts with nothing pending', async () => {
    const module = await freshModule();
    expect(module.getServiceWorkerState()).toEqual({ needRefresh: false, offlineReady: false });
  });

  it('notifies subscribers and stops after unsubscribe', async () => {
    const module = await freshModule();
    const listener = vi.fn();
    const unsubscribe = module.subscribeServiceWorker(listener);

    module.dismissServiceWorkerUpdate();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    module.dismissServiceWorkerUpdate();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns a stable snapshot object between changes', async () => {
    const module = await freshModule();
    expect(module.getServiceWorkerState()).toBe(module.getServiceWorkerState());
  });

  it('does nothing when asked to apply an update that does not exist', async () => {
    const module = await freshModule();
    await expect(module.applyServiceWorkerUpdate()).resolves.toBeUndefined();
    expect(module.getServiceWorkerState().needRefresh).toBe(false);
  });
});
