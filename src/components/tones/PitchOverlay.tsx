import { useEffect, useRef } from "react";
import type { PitchTrack } from "../../lib/pitch/extractPitch";

interface PitchOverlayProps {
  reference: PitchTrack;
  user: PitchTrack;
}

export function PitchOverlay({ reference, user }: PitchOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const draw = () => {
      const context = canvas.getContext("2d");
      if (context === null) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      context.strokeStyle = "rgba(120, 113, 108, 0.22)";
      context.lineWidth = 1;
      for (const position of [0.25, 0.5, 0.75]) {
        context.beginPath();
        context.moveTo(16, height * position);
        context.lineTo(width - 16, height * position);
        context.stroke();
      }

      const drawTrack = (track: PitchTrack, color: string, widthValue: number) => {
        context.strokeStyle = color;
        context.lineWidth = widthValue;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.beginPath();
        track.points.forEach((point, index) => {
          const x = 16 + point.time * (width - 32);
          const y = 16 + (1 - point.value) * (height - 32);
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.stroke();
      };

      drawTrack(reference, "#a8a29e", 4);
      drawTrack(user, "#2563eb", 3);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [reference, user]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-sm font-bold">
        <span className="text-stone-500 dark:text-stone-300">灰色：參考</span>
        <span className="text-blue-700 dark:text-blue-300">藍色：你嘅錄音</span>
      </div>
      <canvas
        ref={canvasRef}
        className="h-56 w-full rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
        role="img"
        aria-label="參考音高同你嘅音高疊加曲線"
      />
      <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">兩條線已按各自音域正規化，淨係比較升、降同平直走勢，唔會計分。</p>
    </div>
  );
}
