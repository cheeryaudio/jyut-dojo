import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getWord } from '../lib/data';
import { useProgress } from '../stores/progress';
import { playAudio } from '../lib/audio';
import { track } from '../lib/analytics';
import { JyutpingText } from '../components/JyutpingText';
import { PlayButton } from '../components/PlayButton';
import { PitchShadow } from '../components/PitchShadow';
import { UI } from '../lib/ui';
import type { Word } from '../types';

const FIRST_WORDS = ['nei5hou2', 'm4goi1', 'zou2san4'];

export function FirstWin() {
  const navigate = useNavigate();
  const completeFirstWin = useProgress((s) => s.completeFirstWin);
  const [done, setDone] = useState(false);

  const words = FIRST_WORDS.map((id) => getWord(id)).filter((w): w is Word => Boolean(w));

  const finish = () => {
    completeFirstWin();
    track('first_win_done');
    setDone(true);
  };

  if (done) {
    return (
      <div className="space-y-6 pt-10 text-center">
        <div className="text-6xl">🎉</div>
        <div>
          <h1 className="hero-han text-2xl font-bold text-ink">{UI.fw_doneTitle}</h1>
          <p className="text-sm text-tone6 mt-2 px-4">{UI.fw_doneSub}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {words.map((w) => (
            <span key={w.id} className="rounded-2xl bg-accent-soft px-3 py-2">
              <span className="hero-han text-lg text-accent">{w.hanzi}</span>
            </span>
          ))}
        </div>
        <button type="button" onClick={() => navigate('/path')} className="btn-primary w-full">
          {UI.fw_cta}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <Link to="/" className="text-sm text-accent">{UI.fw_back}</Link>
        <p className="text-xs text-accent mt-2">{UI.fw_kicker}</p>
        <h1 className="hero-han text-2xl font-bold text-ink mt-1">{UI.fw_title}</h1>
        <p className="text-sm text-tone6 mt-1">{UI.fw_sub}</p>
      </header>

      <div className="space-y-3">
        {words.map((w) => (
          <WordCard key={w.id} word={w} />
        ))}
      </div>

      <button type="button" onClick={finish} className="btn-primary w-full">
        {UI.fw_gotIt}
      </button>
      <button type="button" onClick={() => navigate('/path')} className="btn-ghost w-full">
        {UI.fw_skip}
      </button>
    </div>
  );
}

function WordCard({ word }: { word: Word }) {
  return (
    <div className="card p-4 space-y-3">
      <button
        type="button"
        onClick={() => void playAudio(word.audio)}
        className="w-full flex items-center gap-4 text-left active:scale-[0.99] transition"
      >
        <span className="hero-han text-4xl text-ink">{word.hanzi}</span>
        <span className="flex-1 min-w-0">
          <JyutpingText jyutping={word.jyutping} className="text-base" />
          <span className="block text-sm text-tone6 mt-0.5">{word.mandarin}</span>
        </span>
        <PlayButton audio={word.audio} variant="replay" size={22} />
      </button>
      <PitchShadow audio={word.audio} label={UI.fw_shadow} />
    </div>
  );
}
