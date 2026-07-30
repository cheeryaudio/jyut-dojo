import type { ReviewCard } from '../../types';
import {
  wrongId,
  type WrongItem,
  type WrongPayload,
  type WrongType,
} from '../../lib/wrongbook';
import { createDefaultProgressData, DEFAULT_SETTINGS } from './defaults';
import { PERSIST_VERSION, type ProgressData, type Settings, type ToneAnswer } from './model';

type UnknownRecord = Record<string, unknown>;

const TONE_ANSWERS_CAP = 500;
const DEFAULT_DUE = new Date(0).toISOString();
const DEFAULT_CARD_EASE = 2.5;
const CARD_FRONTS = ['audio', 'hanzi', 'jyutping'] as const;
const AUDIO_SPEEDS = ['normal', 'slow'] as const;
const VOICES = ['female', 'male'] as const;
const WRONG_TYPES = ['quiz', 'pinyin', 'tonedrill', 'cloze', 'dictation'] as const;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(isNonEmptyString) : [];
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function integerInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
): T[number] {
  return typeof value === 'string' && allowed.includes(value as T[number])
    ? value as T[number]
    : fallback;
}

function numberRecord(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, entry] of Object.entries(asRecord(value))) {
    if (typeof entry === 'number' && Number.isFinite(entry) && entry >= 0) out[key] = entry;
  }
  return out;
}

function reviewCards(value: unknown): Record<string, ReviewCard> {
  const out: Record<string, ReviewCard> = {};
  for (const [wordId, entry] of Object.entries(asRecord(value))) {
    const card = asRecord(entry);
    if (!wordId || Object.keys(card).length === 0) continue;
    const due = typeof card.due === 'string' && Number.isFinite(Date.parse(card.due))
      ? card.due
      : DEFAULT_DUE;
    const dueMs = Date.parse(due);
    out[wordId] = {
      wordId,
      due,
      interval: nonNegativeNumber(card.interval, 0),
      ease: typeof card.ease === 'number' && Number.isFinite(card.ease) && card.ease > 0
        ? card.ease
        : DEFAULT_CARD_EASE,
      reps: nonNegativeInteger(card.reps, 0),
      lapses: nonNegativeInteger(card.lapses, 0),
      updatedAt: nonNegativeNumber(card.updatedAt, dueMs >= 0 ? dueMs : 0),
    };
  }
  return out;
}

function toneNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 6
    ? value
    : null;
}

function toneAnswers(value: unknown): ToneAnswer[] {
  if (!Array.isArray(value)) return [];
  const out: ToneAnswer[] = [];
  for (const entry of value) {
    const answer = asRecord(entry);
    const actual = toneNumber(answer.actual);
    const picked = toneNumber(answer.picked);
    if (!isNonEmptyString(answer.toneSet) || actual === null || picked === null) continue;
    if (typeof answer.ts !== 'number' || !Number.isFinite(answer.ts)) continue;
    out.push({ toneSet: answer.toneSet, actual, picked, ts: answer.ts });
  }
  return out.slice(-TONE_ANSWERS_CAP);
}

function wrongPayload(value: unknown): WrongPayload | null {
  const payload = asRecord(value);
  switch (payload.kind) {
    case 'quiz':
      return isNonEmptyString(payload.sentenceId) && isNonEmptyString(payload.scenarioId)
        ? { kind: 'quiz', sentenceId: payload.sentenceId, scenarioId: payload.scenarioId }
        : null;
    case 'pinyin': {
      if (!isNonEmptyString(payload.ref) || !isNonEmptyString(payload.jp)) return null;
      return isNonEmptyString(payload.groupId)
        ? { kind: 'pinyin', ref: payload.ref, jp: payload.jp, groupId: payload.groupId }
        : { kind: 'pinyin', ref: payload.ref, jp: payload.jp };
    }
    case 'tonedrill': {
      const actual = toneNumber(payload.actual);
      return isNonEmptyString(payload.toneSet) && actual !== null
        ? { kind: 'tonedrill', toneSet: payload.toneSet, actual }
        : null;
    }
    case 'cloze':
      return isNonEmptyString(payload.sentenceId)
        && isNonEmptyString(payload.wordId)
        && isNonEmptyString(payload.scenarioId)
        ? {
            kind: 'cloze',
            sentenceId: payload.sentenceId,
            wordId: payload.wordId,
            scenarioId: payload.scenarioId,
          }
        : null;
    case 'dictation':
      return isNonEmptyString(payload.sentenceId) && isNonEmptyString(payload.scenarioId)
        ? { kind: 'dictation', sentenceId: payload.sentenceId, scenarioId: payload.scenarioId }
        : null;
    default:
      return null;
  }
}

function fallbackRefId(payload: WrongPayload): string {
  switch (payload.kind) {
    case 'quiz':
    case 'cloze':
    case 'dictation':
      return payload.scenarioId;
    case 'pinyin':
      return payload.ref;
    case 'tonedrill':
      return payload.toneSet;
  }
}

function wrongItems(value: unknown): WrongItem[] {
  if (!Array.isArray(value)) return [];
  const out: WrongItem[] = [];
  for (const entry of value) {
    const item = asRecord(entry);
    const payload = wrongPayload(item.payload);
    if (!payload) continue;
    const type = enumValue(item.type, WRONG_TYPES, payload.kind as WrongType);
    out.push({
      id: isNonEmptyString(item.id) ? item.id : wrongId(payload),
      type: type === payload.kind ? type : payload.kind,
      refId: isNonEmptyString(item.refId) ? item.refId : fallbackRefId(payload),
      ts: finiteNumber(item.ts, 0),
      correctStreak: nonNegativeInteger(item.correctStreak, 0),
      updatedAt: nonNegativeNumber(item.updatedAt, nonNegativeNumber(item.ts, 0)),
      payload,
    });
  }
  return out;
}

