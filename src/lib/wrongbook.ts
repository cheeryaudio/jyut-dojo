/**
 * 錯題本 (wrong-answer book). Pure add/clear logic over a flat array.
 *
 * Every wrong answer is recorded with enough payload to re-ask it. In the
 * redo queue, answering an item correctly twice in a row removes it; a wrong
 * answer resets its streak.
 */

export type WrongType = 'quiz' | 'pinyin' | 'tonedrill' | 'cloze' | 'dictation';

/** Discriminated payload — carries what each redo UI needs to re-ask. */
export type WrongPayload =
  | { kind: 'quiz'; sentenceId: string; scenarioId: string }
  | { kind: 'pinyin'; ref: string; jp: string; groupId?: string }
  | { kind: 'tonedrill'; toneSet: string; actual: number }
  | { kind: 'cloze'; sentenceId: string; wordId: string; scenarioId: string }
  | { kind: 'dictation'; sentenceId: string; scenarioId: string };

export interface WrongItem {
  /** stable dedupe key */
  id: string;
  type: WrongType;
  /** scenarioId / pinyin ref / toneset syllable */
  refId: string;
  ts: number;
  /** correct answers in a row toward removal (need CLEAR_STREAK) */
  correctStreak: number;
  payload: WrongPayload;
}

/** Correct-in-a-row needed to retire a wrong item. */
export const CLEAR_STREAK = 2;

/** Deterministic id so the same mistake dedupes instead of piling up. */
export function wrongId(payload: WrongPayload): string {
  switch (payload.kind) {
    case 'quiz':
      return `q:${payload.sentenceId}`;
    case 'pinyin':
      return `p:${payload.ref}:${payload.jp}`;
    case 'tonedrill':
      return `t:${payload.toneSet}:${payload.actual}`;
    case 'cloze':
      return `c:${payload.sentenceId}:${payload.wordId}`;
    case 'dictation':
      return `d:${payload.sentenceId}`;
  }
}

/**
 * Record a wrong answer. If the same item is already logged, its streak is
 * reset and the timestamp refreshed rather than adding a duplicate.
 */
export function addWrong(
  items: WrongItem[],
  entry: { type: WrongType; refId: string; payload: WrongPayload; ts?: number }
): WrongItem[] {
  const id = wrongId(entry.payload);
  const ts = entry.ts ?? Date.now();
  const existing = items.find((i) => i.id === id);
  if (existing) {
    return items.map((i) => (i.id === id ? { ...i, ts, correctStreak: 0 } : i));
  }
  return [...items, { id, type: entry.type, refId: entry.refId, ts, correctStreak: 0, payload: entry.payload }];
}

/** Grade a redo answer. Correct → +1 streak (retire at CLEAR_STREAK); wrong → reset. */
export function gradeWrong(items: WrongItem[], id: string, correct: boolean): WrongItem[] {
  if (!correct) {
    return items.map((i) => (i.id === id ? { ...i, correctStreak: 0 } : i));
  }
  return items
    .map((i) => (i.id === id ? { ...i, correctStreak: i.correctStreak + 1 } : i))
    .filter((i) => i.correctStreak < CLEAR_STREAK);
}

/** Remove a single item outright. */
export function clearWrong(items: WrongItem[], id: string): WrongItem[] {
  return items.filter((i) => i.id !== id);
}

/** Count per type (for badges / section headers). */
export function countByType(items: WrongItem[]): Record<WrongType, number> {
  const out: Record<WrongType, number> = { quiz: 0, pinyin: 0, tonedrill: 0, cloze: 0, dictation: 0 };
  for (const i of items) out[i.type] += 1;
  return out;
}
