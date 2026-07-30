import { useRef, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { getBasicsDeck } from '../lib/data';
import { usePathProgress } from '../hooks/usePathProgress';
import { useProgress } from '../stores/progress';
import { isUnitUnlocked } from '../lib/path';
import { playAudio, toast } from '../lib/audio';
import { track } from '../lib/analytics';
import { JyutpingText } from '../components/JyutpingText';
import { PlayButton } from '../components/PlayButton';
import type { Word } from '../types';

import { UI } from '../lib/ui';
export function BasicsDeck() {
  const { id = '' } = useParams();
  const deck = getBasicsDeck(id);
  const progress = usePathProgress();
  const learned = progress.basicsLearned.includes(id);
  const markBasicsLearned = useProgress((state) => state.markBasicsLearned);
  const [playing, setPlaying] = useState(false);
  const cancelRef = useRef(false);

  if (!deck) {
    return (
      <div className="space-y-3">
        <p className="text-tone6">{UI.bd_notFound}</p>
        <Link to="/path" className="btn-ghost">{UI.sc_backToPath}</Link>
      </div>
    );
  }

  // deep-link guard: a locked basics unit route bounces back to the path
  if (!isUnitUnlocked(progress, 'basics', id)) return <Navigate to="/path" replace />;

  const playAll = async () => {
    if (playing) {
      cancelRef.current = true;
      return;
    }
    setPlaying(true);
    cancelRef.current = false;
    for (const w of deck.words) {
      if (cancelRef.current) break;
      await playAudio(w.audio);
      await new Promise((r) => setTimeout(r, 900));
    }
    setPlaying(false);
  };

  const onLearn = () => {
    markBasicsLearned(id, deck.words.map((w) => w.id));
    track('basics_learned', { deckId: id });
    toast(UI.bd_learnToast);
  };

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <Link to="/path" className="text-sm text-accent">{UI.gr_back}</Link>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{deck.emoji}</span>
            <h1 className="hero-han text-2xl font-bold text-ink">{deck.title}</h1>
          </div>
          <button type="button" onClick={playAll} className="btn-ghost !py-2 text-sm">
            {playing ? UI.bd_stop : UI.bd_playAll}
          </button>
        </div>
        <p className="text-sm text-tone6 mt-2">{UI.bd_sub}</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {deck.words.map((w) => (
          <FlashCard key={w.id} word={w} />
        ))}
      </div>

      <button type="button" onClick={onLearn} className="btn-primary w-full">
        {learned ? UI.bd_learned : UI.bd_learn}
      </button>
    </div>
  );
}

function FlashCard({ word }: { word: Word }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        const next = !flipped;
        setFlipped(next);
        if (next) void playAudio(word.audio);
      }}
      className="card p-4 min-h-[104px] flex flex-col items-center justify-center gap-1 text-center active:scale-[0.99] transition"
    >
      {!flipped ? (
        <span className="hero-han text-3xl text-ink">{word.hanzi}</span>
      ) : (
        <>
          <JyutpingText jyutping={word.jyutping} className="text-base" />
          <span className="text-xs text-tone6">{word.mandarin}</span>
          <PlayButton audio={word.audio} size={16} className="mt-0.5" />
        </>
      )}
    </button>
  );
}
