/**
 * 雲端同步 — opt-in progress sync via a short code.
 *
 * The code is a bearer key: whoever holds it can read/replace the JSON progress
 * blob stored under it. We only ever sync learning progress (the persisted
 * Zustand state) — no accounts, no personal data.
 *
 *   PUT  /sync/:CODE  {state, base?}  → optimistic-concurrency save
 *   GET  /sync/:CODE                   → {state, updatedAt}
 *
 * Two-device safety: a push is GET → field-merge → PUT-with-base. If the server
 * moved on since our GET (409), we re-merge against the newer blob and retry, so
 * concurrent devices UNION their progress instead of clobbering. Restore replaces
 * the on-device blob (after shape validation) and reloads to re-hydrate cleanly.
 */
import localforage from 'localforage';
import { apiBase } from './api';
import { track } from './analytics';
import { useProgress, PERSIST_VERSION } from '../stores/progress';

const PERSIST_KEY = 'jyut-dojo';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no easily-confused 0/O/1/I
const CODE_LEN = 10;
const CODE_RE = /^[A-Z0-9]{8,16}$/;
const DEBOUNCE_MS = 15_000;
const MAX_RETRY = 3;

export interface RemoteState {
  state: Record<string, unknown>;
  updatedAt: string;
}

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
    for (let i = 0; i < CODE_LEN; i++) out += CODE_ALPHABET[Math.floor(Math.random() * n)];
  }
  return out;
}

/** JSON-safe snapshot of the current persisted store state (functions dropped). */
function snapshot(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(useProgress.getState())) as Record<string, unknown>;
}

// ---- field-level merge (pure; unit-tested) ----

const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const asArr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function unionStrings(a: unknown, b: unknown): string[] {
  return [...new Set([...asArr<string>(a), ...asArr<string>(b)].filter((x) => typeof x === 'string'))];
}
function maxByKey(a: unknown, b: unknown): Record<string, number> {
  const oa = asObj(a), ob = asObj(b), out: Record<string, number> = {};
  for (const k of new Set([...Object.keys(oa), ...Object.keys(ob)])) out[k] = Math.max(num(oa[k]), num(ob[k]));
  return out;
}

/**
 * Merge two progress blobs so nothing a user did on either device is lost.
 * Additive collections union / max; settings prefer `local` (the device pushing
 * reflects the user's latest choices). Exported for tests.
 */
export function mergeProgress(
  remote: Record<string, unknown>,
  local: Record<string, unknown>,
): Record<string, unknown> {
  // reviewCards: keep the more-progressed card (more reps; tie → later due)
  const rc = asObj(remote.reviewCards), lc = asObj(local.reviewCards);
  const cards: Record<string, unknown> = {};
  for (const id of new Set([...Object.keys(rc), ...Object.keys(lc)])) {
    const r = asObj(rc[id]), l = asObj(lc[id]);
    if (!rc[id]) { cards[id] = lc[id]; continue; }
    if (!lc[id]) { cards[id] = rc[id]; continue; }
    if (num(l.reps) > num(r.reps)) cards[id] = l;
    else if (num(r.reps) > num(l.reps)) cards[id] = r;
    else cards[id] = String(l.due) >= String(r.due) ? l : r;
  }

  // wrongItems: union by id, keep the one closer to retirement (more correct)
  const wi = new Map<string, Record<string, unknown>>();
  for (const it of [...asArr<Record<string, unknown>>(remote.wrongItems), ...asArr<Record<string, unknown>>(local.wrongItems)]) {
    const id = String(it?.id ?? '');
    if (!id) continue;
    const prev = wi.get(id);
    if (!prev || num(it.correctCount) > num(prev.correctCount)) wi.set(id, it);
  }

  // toneAnswers: concat, newest 500 by ts
  const tones = [...asArr<Record<string, unknown>>(remote.toneAnswers), ...asArr<Record<string, unknown>>(local.toneAnswers)]
    .sort((a, b) => num(a.ts) - num(b.ts))
    .slice(-500);

  return {
    ...remote,
    ...local, // local wins for any scalar/unknown field (incl. settings) by default
    learnedScenarios: unionStrings(remote.learnedScenarios, local.learnedScenarios),
    practicedScenarios: unionStrings(remote.practicedScenarios, local.practicedScenarios),
    pinyinDone: unionStrings(remote.pinyinDone, local.pinyinDone),
    basicsLearned: unionStrings(remote.basicsLearned, local.basicsLearned),
    tonesIntroVisited: Boolean(remote.tonesIntroVisited) || Boolean(local.tonesIntroVisited),
    tonedrillBest: Math.max(num(remote.tonedrillBest), num(local.tonedrillBest)),
    quizStars: maxByKey(remote.quizStars, local.quizStars),
    activityLog: maxByKey(remote.activityLog, local.activityLog),
    xpLog: maxByKey(remote.xpLog, local.xpLog),
    reviewCards: cards,
    wrongItems: [...wi.values()],
    toneAnswers: tones,
    settings: { ...asObj(remote.settings), ...asObj(local.settings) },
  };
}

