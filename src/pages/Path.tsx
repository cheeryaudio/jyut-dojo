import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePathProgress } from '../hooks/usePathProgress';
import { useProgress } from '../stores/progress';
import { computePath, unitKey, unitRoute, type UnitState } from '../lib/path';
import { Stars } from '../components/Stars';
import { BottomSheet } from '../components/BottomSheet';
import { UI } from '../lib/ui';

/** 「你现在可以…」 capability line shown once every unit in a stage is done. */
const CAPABILITY: Record<string, string> = {
  stage0: '你现在能听出六个声调、读准粤拼了',
  stage1: '你现在掌握了数字、时间、方位这些日常词，还认得常用句型',
  stage2: '你现在可以自己去茶餐厅点餐、问路、搭港铁了',
  stage3: '你现在可以买菜、看医生、和朋友约出去、在家吃饭了',
  stage4: '你现在可以租房、返工、饮茶点心、去银行药房都讲得出了',
};

export function Path() {
  const navigate = useNavigate();
  const progress = usePathProgress();
  const quizStars = useProgress((state) => state.quizStars);
  const recommended = progress.recommendedStage;
  const stages = useMemo(() => computePath(progress), [progress]);

  const [locked, setLocked] = useState<UnitState | null>(null);

  // pulse only the very first "current" node so the eye lands on what's next
  const firstCurrentKey = useMemo(() => {
    for (const st of stages) for (const u of st.units) if (u.status === 'current') return unitKey(u.unit);
    return null;
  }, [stages]);

  const go = (u: UnitState) => {
    if (u.status === 'locked') {
      setLocked(u);
      return;
    }
    navigate(unitRoute(u.unit));
  };

  return (
    <div className="space-y-7">
      <header className="pt-1">
        <p className="text-sm text-tone6 tracking-wide">{UI.path_headerKicker}</p>
        <h1 className="hero-han text-2xl font-bold text-ink mt-1">{UI.path_headerTitle}</h1>
      </header>

      {stages.map((st, si) => {
        const isRecommended = st.stage.id === recommended;
        return (
          <section key={st.stage.id} className="space-y-1">
            <div className="flex items-baseline gap-2 px-1">
              <span className="text-xs font-mono text-accent">{String(si + 1).padStart(2, '0')}</span>
              <div className="flex-1">
                <h2 className="hero-han text-lg text-ink">{st.stage.title}</h2>
                <p className="text-xs text-tone6 mt-0.5">{st.stage.subtitle}</p>
              </div>
              {isRecommended && (
                <span className="rounded-full bg-accent-soft text-accent text-[10px] px-2 py-0.5">{UI.path_recommendedStart}</span>
              )}
            </div>

            {st.ratio >= 1 && CAPABILITY[st.stage.id] && (
              <div className="rounded-2xl border border-accent/30 bg-accent-soft p-3 flex items-start gap-2.5 mt-1">
                <span className="text-lg leading-none">🏅</span>
                <div>
                  <div className="text-[10px] text-accent">{UI.path_milestoneKicker}</div>
                  <div className="text-sm text-ink mt-0.5">{CAPABILITY[st.stage.id]}</div>
                </div>
              </div>
            )}

            <div className="relative py-2">
              {/* the winding contour line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-line" aria-hidden />
              <ol className="relative space-y-3">
                {st.units.map((u, ui) => (
                  <PathNode
                    key={unitKey(u.unit)}
                    unit={u}
                    side={ui % 2 === 0 ? 'left' : 'right'}
                    pulse={unitKey(u.unit) === firstCurrentKey}
                    stars={u.unit.type === 'scenario' ? quizStars[u.unit.ref] ?? 0 : 0}
                    onTap={() => go(u)}
                  />
                ))}
              </ol>
            </div>
          </section>
        );
      })}

      <BottomSheet open={locked !== null} onClose={() => setLocked(null)} title={UI.path_lockedTitle}>
        {locked && (
          <div className="space-y-4 text-center">
            <div className="text-4xl">{locked.unit.emoji}</div>
            <div>
              <div className="hero-han text-lg text-ink">{locked.unit.title}</div>
              <p className="text-sm text-tone6 mt-1">{UI.path_lockedHint}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const u = locked;
                setLocked(null);
                navigate(unitRoute(u.unit));
              }}
              className="btn-primary w-full"
            >
              {UI.path_unlockAnyway}
            </button>
            <button type="button" onClick={() => setLocked(null)} className="btn-ghost w-full">
              {UI.path_later}
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function PathNode({
  unit,
  side,
  pulse,
  stars,
  onTap,
}: {
  unit: UnitState;
  side: 'left' | 'right';
  pulse: boolean;
  stars: number;
  onTap: () => void;
}) {
  const { status } = unit;
  const alignLeft = side === 'left';

  return (
    <li className={`relative flex ${alignLeft ? 'justify-start' : 'justify-end'}`}>
      <button
        type="button"
        onClick={onTap}
        className={`flex items-center gap-3 max-w-[82%] rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
          status === 'locked'
            ? 'bg-card/60 border-line opacity-70'
            : status === 'done'
            ? 'bg-accent-soft border-accent/30'
            : 'bg-card border-line shadow-card'
        } ${alignLeft ? 'flex-row' : 'flex-row-reverse text-right'}`}
      >
        <span
          className={`relative flex items-center justify-center w-12 h-12 rounded-full text-2xl shrink-0 ${
            status === 'done'
              ? 'bg-accent text-white'
              : status === 'current'
              ? 'bg-card border-2 border-accent'
              : 'bg-line/60 text-tone6'
          }`}
        >
          {status === 'locked' ? '🔒' : unit.unit.emoji}
          {pulse && (
            <span className="absolute inset-0 rounded-full border-2 border-accent animate-ping-slow" aria-hidden />
          )}
        </span>
        <span className="min-w-0">
          <span className="block hero-han text-base text-ink truncate">{unit.unit.title}</span>
          <span className="block text-[11px] text-tone6 mt-0.5">
            {status === 'done' ? UI.path_statusDone : status === 'current' ? UI.path_statusCurrent : UI.path_statusLocked}
          </span>
          {unit.unit.type === 'scenario' && status === 'done' && (
            <span className={`mt-1 inline-flex ${alignLeft ? '' : 'justify-end'}`}>
              <Stars value={stars} size={12} />
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
