import { useEffect, useMemo, useState } from 'react';
import { ChoiceCard, choiceState } from '../../../components/ChoiceCard';
import { PlayButton } from '../../../components/PlayButton';
import { ToneContour } from '../../../components/ToneContour';
import { shuffle } from '../../../domain/exercises/random';
import { playAudio } from '../../../lib/audio';
import { tonesets } from '../../../lib/data';
import { ALL_TONES, TONE_LABELS, toneColor } from '../../../lib/tones';
import { UI } from '../../../lib/ui';
import { OrphanSkip } from './OrphanSkip';
import type { RedoProps } from './types';

/** Redo a missed 聲調 question. */
export function ToneRedo({ payload, onGrade }: RedoProps<'tonedrill'>) {
  const set = tonesets.find((candidate) => candidate.syllable === payload.toneSet);
  const targetItem = set?.items.find((item) => item.tone === payload.actual);
  const options = useMemo<number[]>(() => {
    const distractors = shuffle(ALL_TONES.filter((tone) => tone !== payload.actual)).slice(0, 2);
    return shuffle([payload.actual, ...distractors]);
  }, [payload.actual]);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    if (targetItem) void playAudio(targetItem.audio);
  }, [targetItem]);

  // A retired tone set or tone would otherwise silently drill the wrong syllable.
  if (!targetItem) return <OrphanSkip onGrade={onGrade} />;
  const answered = picked !== null;

  return (
    <div className="space-y-4">
      <div className="card p-5 text-center space-y-2">
        <p className="text-sm text-tone6">{UI.rv_redoTonePrompt}</p>
        <PlayButton
          audio={targetItem.audio}
          label={UI.quiz_replay}
          variant="replay"
          size={22}
          className="mx-auto"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {options.map((tone) => (
          <ChoiceCard
            key={tone}
            state={choiceState(answered, tone === payload.actual, tone === picked)}
            onClick={() => setPicked(tone)}
            className="p-3 flex flex-col items-center gap-1"
          >
            <ToneContour tone={tone} size={56} strokeWidth={3} />
            <span className="text-sm font-medium" style={{ color: toneColor(tone) }}>
              {UI.pg_toneN(tone)}
            </span>
            <span className="text-[10px] text-tone6">{TONE_LABELS[tone]}</span>
          </ChoiceCard>
        ))}
      </div>
      {answered && (
        <button
          type="button"
          onClick={() => onGrade(picked === payload.actual)}
          className="btn-primary w-full"
        >
          {UI.rv_next}
        </button>
      )}
    </div>
  );
}
