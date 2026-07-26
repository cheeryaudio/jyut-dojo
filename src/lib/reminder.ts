/**
 * 每日提醒 — a single repeating local notification, native-only.
 *
 * Everything here is guarded by `Capacitor.isNativePlatform()`; on the web the
 * whole feature is hidden and these calls are inert. Uses
 * @capacitor/local-notifications, which is added to the native project by
 * `npx cap sync android`.
 */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/** Fixed id so re-scheduling replaces the previous reminder. */
const REMINDER_ID = 4210;

export const DEFAULT_HOUR = 20;
export const DEFAULT_MINUTE = 0;

/** True only inside a native Capacitor shell (Android/iOS). */
export function reminderSupported(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Request permission and schedule a daily repeating reminder. Returns whether
 * it was actually scheduled (false if unsupported or permission denied).
 */
export async function enableReminder(hour: number, minute: number): Promise<boolean> {
  if (!reminderSupported()) return false;
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return false;
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_ID,
        title: '粵語道場',
        body: '今日仲未打卡，嚟練 5 分鐘粵語啦！',
        schedule: { on: { hour, minute }, allowWhileIdle: true, every: 'day' },
      },
    ],
  });
  return true;
}

/** Cancel the daily reminder. Inert on the web. */
export async function disableReminder(): Promise<void> {
  if (!reminderSupported()) return;
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
}
