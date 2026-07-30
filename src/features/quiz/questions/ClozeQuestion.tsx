import { useEffect, useState } from 'react';
import { ChoiceCard, choiceState } from '../../../components/ChoiceCard';
import { JyutpingText } from '../../../components/JyutpingText';
import { PlayButton } from '../../../components/PlayButton';
import { playAudio } from '../../../lib/audio';
import { UI } from '../../../lib/ui';
import { AnswerSheet, NextButton } from '../NextButton';
import type { QuestionProps } from '../types';

/** 填空：pick the word missing from the sentence. */
export function ClozeQuestion({ question, onAnswer }: QuestionProps<'cloze'>) {
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    void playAudio(question.sentence.audio);
  }, [question.sentence.audio]);

  const answered = picked !== null;
  const correct = picked === question.word.id;

  return (
    <div className="space-y-4">
      <p className="text-sm text-tone6">{UI.quiz_clozePrompt}</p>
      <div className="card p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="hero-han text-xl leading-relaxed flex-1">{question.blanked}</p>
          <PlayButton audio={question.sentence.audio} variant="replay" />
        </div>
        <div className="text-xs text-tone6">{question.sentence.mandarin}</div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {question.options.map((option) => (
          <ChoiceCard
            key={option.id}
            state={choiceState(answered, option.id === question.word.id, option.id === picked)}
            onClick={() => setPicked(option.id)}
            className="p-3.5 text-center"
          >
            <div className="hero-han text-xl">{option.hanzi}</div>
            <JyutpingText jyutping={option.jyutping} className="text-xs mt-1" />
          </ChoiceCard>
        ))}
      </div>
      {answered && (
        <>
          {!correct && (
            <AnswerSheet
              title={UI.quiz_correctSentence}
              hanzi={question.sentence.hanzi}
              jyutping={question.sentence.jyutping}
            />
          )}
          <NextButton
            correct={correct}
            onNext={() =>
              onAnswer(correct, { kind: 'cloze', sentence: question.sentence, word: question.word })
            }
          />
        </>
      )}
    </div>
  );
}
