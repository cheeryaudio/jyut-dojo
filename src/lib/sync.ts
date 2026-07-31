/**
 * 雲端同步 — transport and orchestration for opt-in progress sync.
 *
 * The pure three-way merge lives in domain/sync. Cloud documents stay flat and
 * backwards-compatible with deployed clients while carrying ignorable version metadata.
 */
import { apiBase } from './api';
import { track } from './analytics';
import { migrateProgress } from '../domain/progress/migrations';
import { PERSIST_VERSION, type ProgressData } from '../domain/progress/model';
import { selectPersistedProgress } from '../domain/progress/serialize';
import { mergeProgress } from '../domain/sync/mergeProgress';
import {
  SYNC_CONTRACT_VERSION,
  type RemoteProgress,
  type SyncPutRequest,
  type SyncPutResult,
  type SyncTransportEnvelope,
} from '../domain/sync/types';
import {
  loadSyncBaseline,
  replacePersistedProgress,
  saveSyncBaseline,
} from '../infrastructure/storage/progressStorage';
import { useProgress } from '../stores/progress';

export { mergeProgress } from '../domain/sync/mergeProgress';
export type RemoteState = SyncTransportEnvelope;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no easily-confused 0/O/1/I
const CODE_LEN = 10;
const CODE_RE = /^[A-Z0-9]{8,16}$/;
const DEBOUNCE_MS = 15_000;
const MAX_RETRY = 3;

export function isValidCode(code: string): boolean {
  return CODE_RE.test(code.toUpperCase());
}

/** Crypto-random code (falls back to Math.random only if WebCrypto is absent). */
export function generateCode(): string {
  const n = CODE_ALPHABET.length;
  let out = '';
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(CODE_LEN);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < CODE_LEN; i++) out += CODE_ALPHABET[buf[i] % n];
  } else {
    for (let i = 0; i < CODE_LEN; i++) {
      out += CODE_ALPHABET[Math.floor(Math.random() * n)];
    }
  }
  return out;
}

/** Snapshot only fields that belong in local persistence and cloud sync. */
function snapshot(): ProgressData {
  return selectPersistedProgress(useProgress.getState());
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function decodeRemoteProgress(raw: unknown): ProgressData {
  const record = asRecord(raw);
  const declaredVersion = record.progressVersion;
  const version = typeof declaredVersion === 'number' && Number.isInteger(declaredVersion)
    ? declaredVersion
    : 1;
  return migrateProgress(record, version);
}

function encodeRemoteProgress(state: ProgressData): RemoteProgress {
  return {
    ...selectPersistedProgress(state),
    syncVersion: SYNC_CONTRACT_VERSION,
    progressVersion: PERSIST_VERSION,
  };
}

function parseEnvelope(raw: unknown): SyncTransportEnvelope {
  const data = asRecord(raw);
  if (data.state === null || typeof data.state !== 'object' || Array.isArray(data.state)) {
    throw new Error('bad payload');
  }
  if (typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt))) {
    throw new Error('bad payload');
  }
  return {
    state: data.state,
    v: typeof data.v === 'number' && Number.isInteger(data.v) && data.v >= 0 ? data.v : 0,
    updatedAt: data.updatedAt,
    ...(data.conflict === true ? { conflict: true } : {}),
  };
}

async function putState(
  code: string,
  state: ProgressData,
  base?: { version?: number; updatedAt?: string },
): Promise<SyncPutResult> {
  const body: SyncPutRequest = {
    state: encodeRemoteProgress(state),
    ...(base?.version !== undefined ? { baseVersion: base.version } : {}),
    ...(base?.updatedAt !== undefined ? { base: base.updatedAt } : {}),
  };
  const res = await fetch(`${apiBase()}/sync/${code}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  });
  const responseBody = await res.json() as unknown;
  if (res.status === 409) return { ok: false, conflict: parseEnvelope(responseBody) };
  if (!res.ok) throw new Error(`sync PUT ${res.status}`);

  const response = asRecord(responseBody);
  if (response.ok !== true
    || typeof response.v !== 'number'
    || !Number.isInteger(response.v)
    || response.v < 0
    || typeof response.updatedAt !== 'string'
    || !Number.isFinite(Date.parse(response.updatedAt))) {
    throw new Error('bad sync PUT payload');
  }
  return {
    ok: true,
    envelope: { ok: true, v: response.v, updatedAt: response.updatedAt },
  };
}

/** Fetch the remote blob for a code. Returns null on 404, throws on other errors. */
export async function fetchRemote(code: string): Promise<RemoteState | null> {
  const res = await fetch(`${apiBase()}/sync/${code}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`sync GET ${res.status}`);
  return parseEnvelope(await res.json());
}

function rebaseLiveLocal(localAtStart: ProgressData, merged: ProgressData): void {
  const currentLocal = snapshot();
  const rebased = mergeProgress(localAtStart, merged, currentLocal);
  useProgress.setState(rebased);
}

