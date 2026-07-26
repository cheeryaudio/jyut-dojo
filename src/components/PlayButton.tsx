import { playAudio } from '../lib/audio';
import { PlayIcon, ReplayIcon } from './icons';

interface Props {
  audio: string;
  label?: string;
  variant?: 'play' | 'replay';
  size?: number;
  className?: string;
}

/** Circular audio-play button. Safe when the mp3 is missing (see audio.ts). */
export function PlayButton({ audio, label, variant = 'play', size = 20, className }: Props) {
  return (
    <button
      type="button"
      aria-label={label ?? '播放'}
      onClick={(e) => {
        e.stopPropagation();
        void playAudio(audio);
      }}
      className={`btn-ghost !p-2.5 !rounded-full ${className ?? ''}`}
    >
      {variant === 'replay' ? <ReplayIcon size={size} /> : <PlayIcon size={size} />}
      {label && <span className="text-sm pr-1">{label}</span>}
    </button>
  );
}
