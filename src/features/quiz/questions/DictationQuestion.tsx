import { useEffect, useMemo, useState } from 'react';
import { PlayButton } from '../../../components/PlayButton';
import { SyllableArranger } from '../../../components/SyllableArranger';
import { CheckIcon } from '../../../components/icons';
import { playAudio } from '../../../lib/audio';
import { gradeDictation, isPass, toSyllables } from '../../../lib/dictation';
import { UI } from '../../../lib/ui';
import { AnswerSheet, NextButton } from '../NextButton';
import type { QuestionProps } from '../types';

/**
 * 聽寫 — hear the sentence, rebuild it from jyutping chips. Graded leniently by
 * gradeDictation: right sounds with wrong tones still passes, with a note.
 */
export function DictationQuestion({ question, onAnswer }: QuestionProps<'dictation'>) {
  const target = useMemo(() => toSyllables(question.sentence.jyutping), [question.sentence.jyutping]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    void playAudio(question.sentence.audio);
  }, [question.sentence.audio]);

  const result = gradeDictation(placed, target);
  const correct = isPass(result);

  return (
    <div className="space-y-4">
      <p className="text-sm text-tone6">{UI.quiz_dictationPrompt}</p>
      <div className="card p-4 flex items-center justify-between gap-3">
        <div className="text-lg text-ink flex-1">{question.sentence.mandarin}</div>
        <PlayButton audio={question.sentence.audio} label={UI.quiz_replay} variant="replay" />
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
          {result === 'toneless' && (
            <div className="text-center text-xs text-tone2">{UI.quiz_dictationTonesNote}</div>
          )}
          {!correct && (
            <AnswerSheet
              title={UI.quiz_correctSentence}
              hanzi={question.sentence.hanzi}
              jyutping={question.sentence.jyutping}
            />
          )}
          <NextButton
            correct={correct}
            onNext={() => onAnswer(correct, { kind: 'dictation', sentence: question.sentence })}
          />
        </>
      )}
    </div>
  );
}
