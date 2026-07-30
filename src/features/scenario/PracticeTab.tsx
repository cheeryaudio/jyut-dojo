import { useEffect, useState } from 'react';
import { JyutpingText } from '../../components/JyutpingText';
import { PitchShadow } from '../../components/PitchShadow';
import { PlayButton } from '../../components/PlayButton';
import { track } from '../../lib/analytics';
import { playAudio } from '../../lib/audio';
import { UI } from '../../lib/ui';
import { XP } from '../../lib/xp';
import { useProgress } from '../../stores/progress';
import type { Sentence } from '../../types';

interface PracticeTabProps {
  scenarioId: string;
  sentences: Sentence[];
  onDone: () => void;
}

/** 練: listen, self-grade, and requeue anything not yet known. */
export function PracticeTab({ scenarioId, sentences, onDone }: PracticeTabProps) {
  const completePractice = useProgress((state) => state.completePractice);
  const awardXp = useProgress((state) => state.awardXp);

  const [queue, setQueue] = useState<Sentence[]>(() => sentences);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [scored, setScored] = useState<Set<string>>(() => new Set());

  const current = queue[0];

  useEffect(() => {
    if (current) void playAudio(current.audio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const grade = (known: boolean) => {
    if (!current) return;
    // XP lands once per sentence, the first time it is marked 識.
    if (known && !scored.has(current.id)) {
      awardXp(XP.practiceSentence);
      setScored((current_) => new Set(current_).add(current.id));
    }
    setRevealed(false);
    setQueue((currentQueue) => {
      const [, ...rest] = currentQueue;
      const next = known ? rest : [...rest, current];
      if (next.length === 0) {
        completePractice(scenarioId);
        track('practice_complete', { scenarioId });
        setFinished(true);
      }
      return next;
    });
  };

  if (finished || !current) {
    return (
      <div className="space-y-5 text-center">
        <div className="text-5xl">✅</div>
        <div className="card p-6">
          <div className="hero-han text-xl text-ink">{UI.pr_doneTitle}</div>
          <p className="text-sm text-tone6 mt-2">{UI.pr_doneSub}</p>
        </div>
        <button type="button" onClick={onDone} className="btn-primary w-full">{UI.pr_goTest}</button>
      </div>
    );
  }

  const completed = sentences.length - queue.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm text-tone6">
        <span>{UI.pr_hint}</span>
        <span className="tabular-nums">{UI.pr_remaining(queue.length)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-line overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${(completed / sentences.length) * 100}%` }}
        />
      </div>

      <div className="card p-6 text-center space-y-4 min-h-[180px] flex flex-col justify-center">
        <PlayButton
          audio={current.audio}
          label={UI.pr_replay}
          variant="replay"
          size={24}
          className="mx-auto"
        />
        {!revealed ? (
          <p className="text-sm text-tone6">{UI.pr_listenTry}</p>
        ) : (
          <div className="space-y-2">
            <div className="hero-han text-2xl text-ink">{current.hanzi}</div>
            <JyutpingText jyutping={current.jyutping} className="text-sm" />
            <div className="text-sm text-tone6">{current.mandarin}</div>
          </div>
        )}
      </div>

      {!revealed ? (
        <button type="button" onClick={() => setRevealed(true)} className="btn-primary w-full">
          {UI.pr_seeAnswer}
        </button>
      ) : (
        <div className="space-y-3">
          {/* optional inline pitch-shadow — reuses the ToneCompare pitch pipeline */}
          <PitchShadow key={current.id} audio={current.audio} />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => grade(false)}
              className="btn-outline !border-tone1 text-tone1"
            >
              {UI.pr_dontKnow}
            </button>
            <button type="button" onClick={() => grade(true)} className="btn-primary">
              {UI.pr_know}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
