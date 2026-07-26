import { useEffect, useRef, useState } from 'react';
import { TONE_CONTOURS, toneColor } from '../lib/tones';

interface Props {
  tone: number;
  size?: number;
  /** increment to (re)play the travelling-dot animation */
  playKey?: number;
  strokeWidth?: number;
}

const W = 100;
const H = 60;
const X0 = 14;
const X1 = 86;

// map a Chao level 1..5 to a y coordinate (level 5 near the top)
function levelY(level: number): number {
  return H - 6 - ((level - 1) / 4) * (H - 12);
}

/**
 * SVG pitch contour for a single tone. When `playKey` changes, a small dot
 * travels the contour from start to end.
 */
export function ToneContour({ tone, size = 100, playKey = 0, strokeWidth = 4 }: Props) {
  const [start, end] = TONE_CONTOURS[tone] ?? [3, 3];
  const y0 = levelY(start);
  const y1 = levelY(end);
  const color = toneColor(tone);

  const [dot, setDot] = useState<{ x: number; y: number } | null>(null);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (!playKey) return;
    const startTs = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const p = Math.min(1, (now - startTs) / duration);
      setDot({ x: X0 + (X1 - X0) * p, y: y0 + (y1 - y0) * p });
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setTimeout(() => setDot(null), 300);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey]);

  const height = (size * H) / W;
  return (
    <svg width={size} height={height} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`声调 ${tone} 音高走势`}>
      <line x1={X0} y1={H / 2} x2={X1} y2={H / 2} stroke="#E8E2D8" strokeWidth={1} strokeDasharray="3 4" />
      <line
        x1={X0}
        y1={y0}
        x2={X1}
        y2={y1}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <circle cx={X0} cy={y0} r={strokeWidth} fill={color} />
      {dot && <circle cx={dot.x} cy={dot.y} r={7} fill={color} opacity={0.9} />}
    </svg>
  );
}
