import { useEffect, useMemo, useState } from 'react';
import { ChoiceCard, choiceState } from '../../../components/ChoiceCard';
import { JyutpingText } from '../../../components/JyutpingText';
import { PlayButton } from '../../../components/PlayButton';
import { shuffle } from '../../../domain/exercises/random';
import { playAudio } from '../../../lib/audio';
import { blankOut } from '../../../lib/cloze';
import { getSentence, getWord, scenarioVocab } from '../../../lib/data';
import { UI } from '../../../lib/ui';
import type { Word } from '../../../types';
import { OrphanSkip } from './OrphanSkip';
import type { RedoProps } from './types';

/** Redo a missed 填空 question. */
export function ClozeRedo({ payload, onGrade }: RedoProps<'cloze'>) {
  const sentence = getSentence(payload.sentenceId);
  const word = getWord(payload.wordId);
  const options = useMemo<Word[]>(() => {
    if (!word) return [];
    const others = shuffle(
      scenarioVocab(payload.scenarioId)
        .map((id) => getWord(id))
        .filter((candidate): candidate is Word => candidate !== undefined && candidate.id !== word.id)
    ).slice(0, 3);
    return shuffle([word, ...others]);
  }, [payload.scenarioId, word]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (sentence) void playAudio(sentence.audio);
  }, [sentence]);

  if (!sentence || !word || options.length < 2) return <OrphanSkip onGrade={onGrade} />;
  const answered = picked !== null;

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="hero-han text-xl leading-relaxed flex-1">{blankOut(sentence.hanzi, word.hanzi)}</p>
          <PlayButton audio={sentence.audio} variant="replay" />
        </div>
        <div className="text-xs text-tone6">{sentence.mandarin}</div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {options.map((option) => (
          <ChoiceCard
            key={option.id}
            state={choiceState(answered, option.id === word.id, option.id === picked)}
            onClick={() => setPicked(option.id)}
            className="p-3.5 text-center"
          >
            <div className="hero-han text-xl">{option.hanzi}</div>
            <JyutpingText jyutping={option.jyutping} className="text-xs mt-1" />
          </ChoiceCard>
        ))}
      </div>
      {answered && (
        <button type="button" onClick={() => onGrade(picked === word.id)} className="btn-primary w-full">
          {UI.rv_next}
        </button>
      )}
    </div>
  );
}