interface PutResult { ok: boolean; conflict?: RemoteState }

async function putState(code: string, state: unknown, base?: string): Promise<PutResult> {
  const res = await fetch(`${apiBase()}/sync/${code}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state, base }),
    keepalive: true,
  });
  if (res.status === 409) return { ok: false, conflict: (await res.json()) as RemoteState };
  if (!res.ok) throw new Error(`sync PUT ${res.status}`);
  return { ok: true };
}

/** Fetch the remote blob for a code. Returns null on 404, throws on other errors. */
export async function fetchRemote(code: string): Promise<RemoteState | null> {
  const res = await fetch(`${apiBase()}/sync/${code}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`sync GET ${res.status}`);
  const data = (await res.json()) as RemoteState;
  if (!data || typeof data !== 'object' || typeof data.state !== 'object') throw new Error('bad payload');
  return data;
}

/** GET → merge → PUT with optimistic concurrency; retries on 409. */
async function pushMerged(code: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    const remote = await fetchRemote(code);
    if (!remote) {
      const r = await putState(code, snapshot()); // first push for this code
      if (r.ok) return;
      continue;
    }
    const merged = mergeProgress(remote.state, snapshot());
    const r = await putState(code, merged, remote.updatedAt);
    if (r.ok) return;
    // 409: someone else wrote between our GET and PUT — loop and re-merge.
  }
  throw new Error('sync PUT gave up after retries');
}

/**
 * Generate a fresh code, persist it, and push current progress immediately.
 * Saves the code even if the push fails so the debounced retry can catch up.
 */
export async function createSyncCode(): Promise<{ code: string; pushed: boolean }> {
  const code = generateCode();
  useProgress.getState().setSyncCode(code);
  track('sync_created');
  try {
    await putState(code, snapshot()); // brand-new code: no base needed
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

// ---- restore ----

const STRING_ARR_KEYS = ['learnedScenarios', 'practicedScenarios', 'pinyinDone', 'basicsLearned'];
const REC_KEYS = ['quizStars', 'reviewCards', 'activityLog', 'xpLog'];

/** Coerce an untrusted remote blob into a safe shape before we persist it. */
export function sanitizeState(raw: unknown, code: string): Record<string, unknown> {
  const s = asObj(raw);
  const out: Record<string, unknown> = { ...s };
  for (const k of STRING_ARR_KEYS) out[k] = asArr<string>(s[k]).filter((x) => typeof x === 'string');
  for (const k of REC_KEYS) out[k] = asObj(s[k]);
  out.toneAnswers = asArr(s.toneAnswers).slice(-500);
  out.wrongItems = asArr(s.wrongItems);
  out.tonesIntroVisited = Boolean(s.tonesIntroVisited);
  out.tonedrillBest = num(s.tonedrillBest);
  out.settings = { ...asObj(s.settings), syncCode: code, lastSyncAt: Date.now() };
  return out;
}

/**
 * Replace on-device progress with a remote blob and reload so the store
 * re-hydrates. Tags the blob with the store's own PERSIST_VERSION (single source
 * of truth) so migrations stay correct. Caller must have confirmed with the user.
 */
export async function applyRestore(code: string, state: unknown): Promise<void> {
  const safe = sanitizeState(state, code);
  await localforage.setItem(PERSIST_KEY, JSON.stringify({ state: safe, version: PERSIST_VERSION }));
  track('sync_restored');
  if (typeof location !== 'undefined') location.reload();
}

let debounce: ReturnType<typeof setTimeout> | null = null;
let subscribed = false;

/** Flush any pending push right now (used on app background). */
function flushNow(): void {
  if (debounce) { clearTimeout(debounce); debounce = null; }
  void pushState();
}

/** Subscribe once: auto-push (debounced) after XP-earning changes + flush on hide. */
export function initSync(): void {
  if (subscribed) return;
  subscribed = true;
  useProgress.subscribe((state, prev) => {
    if (state.xpLog === prev.xpLog) return; // only react to XP-earning actions
    if (!state.settings.syncCode) return;
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(flushNow, DEBOUNCE_MS);
  });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushNow();
    });
  }
  if (typeof window !== 'undefined') window.addEventListener('pagehide', flushNow);
}
