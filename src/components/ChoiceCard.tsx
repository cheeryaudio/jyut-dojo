import type { ReactNode } from 'react';

export type ChoiceState = 'idle' | 'ok' | 'bad' | 'dim';

/** Feedback state for one option once the learner has committed an answer. */
export function choiceState(answered: boolean, isCorrect: boolean, isPicked: boolean): ChoiceState {
  if (!answered) return 'idle';
  if (isCorrect) return 'ok';
  if (isPicked) return 'bad';
  return 'dim';
}

const STATE_CLASS: Record<ChoiceState, string> = {
  idle: 'active:scale-[0.99]',
  ok: '!border-tone3 bg-tone3/5',
  bad: '!border-tone1 bg-tone1/5',
  dim: 'opacity-50',
};

interface ChoiceCardProps {
  state: ChoiceState;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

/** One answer option, styled consistently across quiz and 錯題重練. */
export function ChoiceCard({ state, onClick, children, className = '' }: ChoiceCardProps) {
  return (
    <button
      type="button"
      disabled={state !== 'idle'}
      onClick={onClick}
      className={`card transition ${STATE_CLASS[state]} ${className}`}
    >
      {children}
    </button>
  );
}
