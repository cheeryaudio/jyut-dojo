import { useEffect, useState } from 'react';
import { ChoiceCard, choiceState } from '../../../components/ChoiceCard';
import { JyutpingText } from '../../../components/JyutpingText';
import { PlayButton } from '../../../components/PlayButton';
import { playAudio } from '../../../lib/audio';
import { UI } from '../../../lib/ui';
import { NextButton } from '../NextButton';
import type { QuestionProps } from '../types';

/** 對話接龍：given one line, pick the reply that follows it. */
export function ChainQuestion({ question, onAnswer }: QuestionProps<'chain'>) {
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    void playAudio(question.prompt.audio);
  }, [question.prompt.audio]);

  const answered = picked !== null;
  const correct = picked === question.answer.id;

  return (
    <div className="space-y-4">
      <p className="text-sm text-tone6">{UI.quiz_chainPrompt}</p>
      <div className="card p-4 flex items-center justify-between gap-3">
        <div>
          <div className="hero-han text-xl">{question.prompt.hanzi}</div>
          <JyutpingText jyutping={question.prompt.jyutping} className="text-xs mt-1" />
        </div>
        <PlayButton audio={question.prompt.audio} variant="replay" />
      </div>
      <div className="text-center text-tone6 text-sm" aria-hidden="true">↓</div>
      <div className="space-y-2.5">
        {question.options.map((option) => (
          <ChoiceCard
            key={option.id}
            state={choiceState(answered, option.id === question.answer.id, option.id === picked)}
            onClick={() => setPicked(option.id)}
            className="w-full text-left p-3.5"
          >
            <div className="hero-han text-lg">{option.hanzi}</div>
            {answered && <JyutpingText jyutping={option.jyutping} className="text-xs mt-1" />}
          </ChoiceCard>
        ))}
      </div>
      {answered && (
        <NextButton
          correct={correct}
          onNext={() => onAnswer(correct, { kind: 'sentence', sentence: question.answer })}
        />
      )}
    </div>
  );
}
