import { useEffect, useMemo, useState } from 'react';
import { ChoiceCard, choiceState } from '../../../components/ChoiceCard';
import { PlayButton } from '../../../components/PlayButton';
import { shuffle } from '../../../domain/exercises/random';
import { playAudio } from '../../../lib/audio';
import { pinyinItems } from '../../../lib/data';
import { UI } from '../../../lib/ui';
import { OrphanSkip } from './OrphanSkip';
import type { RedoProps } from './types';

/** Redo a missed 粵拼 question. */
export function PinyinRedo({ payload, onGrade }: RedoProps<'pinyin'>) {
  // An unknown lesson ref would throw inside pinyinItems; treat it as an orphan.
  const pool = useMemo(() => {
    try {
      return pinyinItems(payload.ref);
    } catch {
      return [];
    }
  }, [payload.ref]);
  const target = pool.find((item) => item.jp === payload.jp);
  const options = useMemo<string[]>(() => {
    if (!target) return [];
    const distractors = shuffle(
      pool.map((item) => item.jp).filter((jp) => jp !== target.jp)
    ).slice(0, 3);
    return shuffle([target.jp, ...distractors]);
  }, [pool, target]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (target) void playAudio(target.audio);
  }, [target]);

  if (!target) return <OrphanSkip onGrade={onGrade} />;
  const answered = picked !== null;

  return (
    <div className="space-y-4">
      <div className="card p-5 text-center space-y-2">
        <p className="text-sm text-tone6">{UI.rv_redoPinyinPrompt}</p>
        <PlayButton
          audio={target.audio}
          label={UI.quiz_replay}
          variant="replay"
          size={22}
          className="mx-auto"
        />
        <div className="hero-han text-2xl text-ink pt-1">{target.hanzi}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => (
          <ChoiceCard
            key={option}
            state={choiceState(answered, option === target.jp, option === picked)}
            onClick={() => setPicked(option)}
            className="p-4 font-mono text-xl"
          >
            {option}
          </ChoiceCard>
        ))}
      </div>
      {answered && (
        <button type="button" onClick={() => onGrade(picked === target.jp)} className="btn-primary w-full">
          {UI.rv_next}
        </button>
      )}
    </div>
  );
}
