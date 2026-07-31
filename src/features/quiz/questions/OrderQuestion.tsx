import { useMemo, useState } from 'react';
import { JyutpingText } from '../../../components/JyutpingText';
import { SyllableArranger } from '../../../components/SyllableArranger';
import { CheckIcon } from '../../../components/icons';
import { toSyllables } from '../../../lib/dictation';
import { UI } from '../../../lib/ui';
import { NextButton } from '../NextButton';
import type { QuestionProps } from '../types';

/** 排序：rebuild the sentence from shuffled jyutping chips. */
export function OrderQuestion({ question, onAnswer }: QuestionProps<'order'>) {
  const target = useMemo(() => toSyllables(question.sentence.jyutping), [question.sentence.jyutping]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  const correct = placed.join(' ') === target.join(' ');

  return (
    <div className="space-y-4">
      <p className="text-sm text-tone6">{UI.quiz_orderPrompt}</p>
      <div className="card p-4">
        <div className="text-lg text-ink">{question.sentence.mandarin}</div>
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
              <div className="text-xs text-tone6 mb-1">{UI.quiz_correctOrder}</div>
              <JyutpingText jyutping={target.join(' ')} className="text-sm" />
              <div className="hero-han text-lg mt-1">{question.sentence.hanzi}</div>
            </div>
          )}
          <NextButton
            correct={correct}
            onNext={() => onAnswer(correct, { kind: 'sentence', sentence: question.sentence })}
          />
        </>
      )}
    </div>
  );
}
