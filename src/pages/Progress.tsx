import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CloudSyncSection } from '../features/progress/CloudSyncSection';
import { OfflineAudioSection } from '../features/progress/OfflineAudioSection';
import { PreferencesSection } from '../features/progress/PreferencesSection';
import { ReminderSection } from '../features/progress/ReminderSection';
import {
  HeatmapSection,
  ScenarioStarsSection,
  Stat,
  ToneStatsSections,
} from '../features/progress/StatsSections';
import { computeStreak } from '../lib/dates';
import { UI } from '../lib/ui';
import { heatmap, totalXp } from '../lib/xp';
import { useProgress } from '../stores/progress';

export function Progress() {
  const activityLog = useProgress((state) => state.activityLog);
  const reviewCards = useProgress((state) => state.reviewCards);
  const learnedScenarios = useProgress((state) => state.learnedScenarios);
  const quizStars = useProgress((state) => state.quizStars);
  const toneAnswers = useProgress((state) => state.toneAnswers);
  const xpLog = useProgress((state) => state.xpLog);
  const restartOnboarding = useProgress((state) => state.restartOnboarding);

  const days = useMemo(() => heatmap(xpLog, activityLog, 30), [xpLog, activityLog]);

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="hero-han text-2xl font-bold text-ink">{UI.pg_title}</h1>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat value={`${totalXp(xpLog)}`} unit="XP" label={UI.pg_statXp} />
        <Stat value={`${computeStreak(activityLog)}`} unit={UI.pg_unitDay} label={UI.pg_statStreak} />
        <Stat
          value={`${Object.keys(reviewCards).length}`}
          unit={UI.pg_unitCard}
          label={UI.pg_statCards}
        />
      </div>

      <HeatmapSection days={days} />
      <ScenarioStarsSection learnedCount={learnedScenarios.length} quizStars={quizStars} />
      <ToneStatsSections answers={toneAnswers} />

      <CloudSyncSection />
      <OfflineAudioSection />
      <PreferencesSection />
      <ReminderSection />

      <section>
        <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_other}</h2>
        <button
          type="button"
          onClick={restartOnboarding}
          className="card w-full p-4 flex items-center gap-3 text-left active:scale-[0.99] transition"
        >
          <span className="text-2xl" aria-hidden="true">🧭</span>
          <span className="flex-1">
            <span className="block font-medium text-ink">{UI.pg_resetGoal}</span>
            <span className="block text-xs text-tone6 mt-0.5">{UI.pg_resetGoalHint}</span>
          </span>
          <span className="text-tone6" aria-hidden="true">›</span>
        </button>
      </section>

      <div className="flex justify-center gap-5 text-sm pt-1 pb-2">
        <Link to="/privacy" className="text-tone6">{UI.pg_privacy}</Link>
        <Link to="/about" className="text-tone6">{UI.pg_about}</Link>
      </div>
    </div>
  );
}
