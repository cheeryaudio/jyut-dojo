import { PitchDetector } from "pitchy";

export interface PitchPoint {
  time: number;
  value: number;
  hz: number;
}

export interface PitchTrack {
  points: PitchPoint[];
  minHz: number;
  maxHz: number;
}

export interface RawPitchPoint {
  time: number;
  hz: number;
}

const FRAME_SIZE = 2048;
const HOP_SIZE = 512;

const quantile = (values: number[], ratio: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index] ?? 0;
};

const smooth = (values: number[]): number[] => values.map((_, index) => {
  const start = Math.max(0, index - 2);
  const end = Math.min(values.length, index + 3);
  const window = values.slice(start, end).sort((a, b) => a - b);
  return window[Math.floor(window.length / 2)] ?? values[index] ?? 0;
});

export const postProcessPitchFrames = (raw: RawPitchPoint[]): PitchTrack => {
  if (raw.length < 4) throw new Error("偵測唔到清楚人聲，請靠近咪高峰再試");

  const smoothedHz = smooth(raw.map((point) => point.hz));
  const logPitches = smoothedHz.map((hz) => 12 * Math.log2(hz));
  const low = quantile(logPitches, 0.1);
  const high = quantile(logPitches, 0.9);
  const range = high - low;
  const startTime = raw[0]?.time ?? 0;
  const endTime = raw.at(-1)?.time ?? startTime + 1;
  const duration = Math.max(0.01, endTime - startTime);

  return {
    points: raw.map((point, index) => ({
      time: (point.time - startTime) / duration,
      value: range < 0.5 ? 0.5 : Math.min(1, Math.max(0, ((logPitches[index] ?? low) - low) / range)),
      hz: smoothedHz[index] ?? point.hz,
    })),
    minHz: Math.min(...smoothedHz),
    maxHz: Math.max(...smoothedHz),
  };
};

export const extractPitchTrack = (samples: Float32Array, sampleRate: number): PitchTrack => {
  if (samples.length < FRAME_SIZE) throw new Error("錄音太短，未能分析聲調");

  const detector = PitchDetector.forFloat32Array(FRAME_SIZE);
  detector.clarityThreshold = 0.82;
  detector.minVolumeDecibels = -38;

  const raw: RawPitchPoint[] = [];
  for (let start = 0; start + FRAME_SIZE <= samples.length; start += HOP_SIZE) {
    const frame = samples.subarray(start, start + FRAME_SIZE);
    const [pitch, clarity] = detector.findPitch(frame, sampleRate);
    if (clarity >= 0.82 && pitch >= 70 && pitch <= 500) {
      raw.push({ time: start / sampleRate, hz: pitch });
    }
  }

  return postProcessPitchFrames(raw);
};

export const decodePitchTrack = async (source: string | Blob): Promise<PitchTrack> => {
  const arrayBuffer = typeof source === "string"
    ? await fetch(source).then(async (response) => {
        if (!response.ok) throw new Error("參考音訊載入失敗");
        return response.arrayBuffer();
      })
    : await source.arrayBuffer();

  const context = new AudioContext();
  try {
    const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
    return extractPitchTrack(audioBuffer.getChannelData(0), audioBuffer.sampleRate);
  } finally {
    await context.close();
  }
};
