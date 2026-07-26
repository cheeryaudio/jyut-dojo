/**
 * 聲調相似度（實驗）— an *experimental* pitch-contour similarity score.
 *
 * This is deliberately NOT a pronunciation grade: it only compares the *shape*
 * of two pitch tracks (how the pitch rises/falls over time), ignoring absolute
 * pitch, speaking rate and voiced-frame count. That makes it a fun "did my tone
 * contour follow the model?" signal, nothing more.
 *
 * Pipeline (see `dtwScore`):
 *   1. normalize — express each track in semitones relative to its OWN median
 *      (removes the singer's pitch register so a high and a low voice with the
 *      same contour match), and drop non-finite frames (silence is already
 *      trimmed upstream by the pitch extractor).
 *   2. resample — linearly resample both to a fixed 64 points so tracks of
 *      different length line up and DTW stays cheap/bounded.
 *   3. DTW — dynamic-time-warping distance with a |Δsemitone| local cost, which
 *      tolerates the two reads being at slightly different speeds.
 *   4. score — clamp(100 − K·avgDist), K tuned so identical→100 and a flat read
 *      vs a moving contour lands below 50.
 */

/** Points both tracks are resampled to before comparison. */
export const RESAMPLE_N = 64;
/** Distance→score gain. Tuned so flat-vs-moving < 50, identical = 100. */
export const SCORE_K = 20;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Center a semitone track on its own median; drop non-finite frames. */
export function normalizeTrack(track: number[]): number[] {
  const clean = track.filter((x) => Number.isFinite(x));
  if (clean.length === 0) return [];
  const med = median(clean);
  return clean.map((x) => x - med);
}

/** Linearly resample to exactly `n` points. */
export function resample(track: number[], n: number = RESAMPLE_N): number[] {
  if (track.length === 0) return [];
  if (track.length === 1) return new Array(n).fill(track[0]);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const pos = (i / (n - 1)) * (track.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, track.length - 1);
    const frac = pos - lo;
    out.push(track[lo] * (1 - frac) + track[hi] * frac);
  }
  return out;
}

/** Classic DTW total cost with |a-b| local distance. */
function dtwCost(a: number[], b: number[]): number {
  const n = a.length;
  const m = b.length;
  let prev = new Array(m + 1).fill(Infinity);
  prev[0] = 0;
  for (let i = 1; i <= n; i++) {
    const cur = new Array(m + 1).fill(Infinity);
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(a[i - 1] - b[j - 1]);
      cur[j] = cost + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    }
    prev = cur;
  }
  return prev[m];
}

/**
 * Contour similarity of two semitone pitch tracks, 0–100. Pure & deterministic.
 * Returns 0 when either track has no usable pitch.
 */
export function dtwScore(a: number[], b: number[]): number {
  const na = resample(normalizeTrack(a));
  const nb = resample(normalizeTrack(b));
  if (na.length === 0 || nb.length === 0) return 0;
  const avgDist = dtwCost(na, nb) / RESAMPLE_N;
  const score = 100 - SCORE_K * avgDist;
  return Math.max(0, Math.min(100, Math.round(score)));
}
