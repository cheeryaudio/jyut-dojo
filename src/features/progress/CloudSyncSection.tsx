import { useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { toast } from '../../lib/audio';
import {
  applyRestore,
  createSyncCode,
  fetchRemote,
  isValidCode,
  pushState,
  type RemoteState,
} from '../../lib/sync';
import { UI } from '../../lib/ui';
import { useProgress } from '../../stores/progress';

function formatSyncTime(timestamp: number): string {
  if (!timestamp) return UI.pg_syncNever;
  const elapsed = Date.now() - timestamp;
  if (elapsed < 60_000) return UI.pg_syncJustNow;
  if (elapsed < 3_600_000) return UI.pg_syncMinAgo(Math.floor(elapsed / 60_000));
  if (elapsed < 86_400_000) return UI.pg_syncHrAgo(Math.floor(elapsed / 3_600_000));
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

/** 雲端同步: generate a code, push manually, or restore another device's state. */
export function CloudSyncSection() {
  const syncCode = useProgress((state) => state.settings.syncCode);
  const lastSyncAt = useProgress((state) => state.settings.lastSyncAt);

  const [busy, setBusy] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<{ code: string; remote: RemoteState } | null>(null);

  const onGenerate = async () => {
    setBusy(true);
    try {
      const { pushed } = await createSyncCode();
      toast(pushed ? UI.pg_syncGenerated : UI.pg_syncGeneratedQueued);
    } catch {
      toast(UI.pg_syncGenFail);
    } finally {
      setBusy(false);
    }
  };

  const onManual = async () => {
    setBusy(true);
    try {
      await pushState();
      toast(UI.pg_syncDone);
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(syncCode);
      toast(UI.pg_syncCopied);
    } catch {
      // Clipboard is blocked in some webviews; show the code so it can be copied by hand.
      toast(syncCode);
    }
  };

  const onLookup = async () => {
    const code = input.trim().toUpperCase();
    if (!isValidCode(code)) {
      toast(UI.pg_syncBadCode);
      return;
    }
    setBusy(true);
    try {
      const remote = await fetchRemote(code);
      if (!remote) {
        toast(UI.pg_syncNotFound);
        return;
      }
      setPending({ code, remote });
    } catch {
      toast(UI.pg_syncConnFail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_syncTitle}</h2>
      <div className="card p-4 space-y-4">
        {syncCode ? (
          <>
            <div>
              <div className="text-xs text-tone6 mb-1" id="sync-code-label">{UI.pg_syncYourCode}</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-2xl tracking-[0.2em] text-ink select-all">
                  {syncCode}
                </code>
                <button type="button" onClick={onCopy} className="btn-ghost !py-2 text-sm">
                  {UI.pg_syncCopy}
                </button>
              </div>
              <p className="text-[11px] text-tone6 mt-2 leading-snug">{UI.pg_syncCodeHint}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-tone6">
              <span>{UI.pg_syncLast(formatSyncTime(lastSyncAt))}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onManual()}
                className="btn-outline !py-1.5 text-sm disabled:opacity-40"
              >
                {UI.pg_syncManual}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-tone6">{UI.pg_syncBlurb}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onGenerate()}
              className="btn-primary w-full disabled:opacity-50"
            >
              {UI.pg_syncGenerate}
            </button>
          </>
        )}

        {showInput ? (
          <div className="space-y-2 border-t border-line pt-3">
            <label className="text-xs text-tone6 block" htmlFor="sync-code-input">
              {UI.pg_syncEnterHint}
            </label>
            <div className="flex gap-2">
              <input
                id="sync-code-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="例如 A1B2C3D4E5"
                maxLength={16}
                autoCapitalize="characters"
                className="flex-1 rounded-2xl border border-line bg-card px-4 py-2.5 font-mono uppercase tracking-widest text-ink outline-none focus:border-accent"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void onLookup()}
                className="btn-primary !px-4 disabled:opacity-50"
              >
                {UI.pg_syncFetch}
              </button>
            </div>
            <button type="button" onClick={() => setShowInput(false)} className="text-xs text-tone6">
              {UI.pg_syncCollapse}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowInput(true)} className="text-sm text-accent">
            {UI.pg_syncHave}
          </button>
        )}
      </div>

      <BottomSheet
        open={pending !== null}
        onClose={() => setPending(null)}
        title={UI.pg_syncOverwriteTitle}
      >
        {pending && (
          <div className="space-y-4">
            <p className="text-sm text-tone6">
              {UI.pg_syncFoundCode(
                pending.code,
                new Date(pending.remote.updatedAt).toLocaleString('zh-CN')
              )}
            </p>
            <p className="text-sm text-tone1">{UI.pg_syncOverwriteWarn}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPending(null)} className="btn-outline flex-1">
                {UI.pg_syncCancel}
              </button>
              <button
                type="button"
                // applyRestore reloads the page on success.
                onClick={() => void applyRestore(pending.code, pending.remote)}
                className="btn-primary flex-1"
              >
                {UI.pg_syncConfirmRestore}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </section>
  );
}
