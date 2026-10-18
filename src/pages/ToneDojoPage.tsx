import { Ear, Microphone, Waveform } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { ShadowCompare } from "../components/tones/ShadowCompare";
import { ToneDrill } from "../components/tones/ToneDrill";
import { ToneIntro } from "../components/tones/ToneIntro";
import { useToneStore } from "../stores/toneStore";

type ToneView = "intro" | "drill" | "shadow";

const views = [
  { id: "intro", label: "六聲入門", icon: Waveform },
  { id: "drill", label: "聽聲辨調", icon: Ear },
  { id: "shadow", label: "跟讀比較", icon: Microphone },
] as const;

export function ToneDojoPage() {
  const [view, setView] = useState<ToneView>("intro");
  const hydrate = useToneStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="py-8 md:py-12">
      <header className="max-w-3xl">
        <p className="font-jyutping text-sm font-bold text-ember-dark dark:text-sky-300">tone 1-6</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">聲調道場</h1>

      </header>

      <div className="mt-8 grid grid-cols-3 gap-2 rounded-2xl border border-stone-200 bg-white p-2 dark:border-stone-800 dark:bg-stone-900" role="tablist" aria-label="聲調道場練習">
        {views.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            aria-controls={`tone-panel-${id}`}
            onClick={() => setView(id)}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold transition active:scale-[0.98] sm:flex-row sm:text-sm ${view === id ? "bg-ember text-white" : "text-stone-600 hover:text-ember dark:text-stone-300"}`}
          >
            <Icon size={21} weight="bold" />
            {label}
          </button>
        ))}
      </div>

      <div id={`tone-panel-${view}`} role="tabpanel" className="mt-10 md:mt-14">
        {view === "intro" && <ToneIntro />}
        {view === "drill" && <ToneDrill />}
        {view === "shadow" && <ShadowCompare />}
      </div>
    </div>
  );
}
