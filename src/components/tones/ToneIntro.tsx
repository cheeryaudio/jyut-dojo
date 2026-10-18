import { SpeakerHigh, WarningCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { toneItems } from "../../data";
import { playStaticAudio } from "../../lib/audio/player";
import { TONE_DEFINITIONS } from "../../lib/tones";
import { ToneContour } from "./ToneContour";

export function ToneIntro() {
  const [failedId, setFailedId] = useState<string | null>(null);
  const minimalPair = toneItems.filter((item) => item.setId === "si").sort((a, b) => a.tone - b.tone);

  const play = async (id: string, path: string) => {
    setFailedId(null);
    try {
      await playStaticAudio(path);
    } catch {
      setFailedId(id);
    }
  };

  return (
    <section aria-labelledby="tone-intro-title">
      <div className="max-w-2xl">
        <h2 id="tone-intro-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">先認住六條線</h2>
        <p className="mt-3 max-w-[54ch] leading-relaxed text-stone-600 dark:text-stone-300">數字唔係音量。第一個數字係起點，第二個係終點；5 最高，1 最低。</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
        {minimalPair.map((item) => {
          const definition = TONE_DEFINITIONS.find((candidate) => candidate.tone === item.tone);
          if (definition === undefined) return null;
          const failed = failedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => void play(item.id, item.audio)}
              className="group rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-ember active:scale-[0.98] dark:border-stone-800 dark:bg-stone-900 md:p-5"
              aria-label={`播放 ${item.hanzi} ${item.jyutping}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-4xl font-semibold sm:text-5xl">{item.hanzi}</span>
                {failed ? <WarningCircle size={22} weight="bold" className="text-red-600" /> : <SpeakerHigh size={22} weight="fill" className="text-stone-400 transition group-hover:text-ember" />}
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <div>
                  <p className="font-jyutping font-bold" style={{ color: definition.color }}>{item.jyutping}</p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{definition.name} {definition.contour}</p>
                </div>
                <span className="text-xs text-stone-400">{item.mandarin}</span>
              </div>
              <ToneContour definition={definition} />
              {failed && <p className="mt-2 text-xs font-bold text-red-700 dark:text-red-300">音訊載入失敗</p>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
