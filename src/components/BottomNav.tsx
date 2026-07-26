import { NavLink } from 'react-router-dom';
import { useProgress } from '../stores/progress';
import { isDue } from '../lib/srs';
import { UI } from '../lib/ui';

const TABS = [
  { to: '/', label: UI.nav_home, glyph: '⌂', end: true },
  { to: '/path', label: UI.nav_learn, glyph: '🗺️', end: false },
  { to: '/tones', label: UI.nav_tones, glyph: '🎵', end: false },
  { to: '/review', label: UI.nav_review, glyph: '🔁', end: false },
  { to: '/progress', label: UI.nav_progress, glyph: '📊', end: false },
] as const;

export function BottomNav() {
  const cards = useProgress((s) => s.reviewCards);
  const dueCount = Object.values(cards).filter((c) => isDue(c)).length;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-line safe-bottom">
      <div className="mx-auto max-w-md grid grid-cols-5">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors ${
                isActive ? 'text-accent' : 'text-tone6'
              }`
            }
          >
            <span className="text-lg leading-none">{t.glyph}</span>
            <span className="font-medium">{t.label}</span>
            {t.to === '/review' && dueCount > 0 && (
              <span className="absolute top-1 right-[22%] min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[10px] leading-4 text-center">
                {dueCount > 99 ? '99+' : dueCount}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
