export type RandomSource = () => number;

export const defaultRandom: RandomSource = Math.random;

/** Return a shuffled copy using Fisher-Yates and the provided random source. */
export function shuffle<T>(items: readonly T[], random: RandomSource = defaultRandom): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const picked = Math.floor(random() * (index + 1));
    [result[index], result[picked]] = [result[picked], result[index]];
  }
  return result;
}

export function randomChoice<T>(items: readonly T[], random: RandomSource = defaultRandom): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(random() * items.length)];
}
