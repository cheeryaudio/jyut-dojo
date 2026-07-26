import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProgress, type AudioSpeed, type Voice } from '../stores/progress';
import { computeStreak } from '../lib/dates';
import { scenarios } from '../lib/data';
import { ALL_TONES, TONE_LABELS, toneColor } from '../lib/tones';
import { totalXp, heatmap, type HeatDay } from '../lib/xp';
import { toast } from '../lib/audio';
import { createSyncCode, pushState, fetchRemote, applyRestore, isValidCode, type RemoteState } from '../lib/sync';
import { reminderSupported, enableReminder, disableReminder } from '../lib/reminder';
import { Stars } from '../components/Stars';
import { BottomSheet } from '../components/BottomSheet';

import { UI } from '../lib/ui';
interface ToneStat {
  total: number;
  correct: number;
}

function pairKey(a: number, b: number): string {
  return a <= b ? `${a}v${b}` : `${b}v${a}`;
}

export function Progress() {
  const activityLog = useProgress((s) => s.activityLog);
  const reviewCards = useProgress((s) => s.reviewCards);
  const learned = useProgress((s) => s.learnedScenarios);
  const quizStars = useProgress((s) => s.quizStars);
  const toneAnswers = useProgress((s) => s.toneAnswers);
  const xpLog = useProgress((s) => s.xpLog);
  const restartOnboarding = useProgress((s) => s.restartOnboarding);

  const streak = computeStreak(activityLog);
  const deckSize = Object.keys(reviewCards).length;
  const xpTotal = totalXp(xpLog);
  const heat = useMemo(() => heatmap(xpLog, activityLog, 30), [xpLog, activityLog]);

  const perTone = useMemo(() => {
    const stats = new Map<number, ToneStat>();
    for (const t of ALL_TONES) stats.set(t, { total: 0, correct: 0 });
    for (const a of toneAnswers) {
      const s = stats.get(a.actual);
      if (!s) continue;
      s.total += 1;
      if (a.picked === a.actual) s.correct += 1;
    }
    return stats;
  }, [toneAnswers]);

  const confusionPairs = useMemo(() => {
    // pairs that showed up in at least one wrong answer
    const involved = new Set<string>();
    for (const a of toneAnswers) if (a.picked !== a.actual) involved.add(pairKey(a.actual, a.picked));

    const rows: { key: string; total: number; correct: number }[] = [];
    for (const key of involved) {
      const [a, b] = key.split('v').map(Number);
      const set = new Set([a, b]);
      let total = 0;
      let correct = 0;
      for (const ans of toneAnswers) {
        if (set.has(ans.actual) && set.has(ans.picked)) {
          total += 1;
          if (ans.picked === ans.actual) correct += 1;
        }
      }
      if (total > 0) rows.push({ key, total, correct });
    }
    return rows.sort((x, y) => x.correct / x.total - y.correct / y.total);
  }, [toneAnswers]);

  const totalToneAnswers = toneAnswers.length;

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="hero-han text-2xl font-bold text-ink">{UI.pg_title}</h1>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat value={`${xpTotal}`} unit="XP" label={UI.pg_statXp} />
        <Stat value={`${streak}`} unit={UI.pg_unitDay} label={UI.pg_statStreak} />
        <Stat value={`${deckSize}`} unit={UI.pg_unitCard} label={UI.pg_statCards} />
      </div>

      <section>
        <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_heatTitle}</h2>
        <div className="card p-4">
          <div className="grid grid-flow-col grid-rows-5 gap-1.5 justify-start">
            {heat.map((d) => (
              <HeatCell key={d.key} day={d} />
            ))}
          </div>
          <div className="flex items-center justify-end gap-1 mt-3 text-[10px] text-tone6">
            <span>{UI.pg_heatLess}</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <span key={l} className="w-3 h-3 rounded-[3px]" style={{ background: heatColor(l) }} />
            ))}
            <span>{UI.pg_heatMore}</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-tone6 mb-2 px-1">
          {UI.pg_scenarioStars(learned.length, scenarios.length)}
        </h2>
        <div className="card divide-y divide-line">
          {scenarios.map((sc) => (
            <div key={sc.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl">{sc.emoji}</span>
              <span className="hero-han text-base flex-1">{sc.title}</span>
              <Stars value={quizStars[sc.id] ?? 0} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_toneAccuracy}</h2>
        <div className="card p-4 space-y-3">
          {totalToneAnswers === 0 && (
            <p className="text-sm text-tone6 text-center py-2">{UI.pg_noTone}</p>
          )}
          {totalToneAnswers > 0 &&
            ALL_TONES.map((t) => {
              const s = perTone.get(t) ?? { total: 0, correct: 0 };
              const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
              return (
                <div key={t} className="flex items-center gap-3">
                  <span className="w-14 text-xs" style={{ color: toneColor(t) }}>
                    {UI.pg_toneN(t)}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-line overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: toneColor(t) }} />
                  </div>
                  <span className="w-16 text-right text-xs text-tone6 tabular-nums">
                    {s.total ? `${pct}% (${s.total})` : '—'}
                  </span>
                </div>
              );
            })}
        </div>
      </section>

      {confusionPairs.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_confusion}</h2>
          <div className="card p-4 space-y-2.5">
            {confusionPairs.map((row) => {
              const [a, b] = row.key.split('v').map(Number);
              const pct = Math.round((row.correct / row.total) * 100);
              return (
                <div key={row.key} className="flex items-center gap-3">
                  <span className="flex items-center gap-1 w-16">
                    <span className="font-medium" style={{ color: toneColor(a) }}>{a}</span>
                    <span className="text-tone6 text-xs">vs</span>
                    <span className="font-medium" style={{ color: toneColor(b) }}>{b}</span>
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-16 text-right text-xs text-tone6 tabular-nums">{pct}% ({row.total})</span>
                </div>
              );
            })}
            <p className="text-[11px] text-tone6 pt-1">
              {UI.pg_confusionHint(TONE_LABELS[2], TONE_LABELS[5], TONE_LABELS[3], TONE_LABELS[6])}
            </p>
          </div>
        </section>
      )}

      <CloudSync />

      <Preferences />

      <ReminderSection />

      <section>
        <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_other}</h2>
        <button type="button" onClick={restartOnboarding} className="card w-full p-4 flex items-center gap-3 text-left active:scale-[0.99] transition">
          <span className="text-2xl">🧭</span>
          <span className="flex-1">
            <span className="block font-medium text-ink">{UI.pg_resetGoal}</span>
            <span className="block text-xs text-tone6 mt-0.5">{UI.pg_resetGoalHint}</span>
          </span>
          <span className="text-tone6">›</span>
        </button>
      </section>

      <div className="flex justify-center gap-5 text-sm pt-1 pb-2">
        <Link to="/privacy" className="text-tone6">{UI.pg_privacy}</Link>
        <Link to="/about" className="text-tone6">{UI.pg_about}</Link>
      </div>
    </div>
  );
}

