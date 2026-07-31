import { BottomSheet } from '../../components/BottomSheet';
import { JyutpingText } from '../../components/JyutpingText';
import { PlayButton } from '../../components/PlayButton';
import { toneColor, toneOf } from '../../lib/tones';
import { UI } from '../../lib/ui';
import type { Pattern, Word } from '../../types';

export interface CharSelection {
  char: string;
  syllable: string;
  word: Word | undefined;
}

/** Tap-a-character sheet: tone colour, the syllable, and the vocab card behind it. */
export function VocabSheet({
  selection,
  onClose,
  onReportWord,
}: {
  selection: CharSelection | null;
  onClose: () => void;
  onReportWord: (wordId: string) => void;
}) {
  return (
    <BottomSheet open={selection !== null} onClose={onClose} title={UI.vocab_title}>
      {selection && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="hero-han text-5xl"
              style={{ color: toneColor(toneOf(selection.syllable)) }}
            >
              {selection.char}
            </div>
            <div>
              <JyutpingText jyutping={selection.syllable} className="text-lg" />
              <div className="text-xs text-tone6 mt-1">{UI.vocab_tone(toneOf(selection.syllable))}</div>
            </div>
          </div>
          {selection.word ? (
            <>
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="hero-han text-2xl text-ink">{selection.word.hanzi}</div>
                    <JyutpingText jyutping={selection.word.jyutping} className="text-sm" />
                    <div className="text-sm text-tone6 mt-1">{selection.word.mandarin}</div>
                  </div>
                  <PlayButton audio={selection.word.audio} label={UI.vocab_word} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => selection.word && onReportWord(selection.word.id)}
                className="text-xs text-tone6 underline underline-offset-2"
              >
                {UI.sc_report}
              </button>
            </>
          ) : (
            <p className="text-sm text-tone6">{UI.vocab_none}</p>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

/** 句型 sheet for the grammar chip on a dialogue line. */
export function GrammarSheet({ pattern, onClose }: { pattern: Pattern | null; onClose: () => void }) {
  return (
    <BottomSheet open={pattern !== null} onClose={onClose} title={UI.sc_grammarChip}>
      {pattern && (
        <div className="space-y-3">
          <div>
            <h3 className="hero-han text-lg text-ink">{pattern.title}</h3>
            <div className="mt-1.5 inline-flex items-center rounded-lg bg-accent-soft px-2.5 py-1 font-mono text-sm text-accent">
              {pattern.formula}
            </div>
          </div>
          <p className="text-sm text-ink/80 leading-relaxed">{pattern.point}</p>
          <div className="space-y-2">
            {pattern.examples.map((example) => (
              <div
                key={`${example.hanzi}-${example.audio}`}
                className="rounded-2xl border border-line p-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="hero-han text-base text-ink leading-relaxed">{example.hanzi}</div>
                  <JyutpingText jyutping={example.jyutping} className="text-xs" />
                  <div className="text-xs text-tone6">{example.mandarin}</div>
                </div>
                <PlayButton audio={example.audio} size={18} />
              </div>
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
