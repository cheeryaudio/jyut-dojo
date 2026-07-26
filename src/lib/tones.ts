// Fixed 6-tone colour coding — used everywhere a tone appears in the UI.
export const TONE_COLORS: Record<number, string> = {
  1: '#E5484D',
  2: '#E8930C',
  3: '#12A594',
  4: '#3E63DD',
  5: '#8E4EC6',
  6: '#60646C',
};

// Short human labels (pitch value + shape) for each Cantonese tone.
export const TONE_LABELS: Record<number, string> = {
  1: '高平 55',
  2: '高升 25',
  3: '中平 33',
  4: '低降 21',
  5: '低升 23',
  6: '低平 22',
};

// Pitch-contour geometry as [startLevel, endLevel] on a 1..5 scale
// (matching Chao tone-letter numbers). Rendered as an SVG polyline.
export const TONE_CONTOURS: Record<number, [number, number]> = {
  1: [5, 5], // high flat
  2: [2, 5], // rising
  3: [3, 3], // mid flat
  4: [2, 1], // low falling
  5: [2, 3], // low rising
  6: [2, 2], // low flat
};

export const ALL_TONES: readonly number[] = [1, 2, 3, 4, 5, 6];

/** Colour for a tone digit, falling back to ink when out of range. */
export function toneColor(tone: number): string {
  return TONE_COLORS[tone] ?? '#26211C';
}

/** Extract the trailing tone digit (1-6) from a jyutping syllable. */
export function toneOf(syllable: string): number {
  const m = syllable.match(/([1-6])$/);
  return m ? Number(m[1]) : 0;
}
