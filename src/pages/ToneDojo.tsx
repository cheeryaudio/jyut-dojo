import { Link } from 'react-router-dom';
import { ToneContour } from '../components/ToneContour';
import { ALL_TONES } from '../lib/tones';
import { UI } from '../lib/ui';

const CARDS = [
  { to: '/tones/intro', title: UI.td_introTitle, desc: UI.td_introDesc, glyph: '📖' },
  { to: '/tones/drill', title: UI.td_drillTitle, desc: UI.td_drillDesc, glyph: '🎯' },
  { to: '/tones/compare', title: UI.td_compareTitle, desc: UI.td_compareDesc, glyph: '🎙️' },
];

export function ToneDojo() {
  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="hero-han text-2xl font-bold text-ink">{UI.td_title}</h1>
        <p className="text-sm text-tone6 mt-1">{UI.td_sub}</p>
      </header>

      <div className="card p-4 flex items-end justify-between gap-1">
        {ALL_TONES.map((t) => (
          <div key={t} className="flex flex-col items-center gap-1">
            <ToneContour tone={t} size={44} strokeWidth={3} />
            <span className="text-[11px] text-tone6">{t}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {CARDS.map((c) => (
          <Link key={c.to} to={c.to} className="card p-4 flex items-center gap-4 active:scale-[0.99] transition">
            <div className="text-3xl">{c.glyph}</div>
            <div className="flex-1">
              <div className="hero-han text-lg text-ink">{c.title}</div>
              <div className="text-sm text-tone6 mt-0.5">{c.desc}</div>
            </div>
            <span className="text-tone6">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
