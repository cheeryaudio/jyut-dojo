import { Stars } from '../../components/Stars';
import { confusionPairs, toneAccuracy } from '../../domain/stats/toneStats';
import type { ToneAnswer } from '../../domain/progress/model';
import { scenarios } from '../../lib/data';
import { ALL_TONES, TONE_LABELS, toneColor } from '../../lib/tones';
import { UI } from '../../lib/ui';
import type { HeatDay } from '../../lib/xp';

const HEAT_COLORS = ['#EFE9DF', '#EBD3BF', '#DDA57E', '#CE7B45', '#C4622D'];

function heatColor(level: number): string {
  return HEAT_COLORS[level] ?? HEAT_COLORS[0];
}

export function Stat({ value, unit, label }: { value: string; unit: string; label: string }) {
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

/** 30-day activity heatmap. */
export function HeatmapSection({ days }: { days: HeatDay[] }) {
  return (
    <section>
      <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_heatTitle}</h2>
      <div className="card p-4">
        <div className="grid grid-flow-col grid-rows-5 gap-1.5 justify-start">
          {days.map((day) => (
            <span
              key={day.key}
              className="w-3.5 h-3.5 rounded-[3px]"
              style={{ background: heatColor(day.level) }}
              title={day.xp > 0 ? `${day.key}: ${day.xp} XP` : day.key}
            />
          ))}
        </div>
        <div className="flex items-center justify-end gap-1 mt-3 text-[10px] text-tone6">
          <span>{UI.pg_heatLess}</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className="w-3 h-3 rounded-[3px]" style={{ background: heatColor(level) }} />
          ))}
          <span>{UI.pg_heatMore}</span>
        </div>
      </div>
    </section>
  );
}

/** Star rating per scenario quiz. */
export function ScenarioStarsSection({
  learnedCount,
  quizStars,
}: {
  learnedCount: number;
  quizStars: Record<string, number>;
}) {
  return (
    <section>
      <h2 className="text-sm font-medium text-tone6 mb-2 px-1">
        {UI.pg_scenarioStars(learnedCount, scenarios.length)}
      </h2>
      <div className="card divide-y divide-line">
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-xl" aria-hidden="true">{scenario.emoji}</span>
            <span className="hero-han text-base flex-1">{scenario.title}</span>
            <Stars value={quizStars[scenario.id] ?? 0} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Per-tone accuracy plus the pairs the learner actually mixes up. */
export function ToneStatsSections({ answers }: { answers: ToneAnswer[] }) {
  const rows = toneAccuracy(answers, ALL_TONES);
  const pairs = confusionPairs(answers);

  return (
    <>
      <section>
        <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_toneAccuracy}</h2>
        <div className="card p-4 space-y-3">
          {answers.length === 0 ? (
            <p className="text-sm text-tone6 text-center py-2">{UI.pg_noTone}</p>
          ) : (
            rows.map((row) => (
              <div key={row.tone} className="flex items-center gap-3">
                <span className="w-14 text-xs" style={{ color: toneColor(row.tone) }}>
                  {UI.pg_toneN(row.tone)}
                </span>
                <div className="flex-1 h-2.5 rounded-full bg-line overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${row.percent}%`, background: toneColor(row.tone) }}
                  />
                </div>
                <span className="w-16 text-right text-xs text-tone6 tabular-nums">
                  {row.total > 0 ? `${row.percent}% (${row.total})` : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {pairs.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_confusion}</h2>
          <div className="card p-4 space-y-2.5">
            {pairs.map((pair) => (
              <div key={pair.key} className="flex items-center gap-3">
                <span className="flex items-center gap-1 w-16">
                  <span className="font-medium" style={{ color: toneColor(pair.a) }}>{pair.a}</span>
                  <span className="text-tone6 text-xs">vs</span>
                  <span className="font-medium" style={{ color: toneColor(pair.b) }}>{pair.b}</span>
                </span>
                <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pair.percent}%` }} />
                </div>
                <span className="w-16 text-right text-xs text-tone6 tabular-nums">
                  {pair.percent}% ({pair.total})
                </span>
              </div>
            ))}
            <p className="text-[11px] text-tone6 pt-1">
              {UI.pg_confusionHint(TONE_LABELS[2], TONE_LABELS[5], TONE_LABELS[3], TONE_LABELS[6])}
            </p>
          </div>
        </section>
      )}
    </>
  );
}
