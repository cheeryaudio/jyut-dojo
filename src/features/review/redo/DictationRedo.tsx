import { useEffect, useMemo, useState } from 'react';
import { JyutpingText } from '../../../components/JyutpingText';
import { PlayButton } from '../../../components/PlayButton';
import { SyllableArranger } from '../../../components/SyllableArranger';
import { CheckIcon } from '../../../components/icons';
import { playAudio } from '../../../lib/audio';
import { getSentence } from '../../../lib/data';
import { gradeDictation, isPass, toSyllables } from '../../../lib/dictation';
import { UI } from '../../../lib/ui';
import { OrphanSkip } from './OrphanSkip';
import type { RedoProps } from './types';

/** Redo a missed 聽寫 question. */
export function DictationRedo({ payload, onGrade }: RedoProps<'dictation'>) {
  const sentence = getSentence(payload.sentenceId);
  const target = useMemo(() => (sentence ? toSyllables(sentence.jyutping) : []), [sentence]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (sentence) void playAudio(sentence.audio);
  }, [sentence]);

  if (!sentence || target.length === 0) return <OrphanSkip onGrade={onGrade} />;
  const correct = isPass(gradeDictation(placed, target));

  return (
    <div className="space-y-4">
      <p className="text-sm text-tone6">{UI.rv_redoDictationPrompt}</p>
      <div className="card p-4 flex items-center justify-between gap-3">
        <div className="text-lg text-ink flex-1">{sentence.mandarin}</div>
        <PlayButton audio={sentence.audio} variant="replay" />
      </div>

      <SyllableArranger
        target={target}
        locked={checked}
        onChange={setPlaced}
        placeholder={UI.quiz_orderPlaceholder}
      />

      {!checked ? (
        <button
          type="button"
          disabled={placed.length !== target.length}
          onClick={() => setChecked(true)}
          className="btn-primary w-full disabled:opacity-40"
        >
          <CheckIcon size={18} /> {UI.quiz_check}
        </button>
      ) : (
        <>
          {!correct && (
            <div className="card p-3.5">
              <div className="hero-han text-lg">{sentence.hanzi}</div>
              <JyutpingText jyutping={sentence.jyutping} className="text-xs mt-1" />
            </div>
          )}
          <button type="button" onClick={() => onGrade(correct)} className="btn-primary w-full">
            {UI.rv_next}
          </button>
        </>
      )}
    </div>
  );
}
