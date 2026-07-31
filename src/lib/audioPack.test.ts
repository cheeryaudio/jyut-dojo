import { afterEach, describe, expect, it, vi } from 'vitest';

// Stub the player: it reaches into the persisted store, which needs a browser.
vi.mock('./audio', () => ({
  audioUrl: (path: string) => `./${path.replace(/^\/+/, '')}`,
  offlineAudioPaths: (path: string) => [path],
}));

const { downloadPack } = await import('./audioPack');

const originalFetch = globalThis.fetch;

function stubFetch(handler: (url: string) => { ok: boolean } | Promise<{ ok: boolean }>) {
  const calls: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const { ok } = await handler(url);
    return { ok, arrayBuffer: async () => new ArrayBuffer(4) } as unknown as Response;
  }) as unknown as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('downloadPack', () => {
  it('fetches every file once and reports progress to completion', async () => {
    const calls = stubFetch(() => ({ ok: true }));
    const progress: number[] = [];

    const result = await downloadPack(
      ['/audio/words/a.mp3', '/audio/words/b.mp3', '/audio/words/a.mp3'],
      (done) => progress.push(done)
    );

    // The duplicate collapses: two distinct files, two fetches.
    expect(calls).toHaveLength(2);
    expect(result).toEqual({ ok: 2, failed: 0 });
    expect(progress.at(-1)).toBe(2);
  });

  it('counts missing files as failed without rejecting', async () => {
    stubFetch((url) => ({ ok: !url.endsWith('gone.mp3') }));

    const result = await downloadPack(['/audio/words/here.mp3', '/audio/words/gone.mp3']);

    expect(result).toEqual({ ok: 1, failed: 1 });
  });

  it('survives a network error mid-pack', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('boom.mp3')) throw new Error('offline');
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) } as unknown as Response;
    }) as unknown as typeof fetch;

    const result = await downloadPack(['/audio/words/ok.mp3', '/audio/words/boom.mp3']);

    expect(result).toEqual({ ok: 1, failed: 1 });
  });

  it('stops early when aborted', async () => {
    const controller = new AbortController();
    const calls = stubFetch(() => {
      controller.abort();
      return { ok: true };
    });

    const paths = Array.from({ length: 40 }, (_, index) => `/audio/words/w${index}.mp3`);
    await downloadPack(paths, undefined, controller.signal);

    // Only the in-flight batch may finish; the rest is skipped.
    expect(calls.length).toBeLessThan(paths.length);
  });

  it('handles an empty pack', async () => {
    stubFetch(() => ({ ok: true }));
    await expect(downloadPack([])).resolves.toEqual({ ok: 0, failed: 0 });
  });
});
