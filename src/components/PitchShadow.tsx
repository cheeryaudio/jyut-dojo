import { useMemo, useState } from 'react';
import { MicIcon } from './icons';
import { useHoldToRecord } from '../hooks/useHoldToRecord';
import { decodeAudioPath, decodeBlob, toast } from '../lib/audio';
import { canRecord, extractPitchTrack } from '../lib/pitch';
import { dtwScore } from '../lib/pitchScore';
import { UI } from '../lib/ui';

interface Props {
  /** reference audio path (the model sentence/word to shadow) */
  audio: string;
  label?: string;
}

function ScoreRing({ value }: { value: number }) {
  const size = 52;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / 100));
  const color = value >= 75 ? '#3E9E6E' : value >= 50 ? '#C4622D' : '#B8503A';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8E2D8" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold tabular-nums" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

/**
 * Optional "跟读录音（实验）" pitch-shadow control. Records the learner, extracts
 * a pitch track, and shows the 声调相似度 score against a reference audio using
 * the shared pitch pipeline. Renders nothing when recording is unsupported.
 */
export function PitchShadow({ audio, label }: Props) {
  const recordable = useMemo(() => canRecord(), []);
  const [score, setScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const { recording, startRecording, stopRecording, cancelRecording } = useHoldToRecord({
    enabled: recordable,
    onComplete: async (blob) => {
      setBusy(true);
      try {
        const [refBuf, userBuf] = await Promise.all([decodeAudioPath(audio), decodeBlob(blob)]);
        const sc = dtwScore(
          extractPitchTrack(refBuf).map((p) => p.semitone),
          extractPitchTrack(userBuf).map((p) => p.semitone)
        );
        setScore(sc);
      } catch {
        toast(UI.toast_recordFailed);
      } finally {
        setBusy(false);
      }
    },
    onStartError: () => toast(UI.toast_micUnavailable),
  });

  if (!recordable) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onPointerDown={() => void startRecording()}
        onPointerUp={stopRecording}
        onPointerLeave={() => recording && stopRecording()}
        onPointerCancel={cancelRecording}
        disabled={busy}
        className={`btn w-full ${recording ? 'bg-tone1 text-white' : 'btn-outline'} disabled:opacity-50`}
      >
        <MicIcon size={18} />
        {recording ? UI.tc_recording : (label ?? UI.pr_shadow)}
        <span className="ml-1 rounded-full bg-accent-soft text-accent text-[10px] px-1.5 py-0.5">
          {UI.pr_shadowExp}
        </span>
      </button>
      {score !== null && (
        <div className="card p-3 flex items-center gap-3">
          <ScoreRing value={score} />
          <div className="text-xs text-tone6 leading-snug">{UI.tc_simTitle}</div>
        </div>
      )}
    </div>
  );
}