/* ---------------- 雲端同步 ---------------- */

function fmtTime(ts: number): string {
  if (!ts) return UI.pg_syncNever;
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return UI.pg_syncJustNow;
  if (diff < 3_600_000) return UI.pg_syncMinAgo(Math.floor(diff / 60_000));
  if (diff < 86_400_000) return UI.pg_syncHrAgo(Math.floor(diff / 3_600_000));
  return d.toLocaleDateString('zh-CN');
}

function CloudSync() {
  const syncCode = useProgress((s) => s.settings.syncCode);
  const lastSyncAt = useProgress((s) => s.settings.lastSyncAt);

  const [busy, setBusy] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<{ code: string; remote: RemoteState } | null>(null);

  const onGenerate = async () => {
    setBusy(true);
    try {
      const { pushed } = await createSyncCode();
      toast(pushed ? UI.pg_syncGenerated : UI.pg_syncGeneratedQueued);
    } catch {
      toast(UI.pg_syncGenFail);
    } finally {
      setBusy(false);
    }
  };

  const onManual = async () => {
    setBusy(true);
    await pushState();
    setBusy(false);
    toast(UI.pg_syncDone);
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(syncCode);
      toast(UI.pg_syncCopied);
    } catch {
      toast(syncCode);
    }
  };

  const onLookup = async () => {
    const code = input.trim().toUpperCase();
    if (!isValidCode(code)) {
      toast(UI.pg_syncBadCode);
      return;
    }
    setBusy(true);
    try {
      const remote = await fetchRemote(code);
      if (!remote) {
        toast(UI.pg_syncNotFound);
        return;
      }
      setPending({ code, remote });
    } catch {
      toast(UI.pg_syncConnFail);
    } finally {
      setBusy(false);
    }
  };

  const onConfirmRestore = async () => {
    if (!pending) return;
    await applyRestore(pending.code, pending.remote.state);
    // applyRestore reloads the page on success
  };

  return (
    <section>
      <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_syncTitle}</h2>
      <div className="card p-4 space-y-4">
        {syncCode ? (
          <>
            <div>
              <div className="text-xs text-tone6 mb-1">{UI.pg_syncYourCode}</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-2xl tracking-[0.2em] text-ink select-all">{syncCode}</code>
                <button type="button" onClick={onCopy} className="btn-ghost !py-2 text-sm">{UI.pg_syncCopy}</button>
              </div>
              <p className="text-[11px] text-tone6 mt-2 leading-snug">
                {UI.pg_syncCodeHint}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-tone6">
              <span>{UI.pg_syncLast(fmtTime(lastSyncAt))}</span>
              <button type="button" disabled={busy} onClick={onManual} className="btn-outline !py-1.5 text-sm disabled:opacity-40">
                {UI.pg_syncManual}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-tone6">
              {UI.pg_syncBlurb}
            </p>
            <button type="button" disabled={busy} onClick={onGenerate} className="btn-primary w-full disabled:opacity-50">
              {UI.pg_syncGenerate}
            </button>
          </>
        )}

        {showInput ? (
          <div className="space-y-2 border-t border-line pt-3">
            <div className="text-xs text-tone6">{UI.pg_syncEnterHint}</div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例如 A1B2C3D4E5"
                maxLength={16}
                autoCapitalize="characters"
                className="flex-1 rounded-2xl border border-line bg-card px-4 py-2.5 font-mono uppercase tracking-widest text-ink outline-none focus:border-accent"
              />
              <button type="button" disabled={busy} onClick={onLookup} className="btn-primary !px-4 disabled:opacity-50">
                {UI.pg_syncFetch}
              </button>
            </div>
            <button type="button" onClick={() => setShowInput(false)} className="text-xs text-tone6">{UI.pg_syncCollapse}</button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowInput(true)} className="text-sm text-accent">
            {UI.pg_syncHave}
          </button>
        )}
      </div>

      <BottomSheet open={pending !== null} onClose={() => setPending(null)} title={UI.pg_syncOverwriteTitle}>
        {pending && (
          <div className="space-y-4">
            <p className="text-sm text-tone6">
              {UI.pg_syncFoundCode(pending.code, new Date(pending.remote.updatedAt).toLocaleString('zh-CN'))}
            </p>
            <p className="text-sm text-tone1">{UI.pg_syncOverwriteWarn}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPending(null)} className="btn-outline flex-1">{UI.pg_syncCancel}</button>
              <button type="button" onClick={onConfirmRestore} className="btn-primary flex-1">{UI.pg_syncConfirmRestore}</button>
            </div>
          </div>
        )}
      </BottomSheet>
    </section>
  );
}

