import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { JyutpingText } from '../../components/JyutpingText';
import { PlayButton } from '../../components/PlayButton';
import { track } from '../../lib/analytics';
import { playAudio } from '../../lib/audio';
import { getWord } from '../../lib/data';
import { buildReviewQueue, countResolvableReviewCards } from '../../lib/reviewQueue';
import { formatInterval, GRADE_LABELS, previewIntervals, type Grade } from '../../lib/srs';
import { UI } from '../../lib/ui';
import { useProgress, type CardFront } from '../../stores/progress';

const FRONTS: { value: CardFront; label: string }[] = [
  { value: 'hanzi', label: UI.rv_frontHanzi },
  { value: 'jyutping', label: UI.rv_frontJyutping },
  { value: 'audio', label: UI.rv_frontAudio },
];
const GRADE_ORDER: Grade[] = ['again', 'hard', 'good', 'easy'];
const GRADE_STYLE: Record<Grade, string> = {
  again: 'border-tone1 text-tone1',
  hard: 'border-tone2 text-tone2',
  good: 'border-tone3 text-tone3',
  easy: 'border-tone4 text-tone4',
};

/** SM-2 flashcard review over the due queue. */
export function CardReview() {
  const reviewCards = useProgress((state) => state.reviewCards);
  const cardFront = useProgress((state) => state.settings.cardFront);
  const setCardFront = useProgress((state) => state.setCardFront);
  const gradeReview = useProgress((state) => state.gradeReview);

  const [queue, setQueue] = useState<string[]>(() => buildReviewQueue(reviewCards, getWord));
  const [flipped, setFlipped] = useState(false);

  const currentId = queue[0];
  const card = currentId ? reviewCards[currentId] : undefined;
  const word = card ? getWord(card.wordId) : undefined;
  const preview = useMemo(() => (card ? previewIntervals(card) : null), [card]);

  useEffect(() => {
    if (flipped && word) void playAudio(word.audio);
  }, [flipped, word]);

  const totalDue = buildReviewQueue(reviewCards, getWord).length;

  const onGrade = (grade: Grade) => {
    if (!currentId) return;
    gradeReview(currentId, grade);
    track('review_grade', { grade });
    setFlipped(false);
    // "again" sends the card to the back of today's queue instead of dropping it.
    setQueue((current) => (grade === 'again' ? [...current.slice(1), currentId] : current.slice(1)));
  };

  if (!card || !word) {
    return (
      <div className="card p-8 text-center space-y-2">
        <div className="text-4xl">✅</div>
        <div className="font-medium text-ink">{UI.rv_emptyCardsTitle}</div>
        <p className="text-sm text-tone6">
          {countResolvableReviewCards(reviewCards, getWord) === 0
            ? UI.rv_emptyCardsNew
            : UI.rv_emptyCardsLater}
        </p>
        <Link to="/path" className="btn-ghost mt-2 inline-flex">{UI.rv_goLearn}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-tone6">{UI.rv_front}</span>
          {FRONTS.map((front) => (
            <button
              key={front.value}
              type="button"
              onClick={() => setCardFront(front.value)}
              aria-pressed={cardFront === front.value}
              className={`rounded-full px-3 py-1 border ${
                cardFront === front.value
                  ? 'border-accent text-accent bg-accent-soft'
                  : 'border-line text-tone6'
              }`}
            >
              {front.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-tone6">{UI.rv_remainToday(queue.length, totalDue)}</span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped(true)}
        className="card w-full p-8 min-h-[220px] flex flex-col items-center justify-center gap-4 text-center"
      >
        {!flipped ? (
          <>
            {cardFront === 'hanzi' && <div className="hero-han text-5xl text-ink">{word.hanzi}</div>}
            {cardFront === 'jyutping' && <JyutpingText jyutping={word.jyutping} className="text-2xl" />}
            {cardFront === 'audio' && (
              <PlayButton audio={word.audio} label={UI.rv_listen} variant="replay" size={26} />
            )}
            <span className="text-xs text-tone6">{UI.rv_tapFlip}</span>
          </>
        ) : (
          <>
            <div className="hero-han text-5xl text-ink">{word.hanzi}</div>
            <JyutpingText jyutping={word.jyutping} className="text-lg" />
            <div className="text-tone6">{word.mandarin}</div>
            <PlayButton audio={word.audio} variant="replay" />
          </>
        )}
      </button>

      {flipped && preview ? (
        <div className="grid grid-cols-4 gap-2">
          {GRADE_ORDER.map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => onGrade(grade)}
              className={`rounded-2xl border bg-card py-3 flex flex-col items-center gap-1 active:scale-95 ${GRADE_STYLE[grade]}`}
            >
              <span className="font-medium">{GRADE_LABELS[grade]}</span>
              <span className="text-[11px] text-tone6">{formatInterval(preview[grade])}</span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => setFlipped(true)} className="btn-primary w-full">
          {UI.rv_flip}
        </button>
      )}
    </div>
  );
}
