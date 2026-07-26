import { PitchDetector } from 'pitchy';

export interface PitchPoint {
  /** time in seconds */
  t: number;
  /** pitch in semitones relative to the track's own median */
  semitone: number;
}

const HOP = 2048;
const MIN_CLARITY = 0.9;
const MIN_HZ = 60;
const MAX_HZ = 500;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Extract a pitch track (in semitones relative to the track's own median) from
 * an AudioBuffer using pitchy over fixed 2048-sample hops. Low-clarity and
 * out-of-range frames are dropped so only voiced pitch survives.
 */
export function extractPitchTrack(buffer: AudioBuffer): PitchPoint[] {
  const data = buffer.getChannelData(0);
  const rate = buffer.sampleRate;
  const detector = PitchDetector.forFloat32Array(HOP);
  const input = new Float32Array(HOP);

  const raw: { t: number; hz: number }[] = [];
  for (let i = 0; i + HOP <= data.length; i += HOP) {
    input.set(data.subarray(i, i + HOP));
    const [hz, clarity] = detector.findPitch(input, rate);
    if (clarity >= MIN_CLARITY && hz >= MIN_HZ && hz <= MAX_HZ) {
      raw.push({ t: i / rate, hz });
    }
  }
  if (raw.length === 0) return [];

  const med = median(raw.map((p) => p.hz));
  return raw.map((p) => ({ t: p.t, semitone: 12 * Math.log2(p.hz / med) }));
}

/** True when audio recording is actually available (needs https/localhost). */
export function canRecord(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined' &&
    (window.isSecureContext || location.hostname === 'localhost')
  );
}
