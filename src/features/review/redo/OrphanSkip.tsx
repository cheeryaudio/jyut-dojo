import { UI } from '../../../lib/ui';

/** Fallback when a wrong item references content we can no longer resolve — let it clear. */
export function OrphanSkip({ onGrade }: { onGrade: (correct: boolean) => void }) {
  return (
    <div className="card p-6 text-center space-y-3">
      <p className="text-sm text-tone6">{UI.rv_orphan}</p>
      <button type="button" onClick={() => onGrade(true)} className="btn-ghost inline-flex">
        {UI.rv_orphanSkip}
      </button>
    </div>
  );
}
