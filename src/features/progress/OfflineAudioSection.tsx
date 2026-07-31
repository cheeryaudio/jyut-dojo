import { useEffect, useRef, useState } from 'react';
import { buildAudioPacks } from '../../domain/curriculum/audioAssets';
import { curriculum } from '../../lib/data';
import {
  downloadPack,
  isPackCached,
  offlineAudioSupported,
  type PackDownloadResult,
} from '../../lib/audioPack';
import { toast } from '../../lib/audio';
import { UI } from '../../lib/ui';

const PACKS = buildAudioPacks(curriculum);

type PackState =
  | { kind: 'idle' }
  | { kind: 'cached' }
  // Downloaded, but the service worker was not controlling this page yet, so
  // the files landed in the HTTP cache instead of the offline audio cache.
  | { kind: 'pending' }
  | { kind: 'downloading'; done: number; total: number };

/** 離線音頻: download one stage's audio so it plays without a network. */
export function OfflineAudioSection() {
  const [states, setStates] = useState<Record<string, PackState>>({});
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        PACKS.map(async (pack) => [pack.stageId, (await isPackCached(pack.paths)) ? 'cached' : 'idle'] as const)
      );
      if (cancelled) return;
      setStates((current) => {
        const next = { ...current };
        for (const [stageId, kind] of entries) {
          // Never clobber a download that started while the probe was running.
          if (next[stageId]?.kind === 'downloading') continue;
          next[stageId] = kind === 'cached' ? { kind: 'cached' } : { kind: 'idle' };
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  if (!offlineAudioSupported()) return null;

  const start = async (stageId: string, paths: string[]) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStates((current) => ({ ...current, [stageId]: { kind: 'downloading', done: 0, total: paths.length } }));

    let result: PackDownloadResult;
    try {
      result = await downloadPack(
        paths,
        (done, total) =>
          setStates((current) => ({ ...current, [stageId]: { kind: 'downloading', done, total } })),
        controller.signal
      );
    } catch {
      setStates((current) => ({ ...current, [stageId]: { kind: 'idle' } }));
      toast(UI.pg_offlineFailed);
      return;
    }

    if (controller.signal.aborted) return;
    // A few misses are normal (the male set is smaller); only a total miss is a failure.
    if (result.ok === 0) {
      setStates((current) => ({ ...current, [stageId]: { kind: 'idle' } }));
      toast(UI.pg_offlineFailed);
      return;
    }

    // Only claim "offline ready" if the files really are in the offline cache.
    // On a first visit the service worker may not control this page yet.
    const cached = await isPackCached(paths);
    setStates((current) => ({ ...current, [stageId]: { kind: cached ? 'cached' : 'pending' } }));
    toast(cached ? UI.pg_offlineDone : UI.pg_offlinePending);
  };

  return (
    <section>
      <h2 className="text-sm font-medium text-tone6 mb-2 px-1">{UI.pg_offlineTitle}</h2>
      <div className="card divide-y divide-line">
        <p className="px-4 py-3 text-xs text-tone6">{UI.pg_offlineHint}</p>
        {PACKS.map((pack) => {
          const state = states[pack.stageId] ?? { kind: 'idle' };
          return (
            <div key={pack.stageId} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink truncate">{pack.title}</div>
                <div className="text-xs text-tone6 mt-0.5">
                  {state.kind === 'downloading'
                    ? UI.pg_offlineProgress(state.done, state.total)
                    : UI.pg_offlineCount(pack.paths.length)}
                </div>
              </div>
              {state.kind === 'cached' ? (
                <span className="text-sm text-tone3">{UI.pg_offlineReady}</span>
              ) : state.kind === 'pending' ? (
                <span className="text-sm text-tone2">{UI.pg_offlineRestart}</span>
              ) : (
                <button
                  type="button"
                  disabled={state.kind === 'downloading'}
                  onClick={() => void start(pack.stageId, pack.paths)}
                  className="btn-outline !py-1.5 text-sm disabled:opacity-40"
                >
                  {state.kind === 'downloading' ? UI.pg_offlineDownloading : UI.pg_offlineDownload}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
