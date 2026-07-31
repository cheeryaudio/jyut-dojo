import { useMemo } from 'react';
import type { PathProgress } from '../lib/path';
import { useProgress } from '../stores/progress';

/** Subscribe only to the persisted fields used by path authorization and status. */
export function usePathProgress(): PathProgress {
  const learnedScenarios = useProgress((state) => state.learnedScenarios);
  const pinyinDone = useProgress((state) => state.pinyinDone);
  const basicsLearned = useProgress((state) => state.basicsLearned);
  const tonesIntroVisited = useProgress((state) => state.tonesIntroVisited);
  const grammarVisited = useProgress((state) => state.grammarVisited);
  const tonedrillBest = useProgress((state) => state.tonedrillBest);
  const recommendedStage = useProgress((state) => state.settings.recommendedStage);

  return useMemo(
    () => ({
      learnedScenarios,
      pinyinDone,
      basicsLearned,
      tonesIntroVisited,
      grammarVisited,
      tonedrillBest,
      recommendedStage,
    }),
    [
      learnedScenarios,
      pinyinDone,
      basicsLearned,
      tonesIntroVisited,
      grammarVisited,
      tonedrillBest,
      recommendedStage,
    ]
  );
}
