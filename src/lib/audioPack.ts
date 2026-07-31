/**
 * Offline audio packs.
 *
 * Downloading a pack just fetches its mp3s: the service worker's CacheFirst
 * audio route stores each response, so the next playback is offline-capable.
 * Without a service worker (dev, file://, native shell) the fetches still warm
 * the HTTP cache and nothing breaks — the feature degrades, it does not fail.
 */
import { Capacitor } from '@capacitor/core';
import { audioUrl, offlineAudioPaths } from './audio';

/** Must match the runtimeCaching cacheName in vite.config.ts. */
export const AUDIO_CACHE_NAME = 'jyut-audio-v1';

/** Parallel fetches: enough to be quick on mobile data, gentle on the server. */
const CONCURRENCY = 6;
/** How many URLs to probe when deciding whether a pack is already offline. */
const PROBE_SAMPLE = 12;

export interface PackDownloadResult {
  ok: number;
  failed: number;
}

function expandPaths(paths: readonly string[]): string[] {
  return [...new Set(paths.flatMap((path) => offlineAudioPaths(path)))];
}

async function warm(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    // Some browsers only commit the entry once the body has been consumed.
    await response.arrayBuffer();
    return true;
  } catch {
    return false;
  }
}

/**
 * Download every file in a pack. Reports progress as files settle and resolves
 * with per-file outcomes; a missing male-voice file is a normal `failed`.
 */
export async function downloadPack(
  paths: readonly string[],
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<PackDownloadResult> {
  const urls = expandPaths(paths).map((path) => audioUrl(path));
  const total = urls.length;
  let done = 0;
  let ok = 0;
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < urls.length) {
      if (signal?.aborted) return;
      const url = urls[cursor];
      cursor += 1;
      if (await warm(url)) ok += 1;
      done += 1;
      onProgress?.(done, total);
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
  return { ok, failed: done - ok };
}

/**
 * Whether offline packs mean anything here. Native shells bundle every mp3 in
 * the app package already, so downloading them again would be pure waste.
 */
export function offlineAudioSupported(): boolean {
  return typeof caches !== 'undefined' && !Capacitor.isNativePlatform();
}

/**
 * Rough "is this pack already offline?" check. Probes a sample rather than the
 * whole pack so opening 進度 stays cheap on a 300-file stage.
 */
export async function isPackCached(paths: readonly string[]): Promise<boolean> {
  if (!offlineAudioSupported() || paths.length === 0) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const step = Math.max(1, Math.floor(paths.length / PROBE_SAMPLE));
    const sample: string[] = [];
    for (let index = 0; index < paths.length && sample.length < PROBE_SAMPLE; index += step) {
      sample.push(audioUrl(paths[index]));
    }
    const hits = await Promise.all(sample.map((url) => cache.match(url)));
    return hits.every((hit) => hit !== undefined);
  } catch {
    return false;
  }
}
