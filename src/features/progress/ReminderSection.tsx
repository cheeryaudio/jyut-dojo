import { useState } from 'react';
import { Toggle } from '../../components/Controls';
import { toast } from '../../lib/audio';
import { disableReminder, enableReminder, reminderSupported } from '../../lib/reminder';
import { UI } from '../../lib/ui';
import { useProgress } from '../../stores/progress';

/** 每日提醒 — native platforms only; renders nothing on the web. */
export function ReminderSection() {
  const enabled = useProgress((state) => state.settings.reminderEnabled);
  const hour = useProgress((state) => state.settings.reminderHour);
  const minute = useProgress((state) => state.settings.reminderMinute);
  const setReminder = useProgress((state) => state.setReminder);
  const [busy, setBusy] = useState(false);

  if (!reminderSupported()) return null;

  const timeValue = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const onToggle = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) {
        const granted = await enableReminder(hour, minute);
        if (granted) setReminder(true, hour, minute);
        else toast(UI.pg_reminderPermNeeded);
      } else {
        await disableReminder();
        setReminder(false, hour, minute);
      }
    } finally {
      setBusy(false);
    }
  };

  const onTime = async (value: string) => {
    const [nextHour, nextMinute] = value.split(':').map(Number);
    if (Number.isNaN(nextHour) || Number.isNaN(nextMinute)) return;
    setReminder(enabled, nextHour, nextMinute);
    if (enabled) await enableReminder(nextHour, nextMinute); // reschedule
  };

  return (
    <section>
      <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_reminderTitle}</h2>
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="font-medium text-ink">{UI.pg_reminderName}</div>
            <div className="text-xs text-tone6 mt-0.5">{UI.pg_reminderHint}</div>
          </div>
          <Toggle
            on={enabled}
            disabled={busy}
            onChange={(next) => void onToggle(next)}
            label={UI.pg_reminderName}
          />
        </div>
        {enabled && (
          <div className="flex items-center justify-between border-t border-line pt-3">
            <label className="text-sm text-tone6" htmlFor="reminder-time">
              {UI.pg_reminderTime}
            </label>
            <input
              id="reminder-time"
              type="time"
              value={timeValue}
              disabled={busy}
              onChange={(event) => void onTime(event.target.value)}
              className="rounded-xl border border-line bg-card px-3 py-1.5 text-ink outline-none focus:border-accent"
            />
          </div>
        )}
      </div>
    </section>
  );
}
