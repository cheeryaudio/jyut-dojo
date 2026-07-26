import { dayKey } from './dates';

/** XP granted per learning event. */
export const XP = {
  lesson: 20,
  practiceSentence: 2,
  quizCorrect: 5,
  pinyinCorrect: 5,
  toneDrillCorrect: 2,
  reviewGrade: 3,
  basicsDeck: 15,
} as const;

/** Daily-goal presets shown in onboarding (minutes). XP target = min × 10. */
export const GOAL_PRESETS: { minutes: number; label: string; sub: string }[] = [
  { minutes: 5, label: '轻松', sub: '5 分钟' },
  { minutes: 10, label: '标准', sub: '10 分钟' },
  { minutes: 20, label: '认真', sub: '20 分钟' },
];

export const DEFAULT_GOAL_MIN = 10;

/** XP target for a daily goal expressed in minutes. */
export function goalXp(dailyGoalMin: number): number {
  return dailyGoalMin * 10;
}

/** Add XP to a given day's bucket (pure). */
export function addXp(
  log: Record<string, number>,
  amount: number,
  day: string = dayKey()
): Record<string, number> {
  if (amount === 0) return log;
  return { ...log, [day]: (log[day] ?? 0) + amount };
}

/** XP earned on a given day. */
export function dayXp(log: Record<string, number>, day: string = dayKey()): number {
  return log[day] ?? 0;
}

/** Total XP across all days. */
export function totalXp(log: Record<string, number>): number {
  return Object.values(log).reduce((a, b) => a + b, 0);
}

export type DayState = 'full' | 'half' | 'empty';

export interface StripDay {
  key: string;
  /** 0 = Monday … 6 = Sunday */
  weekday: number;
  xp: number;
  state: DayState;
}

/** Monday-of-week key for a date (local time). */
export function weekStart(now: Date = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  return d;
}

/**
 * 7-day Mon→Sun打卡 strip for the current week.
 * full = hit the XP goal, half = some activity/xp but short, empty = nothing.
 */
export function weekStrip(
  xpLog: Record<string, number>,
  activityLog: Record<string, number>,
  goal: number,
  now: Date = new Date()
): StripDay[] {
  const start = weekStart(now);
  const out: StripDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dayKey(d);
    const xp = xpLog[key] ?? 0;
    const active = xp > 0 || (activityLog[key] ?? 0) > 0;
    const state: DayState = goal > 0 && xp >= goal ? 'full' : active ? 'half' : 'empty';
    out.push({ key, weekday: i, xp, state });
  }
  return out;
}

export interface HeatDay {
  key: string;
  xp: number;
  activity: number;
  /** 0..4 intensity bucket for the heatmap */
  level: number;
}

/** Last `days` days (oldest→newest) with an intensity bucket for the calendar. */
export function heatmap(
  xpLog: Record<string, number>,
  activityLog: Record<string, number>,
  days = 30,
  now: Date = new Date()
): HeatDay[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: HeatDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d);
    const xp = xpLog[key] ?? 0;
    const activity = activityLog[key] ?? 0;
    let level = 0;
    if (xp > 0 || activity > 0) {
      if (xp >= 100) level = 4;
      else if (xp >= 50) level = 3;
      else if (xp >= 20) level = 2;
      else level = 1;
    }
    out.push({ key, xp, activity, level });
  }
  return out;
}
