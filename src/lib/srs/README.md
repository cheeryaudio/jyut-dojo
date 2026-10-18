# FSRS implementation

`fsrs.ts` implements the FSRS memory model directly: stability, difficulty, retrievability, lapse handling, desired retention and rating-dependent updates. Keeping the equations local makes the scheduler deterministic, testable and independent of a backend.

The stored public card shape remains the milestone contract: `wordId`, `due`, `stability`, `difficulty`, `reps`, and `lapses`. `lastReview` is persisted as the minimum additional input needed to compute elapsed time and retrievability.
