import type { QuizQuestion } from '../../domain/exercises/quizBuilder';
import { ChainQuestion } from './questions/ChainQuestion';
import { ClozeQuestion } from './questions/ClozeQuestion';
import { DictationQuestion } from './questions/DictationQuestion';
import { ListenQuestion } from './questions/ListenQuestion';
import { OrderQuestion } from './questions/OrderQuestion';
import type { AnswerHandler } from './types';

/** Render whichever question the builder produced. */
export function QuestionView({
  question,
  onAnswer,
}: {
  question: QuizQuestion;
  onAnswer: AnswerHandler;
}) {
  switch (question.kind) {
    case 'listen':
      return <ListenQuestion question={question} onAnswer={onAnswer} />;
    case 'order':
      return <OrderQuestion question={question} onAnswer={onAnswer} />;
    case 'chain':
      return <ChainQuestion question={question} onAnswer={onAnswer} />;
    case 'cloze':
      return <ClozeQuestion question={question} onAnswer={onAnswer} />;
    case 'dictation':
      return <DictationQuestion question={question} onAnswer={onAnswer} />;
  }
}
