import type { ProgressData } from '../progress/model';

/** Version of the cloud document contract (independent of local persistence migrations). */
export const SYNC_CONTRACT_VERSION = 1 as const;

/**
 * Cloud progress remains a flat ProgressData object so already-deployed clients can
 * continue reading it. New clients add metadata that old clients safely ignore.
 */
export interface RemoteProgress extends ProgressData {
  syncVersion: typeof SYNC_CONTRACT_VERSION;
  progressVersion: number;
}

/** Last document this device successfully observed for one sync code. */
export interface SyncBaseline {
  state: ProgressData;
  /** Server-side integer revision (`v`). */
  version: number;
  updatedAt: string;
}

/** GET response and 409 conflict body. `state` stays unknown until migrated. */
export interface SyncTransportEnvelope {
  state: unknown;
  v: number;
  updatedAt: string;
  conflict?: boolean;
}

export interface SyncPutRequest {
  state: RemoteProgress;
  baseVersion?: number;
  /** Legacy timestamp concurrency token for servers/clients during rollout. */
  base?: string;
}

export interface SyncPutSuccess {
  ok: true;
  v: number;
  updatedAt: string;
}

export type SyncPutResult =
  | { ok: true; envelope: SyncPutSuccess }
  | { ok: false; conflict: SyncTransportEnvelope };
