import { JyutpingText } from '../../components/JyutpingText';
import { UI } from '../../lib/ui';

/** Verdict line plus the advance button shown after every answered question. */
export function NextButton({ correct, onNext }: { correct: boolean; onNext: () => void }) {
  return (
    <div className="space-y-3">
      <div className={`text-center font-medium ${correct ? 'text-tone3' : 'text-tone1'}`} role="status">
        {correct ? UI.quiz_correct : UI.quiz_wrong}
      </div>
      <button type="button" onClick={onNext} className="btn-primary w-full">
        {UI.quiz_next}
      </button>
    </div>
  );
}

/** The answer sheet shown when the learner got a sentence question wrong. */
export function AnswerSheet({ title, hanzi, jyutping }: { title: string; hanzi: string; jyutping: string }) {
  return (
    <div className="card p-3.5">
      <div className="text-xs text-tone6 mb-1">{title}</div>
      <div className="hero-han text-lg">{hanzi}</div>
      <JyutpingText jyutping={jyutping} className="text-xs mt-1" />
    </div>
  );
}
