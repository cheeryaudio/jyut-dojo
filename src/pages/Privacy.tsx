import { Link } from 'react-router-dom';

import { UI } from '../lib/ui';
export function Privacy() {
  return (
    <div className="space-y-5">
      <header className="pt-1">
        <Link to="/progress" className="text-sm text-accent">{UI.pv_back}</Link>
        <h1 className="hero-han text-2xl font-bold text-ink mt-2">{UI.pv_title}</h1>
      </header>

      <div className="card p-5 space-y-4 text-sm leading-relaxed text-ink">
        <Section title={UI.pv_localTitle}>
          {UI.pv_localBody}
        </Section>
        <Section title={UI.pv_syncTitle}>
          {UI.pv_syncBody}
        </Section>
        <Section title={UI.pv_statsTitle}>
          {UI.pv_statsBody}
        </Section>
        <Section title={UI.pv_adTitle}>
          {UI.pv_adBody}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-medium text-ink mb-1">{title}</h2>
      <p className="text-tone6">{children}</p>
    </div>
  );
}
