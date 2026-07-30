import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePathProgress } from '../hooks/usePathProgress';
import { useProgress } from '../stores/progress';
import { computeStreak } from '../lib/dates';
import { isDue } from '../lib/srs';
import { dayXp, goalXp, weekStrip, type DayState } from '../lib/xp';
import { computePath, unitKey, unitRoute } from '../lib/path';
import { UI } from '../lib/ui';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export function Home() {
  const activityLog = useProgress((state) => state.activityLog);
  const reviewCards = useProgress((state) => state.reviewCards);
  const xpLog = useProgress((state) => state.xpLog);
  const goalMin = useProgress((state) => state.settings.dailyGoalMin);
  const firstWinDone = useProgress((state) => state.firstWinDone);
  const pathProgress = usePathProgress();
  const recommendedStage = pathProgress.recommendedStage;

  const streak = computeStreak(activityLog);
  const dueCount = Object.values(reviewCards).filter((c) => isDue(c)).length;
  const goal = goalXp(goalMin);
  const today = dayXp(xpLog);
  const strip = useMemo(() => weekStrip(xpLog, activityLog, goal), [xpLog, activityLog, goal]);

  // brand-new learner who hasn't started anything → offer the 60-second first win
  const showFirstWin =
    !firstWinDone && pathProgress.learnedScenarios.length === 0 && !pathProgress.tonesIntroVisited;

  // "繼續學習" → first unlocked-but-unfinished unit; prefer the recommended stage
  // so a 識少少 learner is sent straight to survival scenarios, not back to tones.
  const next = useMemo(() => {
    const stages = computePath(pathProgress);
    const rec = stages.find((st) => st.stage.id === recommendedStage);
    if (rec) {
      const inRec = rec.units.find((u) => u.status === 'current');
      if (inRec) return inRec.unit;
    }
    for (const st of stages) for (const u of st.units) if (u.status === 'current') return u.unit;
    return null;
  }, [pathProgress, recommendedStage]);

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <p className="text-sm text-tone6 tracking-wide">{UI.appNameSub}</p>
        <h1 className="hero-han text-4xl font-bold text-ink mt-1">{UI.appName}</h1>
      </header>

      {showFirstWin && (
        <Link
          to="/firstwin"
          className="card p-5 flex items-center gap-4 bg-accent-soft border-accent/30 active:scale-[0.99] transition"
        >
          <div className="text-4xl">🎉</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-ink">{UI.home_firstWinTitle}</div>
            <div className="text-xs text-tone6 mt-0.5">{UI.home_firstWinSub}</div>
          </div>
          <span className="text-accent text-xl">›</span>
        </Link>
      )}

      <div className="card p-5 flex items-center gap-5">
        <GoalRing value={today} goal={goal} />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <span className="text-2xl font-bold text-ink">{streak}</span>
            <span className="text-sm text-tone6">{UI.home_streakUnit}</span>
          </div>
          <Link to="/review" className="flex items-center gap-2 active:opacity-70">
            <span className="text-xl">🔁</span>
            <span className="text-2xl font-bold text-tone3">{dueCount}</span>
            <span className="text-sm text-tone6">{UI.home_reviewToday}</span>
          </Link>
        </div>
      </div>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-medium text-tone6">{UI.home_weekTitle}</h2>
          <span className="text-xs text-tone6">{UI.home_goalPerDay(goal)}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {strip.map((d) => (
            <div key={d.key} className="flex flex-col items-center gap-1.5">
              <StripDot state={d.state} />
              <span className="text-[10px] text-tone6">{WEEKDAY_LABELS[d.weekday]}</span>
            </div>
          ))}
        </div>
      </section>

      {next && (
        <Link
          to={unitRoute(next)}
          key={unitKey(next)}
          className="card p-5 flex items-center gap-4 active:scale-[0.99] transition"
        >
          <div className="text-4xl">{next.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-accent">{UI.home_continue}</div>
            <div className="hero-han text-xl text-ink mt-0.5">{next.title}</div>
          </div>
          <span className="text-tone6 text-xl">›</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/path" className="card p-4 active:scale-[0.99] transition">
          <div className="text-2xl">🗺️</div>
          <div className="font-medium text-ink mt-2">{UI.home_pathCard}</div>
          <div className="text-xs text-tone6 mt-0.5">{UI.home_pathCardSub}</div>
        </Link>
        <Link to="/tones" className="card p-4 active:scale-[0.99] transition">
          <div className="text-2xl">🎵</div>
          <div className="font-medium text-ink mt-2">{UI.home_tonesCard}</div>
          <div className="text-xs text-tone6 mt-0.5">{UI.home_tonesCardSub}</div>
        </Link>
      </div>
    </div>
  );
}

function GoalRing({ value, goal }: { value: number; goal: number }) {
  const size = 92;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const hit = value >= goal && goal > 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8E2D8" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#C4622D"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hit ? (
          <span className="text-2xl">✅</span>
        ) : (
          <>
            <span className="text-lg font-bold text-ink leading-none">{value}</span>
            <span className="text-[10px] text-tone6 mt-0.5">/ {goal} XP</span>
          </>
        )}
      </div>
    </div>
  );
}

function StripDot({ state }: { state: DayState }) {
  if (state === 'full') return <span className="w-6 h-6 rounded-full bg-accent" />;
  if (state === 'half')
    return <span className="w-6 h-6 rounded-full border-2 border-accent bg-accent-soft" />;
  return <span className="w-6 h-6 rounded-full border-2 border-line" />;
}
