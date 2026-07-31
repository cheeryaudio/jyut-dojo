import { Link } from 'react-router-dom';

import { contentVersion } from '../domain/curriculum/registry';
import { UI } from '../lib/ui';

// Injected from package.json at build time — never hand-edited, never stale.
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
const BUILD_STAMP = typeof __BUILD_STAMP__ === 'string' ? __BUILD_STAMP__ : 'dev';

export function About() {
  return (
    <div className="space-y-5">
      <header className="pt-1">
        <Link to="/progress" className="text-sm text-accent">{UI.ab_back}</Link>
        <h1 className="hero-han text-2xl font-bold text-ink mt-2">{UI.ab_title}</h1>
      </header>

      <div className="card p-5 text-center space-y-1">
        <div className="hero-han text-3xl font-bold text-ink">{UI.appName}</div>
        <div className="text-sm text-tone6">{UI.ab_version(APP_VERSION)}</div>
        <div className="text-xs text-tone6">内容版本 {contentVersion} · 构建 {BUILD_STAMP}</div>
        <p className="text-xs text-tone6 pt-2">{UI.ab_tagline}</p>
      </div>

      <div className="card p-5 space-y-4 text-sm text-ink">
        <Row label={UI.ab_techLabel}>
          {UI.ab_techBody}
        </Row>
        <Row label={UI.ab_creditLabel}>
          生词和粤拼参考 <b>words.hk</b> 和 <b>CC-Canto</b> 开放词典（CC BY 授权）的精神整理。语音由 <b>Edge TTS</b> 合成。
        </Row>
        <Row label={UI.ab_contactLabel}>
          {UI.ab_contactBody}
        </Row>
      </div>

      <div className="flex justify-center gap-4 text-sm">
        <Link to="/privacy" className="text-accent">{UI.ab_privacy}</Link>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-medium text-ink mb-1">{label}</h2>
      <p className="text-tone6 leading-relaxed">{children}</p>
    </div>
  );
}
