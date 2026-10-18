import type { ToneDefinition } from "../../lib/tones";

interface ToneContourProps {
  definition: ToneDefinition;
}

const yForLevel = (level: number): number => 60 - (level - 1) * 12;

export function ToneContour({ definition }: ToneContourProps) {
  const [start, end] = definition.levels;
  const path = `M 12 ${yForLevel(start)} L 108 ${yForLevel(end)}`;

  return (
    <svg viewBox="0 0 120 72" className="h-20 w-full" role="img" aria-label={`第${definition.tone}聲音高走勢 ${definition.contour}`}>
      {[1, 2, 3, 4, 5].map((level) => (
        <line key={level} x1="12" y1={yForLevel(level)} x2="108" y2={yForLevel(level)} stroke="currentColor" className="text-stone-200 dark:text-stone-700" strokeWidth="1" />
      ))}
      <path d={path} fill="none" stroke={definition.color} strokeWidth="6" strokeLinecap="round" className="tone-contour-path" pathLength="1" />
      <circle cx="12" cy={yForLevel(start)} r="4" fill={definition.color} />
      <circle cx="108" cy={yForLevel(end)} r="4" fill={definition.color} />
    </svg>
  );
}