/** GET → baseline-aware merge → versioned PUT; retries directly from 409 envelopes. */
async function pushMerged(code: string): Promise<void> {
  const localAtStart = snapshot();
  const storedBaseline = await loadSyncBaseline(code);
  let remoteEnvelope = await fetchRemote(code);
  let baselineState = storedBaseline?.state;

  if (!remoteEnvelope) {
    const result = await putState(code, localAtStart, { version: 0 });
    if (!result.ok) remoteEnvelope = result.conflict;
    else {
      await saveSyncBaseline(code, {
        state: localAtStart,
        version: result.envelope.v,
        updatedAt: result.envelope.updatedAt,
      });
      rebaseLiveLocal(localAtStart, localAtStart);
      return;
    }
  }

  if (!baselineState) {
    // No ancestor exists on an upgraded/restored installation. Treat the fetched
    // cloud document as already observed rather than re-adding local history.
    baselineState = decodeRemoteProgress(remoteEnvelope.state);
  }

  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    const remoteState = decodeRemoteProgress(remoteEnvelope.state);
    const merged = mergeProgress(baselineState, remoteState, localAtStart);
    const result = await putState(code, merged, {
      version: remoteEnvelope.v,
      updatedAt: remoteEnvelope.updatedAt,
    });
    if (!result.ok) {
      remoteEnvelope = result.conflict;
      continue;
    }

    await saveSyncBaseline(code, {
      state: merged,
      version: result.envelope.v,
      updatedAt: result.envelope.updatedAt,
    });
    rebaseLiveLocal(localAtStart, merged);
    return;
  }
  throw new Error('sync PUT gave up after retries');
}

/** Generate a fresh code, persist it, and push current progress immediately. */
export async function createSyncCode(): Promise<{ code: string; pushed: boolean }> {
  const code = generateCode();
  useProgress.getState().setSyncCode(code);
  track('sync_created');
  try {
    const local = snapshot();
    const result = await putState(code, local, { version: 0 });
    if (!result.ok) throw new Error('sync code collision');
    await saveSyncBaseline(code, {
      state: local,
      version: result.envelope.v,
      updatedAt: result.envelope.updatedAt,
    });
    useProgress.getState().setLastSyncAt(Date.now());
    return { code, pushed: true };
  } catch {
    return { code, pushed: false };
  }
}

/** Push current progress for the saved code. Silent no-op when offline / unset. */
export async function pushState(): Promise<void> {
  const code = useProgress.getState().settings.syncCode;
  if (!code || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  try {
    await pushMerged(code);
    useProgress.getState().setLastSyncAt(Date.now());
  } catch {
    /* offline / transient — retry on the next XP-earning action or hide */
  }
}

/** Coerce an untrusted remote blob into the current safe local shape. */
export function sanitizeState(raw: unknown, code: string, now: number = Date.now()): ProgressData {
  const safe = decodeRemoteProgress(raw);
  return {
    ...safe,
    settings: {
      ...safe.settings,
      syncCode: code,
      lastSyncAt: now,
    },
  };
}

function isRemoteEnvelope(value: unknown): value is RemoteState {
  const record = asRecord(value);
  return 'state' in record && 'updatedAt' in record && 'v' in record;
}

/**
 * Replace on-device progress and its baseline before reloading. Passing a raw
 * state remains supported for older callers; current UI passes the full envelope.
 */
export async function applyRestore(code: string, remote: RemoteState | unknown): Promise<void> {
  const envelope = isRemoteEnvelope(remote)
    ? parseEnvelope(remote)
    : {
        state: remote,
        v: 0,
        updatedAt: new Date().toISOString(),
      } satisfies RemoteState;
  const safe = sanitizeState(envelope.state, code);
  await Promise.all([
    replacePersistedProgress(safe, PERSIST_VERSION),
    saveSyncBaseline(code, {
      state: safe,
      version: envelope.v,
      updatedAt: envelope.updatedAt,
    }),
  ]);
  track('sync_restored');
  if (typeof location !== 'undefined') location.reload();
}

interface SyncRuntime {
  consumers: number;
  debounce: ReturnType<typeof setTimeout> | null;
  stop?: () => void;
}

type SyncGlobal = typeof globalThis & {
  __jyutDojoSyncRuntimeV1__?: SyncRuntime;
};

function syncRuntime(): SyncRuntime {
  const host = globalThis as SyncGlobal;
  host.__jyutDojoSyncRuntimeV1__ ??= { consumers: 0, debounce: null };
  return host.__jyutDojoSyncRuntimeV1__;
}

/** Flush any pending push right now (used on app background). */
function flushNow(): void {
  const runtime = syncRuntime();
  if (runtime.debounce) {
    clearTimeout(runtime.debounce);
    runtime.debounce = null;
  }
  void pushState();
}

/** Share one auto-push subscription across StrictMode/HMR callers. */
export function initSync(): () => void {
  const runtime = syncRuntime();
  if (runtime.consumers === 0) {
    const unsubscribe = useProgress.subscribe((state, prev) => {
      if (state.xpLog === prev.xpLog) return; // only react to XP-earning actions
      if (!state.settings.syncCode) return;
      if (runtime.debounce) clearTimeout(runtime.debounce);
      runtime.debounce = setTimeout(flushNow, DEBOUNCE_MS);
    });
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };
    const onPageHide = () => flushNow();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
    if (typeof window !== 'undefined') window.addEventListener('pagehide', onPageHide);

    runtime.stop = () => {
      unsubscribe();
      if (runtime.debounce) {
        clearTimeout(runtime.debounce);
        runtime.debounce = null;
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', onPageHide);
    };
  }

  runtime.consumers += 1;
  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;
    runtime.consumers = Math.max(0, runtime.consumers - 1);
    if (runtime.consumers === 0) {
      runtime.stop?.();
      runtime.stop = undefined;
    }
  };
}
