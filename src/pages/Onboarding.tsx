import { useState } from 'react';
import { useProgress } from '../stores/progress';
import { GOAL_PRESETS, DEFAULT_GOAL_MIN, goalXp } from '../lib/xp';
import { UI } from '../lib/ui';

type ExperienceKey = 'new' | 'some';

const EXPERIENCE: { key: ExperienceKey; title: string; sub: string; stage: string }[] = [
  { key: 'new', title: UI.ob_expNewTitle, sub: UI.ob_expNewSub, stage: 'stage0' },
  { key: 'some', title: UI.ob_expSomeTitle, sub: UI.ob_expSomeSub, stage: 'stage2' },
];

export function Onboarding() {
  const completeOnboarding = useProgress((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(DEFAULT_GOAL_MIN);
  const [exp, setExp] = useState<ExperienceKey>('new');

  const finish = () => {
    const stage = EXPERIENCE.find((e) => e.key === exp)?.stage ?? 'stage0';
    completeOnboarding(goal, stage);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-paper flex flex-col">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col px-6 pt-10 pb-8 safe-bottom">
        <div className="flex gap-1.5 mb-8">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="flex-1 flex flex-col justify-center text-center space-y-5">
            <div className="text-6xl">🥋</div>
            <div>
              <p className="text-sm text-tone6 tracking-wide">{UI.appName} · Jyut Dojo</p>
              <h1 className="hero-han text-3xl font-bold text-ink mt-2 leading-snug">
                {UI.ob_hero}
              </h1>
            </div>
            <p className="text-sm text-tone6 leading-relaxed px-2">{UI.ob_heroSub}</p>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 flex flex-col justify-center space-y-5">
            <div className="text-center">
              <h1 className="hero-han text-2xl font-bold text-ink">{UI.ob_goalTitle}</h1>
              <p className="text-sm text-tone6 mt-1">{UI.ob_goalSub}</p>
            </div>
            <div className="space-y-3">
              {GOAL_PRESETS.map((g) => (
                <button
                  key={g.minutes}
                  type="button"
                  onClick={() => setGoal(g.minutes)}
                  className={`card w-full p-4 flex items-center justify-between transition ${
                    goal === g.minutes ? '!border-accent bg-accent-soft' : ''
                  }`}
                >
                  <div className="text-left">
                    <div className="hero-han text-lg text-ink">{g.label}</div>
                    <div className="text-xs text-tone6 mt-0.5">{g.sub}</div>
                  </div>
                  <span className="text-sm font-medium text-accent">{UI.ob_goalPerDay(goalXp(g.minutes))}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col justify-center space-y-5">
            <div className="text-center">
              <h1 className="hero-han text-2xl font-bold text-ink">{UI.ob_expTitle}</h1>
              <p className="text-sm text-tone6 mt-1">{UI.ob_expSub}</p>
            </div>
            <div className="space-y-3">
              {EXPERIENCE.map((e) => (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => setExp(e.key)}
                  className={`card w-full p-4 text-left transition ${
                    exp === e.key ? '!border-accent bg-accent-soft' : ''
                  }`}
                >
                  <div className="hero-han text-lg text-ink">{e.title}</div>
                  <div className="text-xs text-tone6 mt-0.5">{e.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-6">
          {step < 2 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className="btn-primary w-full">
              {UI.ob_continue}
            </button>
          ) : (
            <button type="button" onClick={finish} className="btn-primary w-full">
              {UI.ob_start}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