/* ---------------- 設定：語速 / 聲音 / 統計 ---------------- */

const SPEED_OPTS: { value: AudioSpeed; label: string }[] = [
  { value: 'normal', label: UI.pg_speedNormal },
  { value: 'slow', label: UI.pg_speedSlow },
];
const VOICE_OPTS: { value: Voice; label: string }[] = [
  { value: 'female', label: UI.pg_voiceFemale },
  { value: 'male', label: UI.pg_voiceMale },
];

function Segmented<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1 rounded-2xl bg-line/50 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-xl py-2 text-sm font-medium transition ${
            value === o.value ? 'bg-card text-accent shadow-card' : 'text-tone6'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function Preferences() {
  const audioSpeed = useProgress((s) => s.settings.audioSpeed);
  const voice = useProgress((s) => s.settings.voice);
  const analyticsEnabled = useProgress((s) => s.settings.analyticsEnabled);
  const setAudioSpeed = useProgress((s) => s.setAudioSpeed);
  const setVoice = useProgress((s) => s.setVoice);
  const setAnalyticsEnabled = useProgress((s) => s.setAnalyticsEnabled);

  return (
    <section>
      <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_settings}</h2>
      <div className="card divide-y divide-line">
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">{UI.pg_speed}</span>
            <span className="text-xs text-tone6">{UI.pg_speedHint}</span>
          </div>
          <Segmented value={audioSpeed} options={SPEED_OPTS} onChange={setAudioSpeed} />
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">{UI.pg_voice}</span>
            <span className="text-xs text-tone6">{UI.pg_voiceHint}</span>
          </div>
          <Segmented value={voice} options={VOICE_OPTS} onChange={setVoice} />
        </div>
        <div className="p-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="font-medium text-ink">{UI.pg_analytics}</div>
            <div className="text-xs text-tone6 mt-0.5">{UI.pg_analyticsHint}</div>
          </div>
          <Toggle on={analyticsEnabled} onChange={setAnalyticsEnabled} />
        </div>
      </div>
    </section>
  );
}

