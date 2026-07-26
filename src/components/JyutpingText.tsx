import { toneColor, toneOf } from '../lib/tones';

interface Props {
  jyutping: string;
  className?: string;
}

/** Renders jyutping with each syllable coloured by its tone digit. */
export function JyutpingText({ jyutping, className }: Props) {
  const syllables = jyutping.trim().split(/\s+/).filter(Boolean);
  return (
    <span className={`font-mono ${className ?? ''}`}>
      {syllables.map((syl, i) => (
        <span key={`${syl}-${i}`} style={{ color: toneColor(toneOf(syl)) }}>
          {syl}
          {i < syllables.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}
