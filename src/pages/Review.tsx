import { useState } from 'react';
import { CardReview } from '../features/review/CardReview';
import { WrongReview } from '../features/review/WrongReview';
import { getWord } from '../lib/data';
import { buildReviewQueue } from '../lib/reviewQueue';
import { UI } from '../lib/ui';
import { useProgress } from '../stores/progress';

type Segment = 'cards' | 'wrong';

export function Review() {
  const reviewCards = useProgress((state) => state.reviewCards);
  const wrongItems = useProgress((state) => state.wrongItems);
  const [segment, setSegment] = useState<Segment>('cards');

  const dueCount = buildReviewQueue(reviewCards, getWord).length;

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="hero-han text-2xl font-bold text-ink">{UI.rv_title}</h1>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-line/50 p-1" role="tablist">
        <SegmentButton
          active={segment === 'cards'}
          onClick={() => setSegment('cards')}
          label={UI.rv_segCards}
          badge={dueCount}
        />
        <SegmentButton
          active={segment === 'wrong'}
          onClick={() => setSegment('wrong')}
          label={UI.rv_segWrong}
          badge={wrongItems.length}
        />
      </div>

      {segment === 'cards' ? <CardReview /> : <WrongReview />}
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative rounded-xl py-2 text-sm font-medium transition ${
        active ? 'bg-card text-accent shadow-card' : 'text-tone6'
      }`}
    >
      {label}
      {badge > 0 && (
        <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] align-middle">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
