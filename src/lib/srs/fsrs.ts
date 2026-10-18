import type { ReviewCard, ReviewRating } from "../../types/domain";

const DAY_MS = 86_400_000;
const DESIRED_RETENTION = 0.9;
const DECAY = -0.5;
const FACTOR = 19 / 81;
const W = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61] as const;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const gradeFor = (rating: ReviewRating): 1 | 2 | 3 | 4 =>
  rating === "again" ? 1 : rating === "hard" ? 2 : rating === "good" ? 3 : 4;

const initialStability = (grade: 1 | 2 | 3 | 4): number => W[grade - 1] ?? W[0];

const initialDifficulty = (grade: 1 | 2 | 3 | 4): number =>
  clamp(W[4] - Math.exp(W[5] * (grade - 1)) + 1, 1, 10);

export const createReviewCard = (wordId: string, now = new Date()): ReviewCard => ({
  wordId,
  due: now.toISOString(),
  stability: 0,
  difficulty: 5,
  reps: 0,
  lapses: 0,
});

export const retrievability = (elapsedDays: number, stability: number): number => {
  if (stability <= 0) return 0;
  return Math.pow(1 + FACTOR * Math.max(0, elapsedDays) / stability, DECAY);
};

const intervalForStability = (stability: number): number => {
  const interval = stability / FACTOR * (Math.pow(DESIRED_RETENTION, 1 / DECAY) - 1);
  return Math.max(1, Math.round(interval));
};

export const scheduleReview = (
  card: ReviewCard,
  rating: ReviewRating,
  now = new Date(),
): ReviewCard => {
  const grade = gradeFor(rating);
  if (card.reps === 0 || card.lastReview === undefined) {
    const stability = initialStability(grade);
    const dueDelay = rating === "again" ? 10 * 60 * 1000 : intervalForStability(stability) * DAY_MS;
    return {
      ...card,
      due: new Date(now.getTime() + dueDelay).toISOString(),
      stability,
      difficulty: initialDifficulty(grade),
      reps: 1,
      lapses: rating === "again" ? 1 : 0,
      lastReview: now.toISOString(),
    };
  }

  const elapsedDays = Math.max(0, (now.getTime() - new Date(card.lastReview).getTime()) / DAY_MS);
  const recall = retrievability(elapsedDays, card.stability);
  const dampedDifficulty = card.difficulty - W[6] * (grade - 3);
  const difficulty = clamp(W[7] * initialDifficulty(4) + (1 - W[7]) * dampedDifficulty, 1, 10);

  const stability = rating === "again"
    ? Math.max(0.1, W[11] * Math.pow(difficulty, -W[12]) * (Math.pow(card.stability + 1, W[13]) - 1) * Math.exp(W[14] * (1 - recall)))
    : card.stability * (1 + Math.exp(W[8]) * (11 - difficulty) * Math.pow(card.stability, -W[9]) * (Math.exp(W[10] * (1 - recall)) - 1) * (rating === "hard" ? W[15] : 1) * (rating === "easy" ? W[16] : 1));

  const dueDelay = rating === "again" ? 10 * 60 * 1000 : intervalForStability(stability) * DAY_MS;
  return {
    ...card,
    due: new Date(now.getTime() + dueDelay).toISOString(),
    stability,
    difficulty,
    reps: card.reps + 1,
    lapses: card.lapses + (rating === "again" ? 1 : 0),
    lastReview: now.toISOString(),
  };
};
