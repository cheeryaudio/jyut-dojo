import { useEffect, useState } from 'react';
import { ChoiceCard, choiceState } from '../../../components/ChoiceCard';
import { JyutpingText } from '../../../components/JyutpingText';
import { PlayButton } from '../../../components/PlayButton';
import { playAudio } from '../../../lib/audio';
import { UI } from '../../../lib/ui';
import { NextButton } from '../NextButton';
import type { QuestionProps } from '../types';

/** 聽辨：hear a line, pick the matching sentence. */
export function ListenQuestion({ question, onAnswer }: QuestionProps<'listen'>) {
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    void playAudio(question.sentence.audio);
  }, [question.sentence.audio]);

  const answered = picked !== null;
  const correct = picked === question.sentence.id;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-tone6 mb-3">{UI.quiz_listenPrompt}</p>
        <PlayButton
          audio={question.sentence.audio}
          label={UI.quiz_replay}
          variant="replay"
          size={22}
          className="mx-auto"
        />
      </div>
      <div className="space-y-2.5">
        {question.options.map((option) => (
          <ChoiceCard
            key={option.id}
            state={choiceState(answered, option.id === question.sentence.id, option.id === picked)}
            onClick={() => setPicked(option.id)}
            className="w-full text-left p-3.5"
          >
            <div className="hero-han text-xl">{option.hanzi}</div>
            {answered && <JyutpingText jyutping={option.jyutping} className="text-xs mt-1" />}
          </ChoiceCard>
        ))}
      </div>
      {answered && (
        <NextButton
          correct={correct}
          onNext={() => onAnswer(correct, { kind: 'sentence', sentence: question.sentence })}
        />
      )}
    </div>
  );
}
