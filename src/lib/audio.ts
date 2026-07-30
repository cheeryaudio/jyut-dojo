// Audio playback + decoding. Resolves the data's absolute "/audio/..." paths
// through Vite's BASE_URL so everything works from file:// or any static
// subpath. A missing/ungenerated mp3 must never throw — play() rejections are
// swallowed and a subtle "音訊未生成" toast is shown at most once.
//
// Playback honours two live settings (read fresh from the store each play):
//  - 語速 (audioSpeed): 'slow' plays at 0.72× rate.
//  - 聲音 (voice): 'male' remaps sentence audio to /audio/sentences-m/. Only
//    sentences have a male set; if a male file 404s we silently fall back to the
//    female path. Words / tones / basics / pinyin are always female.

import { useProgress } from '../stores/progress';

const TOAST_EVENT = 'jyut-toast';
const SLOW_RATE = 0.72;
const SENTENCE_DIR = '/audio/sentences/';
const SENTENCE_MALE_DIR = '/audio/sentences-m/';
let missingToastShown = false;
/** Male sentence paths known to 404 — once seen, we skip straight to female. */
const missingMalePaths = new Set<string>();

/** Fire a transient toast (listened to by <ToastHost/>). */
export function toast(message: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}

export const TOAST_EVENT_NAME = TOAST_EVENT;

function notifyMissingOnce(): void {
  if (missingToastShown) return;
  missingToastShown = true;
  toast('音訊未生成');
}

/** Turn a data audio path ("/audio/words/x.mp3") into a base-relative URL. */
export function audioUrl(path: string): string {
  const base = import.meta.env.BASE_URL || './';
  return base + path.replace(/^\/+/, '');
}

const elements = new Map<string, HTMLAudioElement>();

function element(path: string): HTMLAudioElement {
  const url = audioUrl(path);
  let el = elements.get(url);
  if (!el) {
    el = new Audio(url);
    el.preload = 'none';
    elements.set(url, el);
  }
  return el;
}

function playbackRate(): number {
  try {
    return useProgress.getState().settings.audioSpeed === 'slow' ? SLOW_RATE : 1;
  } catch {
    return 1;
  }
}

/** Map a sentence path to the male voice set when 男聲 is selected. */
function resolveVoice(path: string): string {
  try {
    if (useProgress.getState().settings.voice === 'male' && path.startsWith(SENTENCE_DIR)) {
      const male = SENTENCE_MALE_DIR + path.slice(SENTENCE_DIR.length);
      // If this male file already 404'd once, don't try it again — go female.
      return missingMalePaths.has(male) ? path : male;
    }
  } catch {
    /* fall through to female */
  }
  return path;
}

/**
 * Paths worth warming for offline use: the voice the learner actually hears
 * first, plus the female fallback the player drops to when a male file is
 * missing. Keeps offline packs honest for both voice settings.
 */
export function offlineAudioPaths(path: string): string[] {
  const resolved = resolveVoice(path);
  return resolved === path ? [path] : [resolved, path];
}

async function playPath(path: string, rate: number): Promise<void> {
  const el = element(path);
  el.playbackRate = rate;
  el.currentTime = 0;
  await el.play();
}

/** Play an audio file. Never rejects; missing files show a one-time toast. */
export async function playAudio(path: string): Promise<void> {
  const rate = playbackRate();
  const resolved = resolveVoice(path);
  try {
    await playPath(resolved, rate);
  } catch {
    // Male file missing → remember it, then silently fall back to female.
    if (resolved !== path) {
      missingMalePaths.add(resolved);
      try {
        await playPath(path, rate);
        return;
      } catch {
        /* female also failed — treat as ungenerated */
      }
    }
    notifyMissingOnce();
  }
}

let sharedCtx: AudioContext | null = null;

function audioContext(): AudioContext {
  if (!sharedCtx) {
    const Ctor: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

/** Fetch + decode an audio path into an AudioBuffer. Throws on failure. */
export async function decodeAudioPath(path: string): Promise<AudioBuffer> {
  const res = await fetch(audioUrl(path));
  if (!res.ok) throw new Error(`audio ${res.status}`);
  const bytes = await res.arrayBuffer();
  return audioContext().decodeAudioData(bytes);
}

/** Decode an in-memory Blob (e.g. a MediaRecorder recording). */
export async function decodeBlob(blob: Blob): Promise<AudioBuffer> {
  const bytes = await blob.arrayBuffer();
  return audioContext().decodeAudioData(bytes);
}

/** Play an already-decoded AudioBuffer (used by 跟讀對比 A/B replay). */
export function playBuffer(buffer: AudioBuffer): void {
  const ctx = audioContext();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start();
}