function settings(value: unknown, onboardedDefault: boolean): Settings {
  const raw = asRecord(value);
  return {
    cardFront: enumValue(raw.cardFront, CARD_FRONTS, DEFAULT_SETTINGS.cardFront),
    dailyGoalMin: nonNegativeNumber(raw.dailyGoalMin, DEFAULT_SETTINGS.dailyGoalMin),
    onboarded: booleanValue(raw.onboarded, onboardedDefault),
    recommendedStage: stringValue(raw.recommendedStage, DEFAULT_SETTINGS.recommendedStage),
    syncCode: stringValue(raw.syncCode, DEFAULT_SETTINGS.syncCode),
    lastSyncAt: nonNegativeNumber(raw.lastSyncAt, DEFAULT_SETTINGS.lastSyncAt),
    analyticsEnabled: booleanValue(raw.analyticsEnabled, DEFAULT_SETTINGS.analyticsEnabled),
    audioSpeed: enumValue(raw.audioSpeed, AUDIO_SPEEDS, DEFAULT_SETTINGS.audioSpeed),
    voice: enumValue(raw.voice, VOICES, DEFAULT_SETTINGS.voice),
    reminderEnabled: booleanValue(raw.reminderEnabled, DEFAULT_SETTINGS.reminderEnabled),
    reminderHour: integerInRange(raw.reminderHour, 0, 23, DEFAULT_SETTINGS.reminderHour),
    reminderMinute: integerInRange(raw.reminderMinute, 0, 59, DEFAULT_SETTINGS.reminderMinute),
  };
}

/** Coerce each persisted field independently so one corrupt value cannot erase valid siblings. */
export function coerceProgressData(raw: unknown, onboardedDefault = false): ProgressData {
  const source = asRecord(raw);
  const defaults = createDefaultProgressData();
  return {
    learnedScenarios: stringArray(source.learnedScenarios),
    practicedScenarios: stringArray(source.practicedScenarios),
    pinyinDone: stringArray(source.pinyinDone),
    basicsLearned: stringArray(source.basicsLearned),
    tonesIntroVisited: booleanValue(source.tonesIntroVisited, defaults.tonesIntroVisited),
    grammarVisited: booleanValue(source.grammarVisited, defaults.grammarVisited),
    firstWinDone: booleanValue(source.firstWinDone, defaults.firstWinDone),
    tonedrillBest: nonNegativeNumber(source.tonedrillBest, defaults.tonedrillBest),
    quizStars: numberRecord(source.quizStars),
    reviewCards: reviewCards(source.reviewCards),
    toneAnswers: toneAnswers(source.toneAnswers),
    activityLog: numberRecord(source.activityLog),
    xpLog: numberRecord(source.xpLog),
    wrongItems: wrongItems(source.wrongItems),
    settings: settings(source.settings, onboardedDefault),
  };
}

function migrateV1ToV2(state: UnknownRecord): UnknownRecord {
  const legacySettings = asRecord(state.settings);
  return {
    ...state,
    grammarVisited: state.grammarVisited ?? false,
    firstWinDone: state.firstWinDone ?? false,
    settings: {
      ...legacySettings,
      onboarded: legacySettings.onboarded ?? true,
    },
  };
}

function migrateV2ToV3(state: UnknownRecord): UnknownRecord {
  return {
    ...state,
    grammarVisited: state.grammarVisited ?? false,
    firstWinDone: state.firstWinDone ?? false,
  };
}

function migrateV3ToV4(state: UnknownRecord): UnknownRecord {
  const migratedCards: UnknownRecord = {};
  for (const [wordId, entry] of Object.entries(asRecord(state.reviewCards))) {
    const card = asRecord(entry);
    if (Object.keys(card).length === 0) {
      // Preserve malformed/non-object entries so the final coercion can drop them.
      migratedCards[wordId] = entry;
      continue;
    }
    const dueMs = typeof card.due === 'string' ? Date.parse(card.due) : Number.NaN;
    migratedCards[wordId] = {
      ...card,
      updatedAt: card.updatedAt ?? (Number.isFinite(dueMs) && dueMs >= 0 ? dueMs : 0),
    };
  }

  const migratedWrongItems = Array.isArray(state.wrongItems)
    ? state.wrongItems.map((entry) => {
        const item = asRecord(entry);
        return {
          ...item,
          updatedAt: item.updatedAt ?? nonNegativeNumber(item.ts, 0),
        };
      })
    : state.wrongItems;

  return {
    ...state,
    reviewCards: migratedCards,
    wrongItems: migratedWrongItems,
  };
}

/** Run every intervening schema step, then normalize the complete v4 data shape. */
export function migrateProgress(persisted: unknown, version: number): ProgressData {
  if (version > PERSIST_VERSION) {
    throw new Error(`Unsupported progress version: ${version}`);
  }

  let state = asRecord(persisted);
  let currentVersion = Number.isFinite(version) ? version : 0;

  if (currentVersion < 2) {
    state = migrateV1ToV2(state);
    currentVersion = 2;
  }
  if (currentVersion < 3) {
    state = migrateV2ToV3(state);
    currentVersion = 3;
  }
  if (currentVersion < PERSIST_VERSION) {
    state = migrateV3ToV4(state);
  }

  return coerceProgressData(state, version < PERSIST_VERSION);
}