/* ---------------- 每日提醒 (native only) ---------------- */

function ReminderSection() {
  const enabled = useProgress((s) => s.settings.reminderEnabled);
  const hour = useProgress((s) => s.settings.reminderHour);
  const minute = useProgress((s) => s.settings.reminderMinute);
  const setReminder = useProgress((s) => s.setReminder);
  const [busy, setBusy] = useState(false);

  if (!reminderSupported()) return null;

  const timeValue = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const onToggle = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) {
        const ok = await enableReminder(hour, minute);
        if (ok) setReminder(true, hour, minute);
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
    const [h, m] = value.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    setReminder(enabled, h, m);
    if (enabled) await enableReminder(h, m); // reschedule
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
          <Toggle on={enabled} onChange={(v) => void onToggle(v)} />
        </div>
        {enabled && (
          <div className="flex items-center justify-between border-t border-line pt-3">
            <span className="text-sm text-tone6">{UI.pg_reminderTime}</span>
            <input
              type="time"
              value={timeValue}
              disabled={busy}
              onChange={(e) => void onTime(e.target.value)}
              className="rounded-xl border border-line bg-card px-3 py-1.5 text-ink outline-none focus:border-accent"
            />
          </div>
        )}
      </div>
    </section>
  );
}

const HEAT_COLORS = ['#EFE9DF', '#EBD3BF', '#DDA57E', '#CE7B45', '#C4622D'];
function heatColor(level: number): string {
  return HEAT_COLORS[level] ?? HEAT_COLORS[0];
}

function HeatCell({ day }: { day: HeatDay }) {
  const label = day.xp > 0 ? `${day.key}: ${day.xp} XP` : day.key;
  return <span className="w-3.5 h-3.5 rounded-[3px]" style={{ background: heatColor(day.level) }} title={label} />;
}

function Stat({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className="card p-3.5">
      <div className="text-2xl font-bold text-ink">
        {value}
        <span className="text-sm font-medium text-tone6 ml-0.5">{unit}</span>
      </div>
      <div className="text-xs text-tone6 mt-1">{label}</div>
    </div>
  );
}
