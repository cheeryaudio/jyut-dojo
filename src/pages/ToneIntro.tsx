import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ToneContour } from '../components/ToneContour';
import { JyutpingText } from '../components/JyutpingText';
import { ALL_TONES, TONE_LABELS, toneColor } from '../lib/tones';
import { tonesets } from '../lib/data';
import { playAudio } from '../lib/audio';
import { useProgress } from '../stores/progress';

import { UI } from '../lib/ui';
const DESCRIPTIONS: Record<number, string> = {
  1: '最高、平直，像唱歌拉长的高音。',
  2: '从中间升到高，像普通话问句的升调。',
  3: '中间平直，不升不降。',
  4: '低而且再往下沉，声音压到最低。',
  5: '从低慢慢升起，幅度没有二声那么大。',
  6: '低而平，停在低音位置。',
};

export function ToneIntro() {
  const [play, setPlay] = useState<Record<number, number>>({});
  const siSet = tonesets.find((t) => t.syllable === 'si') ?? tonesets[0];
  const visitTonesIntro = useProgress((s) => s.visitTonesIntro);

  useEffect(() => {
    visitTonesIntro();
  }, [visitTonesIntro]);

  const triggerTone = (tone: number, audio: string) => {
    setPlay((p) => ({ ...p, [tone]: (p[tone] ?? 0) + 1 }));
    void playAudio(audio);
  };

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <Link to="/tones" className="text-sm text-accent">{UI.ti_back}</Link>
        <h1 className="hero-han text-2xl font-bold text-ink mt-2">{UI.ti_title}</h1>
        <p className="text-sm text-tone6 mt-1">{UI.ti_sub}</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {ALL_TONES.map((tone) => {
          const item = siSet.items.find((i) => i.tone === tone);
          return (
            <button
              key={tone}
              type="button"
              onClick={() => item && triggerTone(tone, item.audio)}
              className="card p-3.5 text-left active:scale-[0.99] transition"
              style={{ borderColor: `${toneColor(tone)}44` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: toneColor(tone) }}>
                  {UI.ti_toneN(tone)}
                </span>
                <span className="text-xs text-tone6">{TONE_LABELS[tone]}</span>
              </div>
              <ToneContour tone={tone} size={130} playKey={play[tone] ?? 0} />
              {item && (
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="hero-han text-2xl" style={{ color: toneColor(tone) }}>{item.hanzi}</span>
                  <JyutpingText jyutping={item.jyutping} className="text-xs" />
                </div>
              )}
              <p className="text-xs text-tone6 mt-1.5 leading-relaxed">{DESCRIPTIONS[tone]}</p>
            </button>
          );
        })}
      </div>

      <section className="card p-4">
        <h2 className="text-sm font-medium text-ink mb-1">{UI.ti_minimalTitle(siSet.syllable)}</h2>
        <p className="text-xs text-tone6 mb-3">{UI.ti_minimalSub(siSet.syllable)}</p>
        <div className="flex flex-wrap gap-2">
          {siSet.items.map((item) => (
            <button
              key={item.tone}
              type="button"
              onClick={() => triggerTone(item.tone, item.audio)}
              className="flex flex-col items-center rounded-2xl border px-3 py-2 active:scale-95"
              style={{ borderColor: `${toneColor(item.tone)}55` }}
            >
              <span className="hero-han text-2xl" style={{ color: toneColor(item.tone) }}>{item.hanzi}</span>
              <span className="font-mono text-[11px] mt-0.5" style={{ color: toneColor(item.tone) }}>{item.jyutping}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-4 bg-accent-soft/40">
        <h2 className="text-sm font-medium text-ink mb-2">普通话母语者难点</h2>
        <ul className="text-sm text-ink/80 space-y-2 leading-relaxed list-disc pl-4">
          <li>
            <b>二声 vs 五声</b>：两个都是「升调」，但第 2 声升得又高又明显（25），第 5 声只是从低微微上扬（23）。
            普通话只有一个阳平升调，所以耳朵容易把两者听成同一个。
          </li>
          <li>
            <b>三声 vs 六声</b>：都是「平调」，差别只在音高——第 3 声在中间（33），第 6 声在低位（22）。
            普通话没有单纯靠音高高低区分意义的平调，需要专门练习分辨绝对高度。
          </li>
        </ul>
      </section>
    </div>
  );
}
