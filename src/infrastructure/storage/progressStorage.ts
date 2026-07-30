import localforage from 'localforage';
import type { StateStorage } from 'zustand/middleware';
import { coerceProgressData } from '../../domain/progress/migrations';
import { PERSIST_VERSION } from '../../domain/progress/model';
import { selectPersistedProgress } from '../../domain/progress/serialize';
import type { SyncBaseline } from '../../domain/sync/types';

export const PERSIST_KEY = 'jyut-dojo';
export const SYNC_BASELINE_PREFIX = 'jyut-dojo-sync-baseline:';

localforage.config({ name: 'jyut-dojo', storeName: 'progress' });

export const progressStorage: StateStorage = {
  getItem: (name) => localforage.getItem<string>(name).then((value) => value ?? null),
  setItem: (name, value) => localforage.setItem(name, value).then(() => undefined),
  removeItem: (name) => localforage.removeItem(name),
};

/** Replace the complete Zustand persistence envelope used by restore. */
export async function replacePersistedProgress(
  state: unknown,
  version: number = PERSIST_VERSION,
): Promise<void> {
  await progressStorage.setItem(PERSIST_KEY, JSON.stringify({ state, version }));
}

function syncBaselineKey(code: string): string {
  return `${SYNC_BASELINE_PREFIX}${code.toUpperCase()}`;
}

function parseStoredValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

/** Load and normalize the last successful cloud document for a sync code. */
export async function loadSyncBaseline(code: string): Promise<SyncBaseline | null> {
  const stored = parseStoredValue(await localforage.getItem<unknown>(syncBaselineKey(code)));
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
  const raw = stored as Record<string, unknown>;
  if (!Number.isInteger(raw.version) || (raw.version as number) < 0) return null;
  if (typeof raw.updatedAt !== 'string' || !Number.isFinite(Date.parse(raw.updatedAt))) return null;

  return {
    state: selectPersistedProgress(coerceProgressData(raw.state)),
    version: raw.version as number,
    updatedAt: raw.updatedAt,
  };
}

/** Save a sanitized baseline separately from the Zustand persistence envelope. */
export async function saveSyncBaseline(code: string, baseline: SyncBaseline): Promise<void> {
  const safe: SyncBaseline = {
    state: selectPersistedProgress(coerceProgressData(baseline.state)),
    version: Number.isInteger(baseline.version) && baseline.version >= 0 ? baseline.version : 0,
    updatedAt: Number.isFinite(Date.parse(baseline.updatedAt))
      ? baseline.updatedAt
      : new Date(0).toISOString(),
  };
  await localforage.setItem(syncBaselineKey(code), safe);
}

export async function clearSyncBaseline(code: string): Promise<void> {
  await localforage.removeItem(syncBaselineKey(code));
}
