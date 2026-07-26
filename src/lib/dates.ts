/** Local-time yyyy-mm-dd key for an activity log. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return dayKey(dt);
}

/**
 * Consecutive days (ending today or yesterday) with any recorded activity.
 * A gap of one day is tolerated only at the very start so a streak counted
 * "yesterday" is not lost until a second empty day passes.
 */
export function computeStreak(activityLog: Record<string, number>, now: Date = new Date()): number {
  const today = dayKey(now);
  const yesterday = shiftDays(today, -1);
  let cursor: string;
  if ((activityLog[today] ?? 0) > 0) cursor = today;
  else if ((activityLog[yesterday] ?? 0) > 0) cursor = yesterday;
  else return 0;

  let streak = 0;
  while ((activityLog[cursor] ?? 0) > 0) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}
