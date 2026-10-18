import localforage from "localforage";
import { create } from "zustand";
import { scenarios, sentenceById } from "../data";
import { createReviewCard, scheduleReview } from "../lib/srs/fsrs";
import type { ReviewCard, ReviewMode, ReviewRating } from "../types/domain";
import type { ScenarioProgressMap } from "../types/progress";
import { useActivityStore } from "./activityStore";

const CARDS_KEY = "jyut-dojo:review-cards:v1";
const MODE_KEY = "jyut-dojo:review-mode:v1";

const reviewStorage = localforage.createInstance({
  name: "jyut-dojo",
  storeName: "review",
  description: "Local Jyut Dojo FSRS review queue",
});

interface ReviewState {
  cards: ReviewCard[];
  mode: ReviewMode;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  syncCompletedLessons: (progress: ScenarioProgressMap) => Promise<void>;
  grade: (wordId: string, rating: ReviewRating, now?: Date) => Promise<void>;
  setMode: (mode: ReviewMode) => Promise<void>;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  cards: [],
  mode: "audio",
  hydrated: false,
  hydrate: async () => {
    const [cards, mode] = await Promise.all([
      reviewStorage.getItem<ReviewCard[]>(CARDS_KEY),
      reviewStorage.getItem<ReviewMode>(MODE_KEY),
    ]);
    set({ cards: cards ?? [], mode: mode ?? "audio", hydrated: true });
  },
  syncCompletedLessons: async (progress) => {
    const learnedWordIds = new Set<string>();
    for (const scenario of scenarios) {
      if (progress[scenario.id] === undefined) continue;
      for (const sentenceId of scenario.sentences) {
        const sentence = sentenceById.get(sentenceId);
        sentence?.words.forEach((wordId) => learnedWordIds.add(wordId));
      }
    }
    const existing = new Set(get().cards.map((card) => card.wordId));
    const added = [...learnedWordIds].filter((wordId) => !existing.has(wordId)).map((wordId) => createReviewCard(wordId));
    if (added.length === 0) return;
    const cards = [...get().cards, ...added];
    set({ cards });
    await reviewStorage.setItem(CARDS_KEY, cards);
  },
  grade: async (wordId, rating, now = new Date()) => {
    const cards = get().cards.map((card) => card.wordId === wordId ? scheduleReview(card, rating, now) : card);
    set({ cards });
    await Promise.all([
      reviewStorage.setItem(CARDS_KEY, cards),
      useActivityStore.getState().recordActivity(now),
    ]);
  },
  setMode: async (mode) => {
    set({ mode });
    await reviewStorage.setItem(MODE_KEY, mode);
  },
}));
