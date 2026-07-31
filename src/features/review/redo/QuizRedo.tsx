import { useEffect, useMemo, useState } from 'react';
import { ChoiceCard, choiceState } from '../../../components/ChoiceCard';
import { JyutpingText } from '../../../components/JyutpingText';
import { PlayButton } from '../../../components/PlayButton';
import { shuffle } from '../../../domain/exercises/random';
import { playAudio } from '../../../lib/audio';
import { getSentence, scenarioSentences } from '../../../lib/data';
import { UI } from '../../../lib/ui';
import type { Sentence } from '../../../types';
import { OrphanSkip } from './OrphanSkip';
import type { RedoProps } from './types';

/** Redo a missed 聽辨 question. */
export function QuizRedo({ payload, onGrade }: RedoProps<'quiz'>) {
  const target = getSentence(payload.sentenceId);
  const options = useMemo<Sentence[]>(() => {
    if (!target) return [];
    const others = shuffle(
      scenarioSentences(payload.scenarioId).filter((sentence) => sentence.id !== target.id)
    ).slice(0, 3);
    return shuffle([target, ...others]);
  }, [payload.scenarioId, target]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (target) void playAudio(target.audio);
  }, [target]);

  if (!target) return <OrphanSkip onGrade={onGrade} />;
  const answered = picked !== null;

  return (
    <div className="space-y-4">
      <div className="card p-5 text-center space-y-2">
        <p className="text-sm text-tone6">{UI.rv_redoQuizPrompt}</p>
        <PlayButton
          audio={target.audio}
          label={UI.quiz_replay}
          variant="replay"
          size={22}
          className="mx-auto"
        />
      </div>
      <div className="space-y-2.5">
        {options.map((option) => (
          <ChoiceCard
            key={option.id}
            state={choiceState(answered, option.id === target.id, option.id === picked)}
            onClick={() => setPicked(option.id)}
            className="w-full text-left p-3.5"
          >
            <div className="hero-han text-xl">{option.hanzi}</div>
            {answered && <JyutpingText jyutping={option.jyutping} className="text-xs mt-1" />}
          </ChoiceCard>
        ))}
      </div>
      {answered && (
        <button type="button" onClick={() => onGrade(picked === target.id)} className="btn-primary w-full">
          {UI.rv_next}
        </button>
      )}
    </div>
  );
}
