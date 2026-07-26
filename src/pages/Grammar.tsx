import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { patterns } from '../lib/patterns';
import { useProgress } from '../stores/progress';
import { track } from '../lib/analytics';
import { JyutpingText } from '../components/JyutpingText';
import { PlayButton } from '../components/PlayButton';
import { UI } from '../lib/ui';
import type { Pattern } from '../types';

export function Grammar() {
  const visitGrammar = useProgress((s) => s.visitGrammar);

  useEffect(() => {
    visitGrammar();
    track('grammar_visit');
  }, [visitGrammar]);

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <Link to="/path" className="text-sm text-accent">{UI.gr_back}</Link>
        <h1 className="hero-han text-2xl font-bold text-ink mt-2">{UI.gr_title}</h1>
        <p className="text-sm text-tone6 mt-1">{UI.gr_sub}</p>
      </header>

      <div className="space-y-4">
        {patterns.map((p) => (
          <PatternCard key={p.id} pattern={p} />
        ))}
      </div>
    </div>
  );
}

export function PatternCard({ pattern }: { pattern: Pattern }) {
  return (
    <section className="card p-4 space-y-3">
      <div>
        <h2 className="hero-han text-lg text-ink">{pattern.title}</h2>
        <div className="mt-1.5 inline-flex items-center rounded-lg bg-accent-soft px-2.5 py-1 font-mono text-sm text-accent">
          {pattern.formula}
        </div>
      </div>
      <p className="text-sm text-ink/80 leading-relaxed">{pattern.point}</p>
      <div className="space-y-2 pt-1">
        {pattern.examples.map((ex, i) => (
          <div key={i} className="rounded-2xl border border-line p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="hero-han text-lg text-ink leading-relaxed">{ex.hanzi}</div>
              <JyutpingText jyutping={ex.jyutping} className="text-xs" />
              <div className="text-xs text-tone6">{ex.mandarin}</div>
            </div>
            <PlayButton audio={ex.audio} size={18} />
          </div>
        ))}
      </div>
    </section>
  );
}
