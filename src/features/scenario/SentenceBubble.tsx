import { useState } from 'react';
import { JyutpingText } from '../../components/JyutpingText';
import { PlayButton } from '../../components/PlayButton';
import type { ReportTarget } from '../../components/ReportSheet';
import { alignHanziJyutping } from '../../lib/align';
import { patternForSentence } from '../../lib/patterns';
import { UI } from '../../lib/ui';
import type { Pattern, Sentence } from '../../types';

interface SentenceBubbleProps {
  sentence: Sentence;
  onCharTap: (char: string, syllable: string, sentence: Sentence) => void;
  onGrammarTap: (pattern: Pattern) => void;
  onReport: (target: ReportTarget) => void;
}

/** One dialogue line: tappable hanzi, jyutping, hidden Mandarin, grammar chip. */
export function SentenceBubble({ sentence, onCharTap, onGrammarTap, onReport }: SentenceBubbleProps) {
  const [showMandarin, setShowMandarin] = useState(false);
  const isSpeakerA = sentence.speaker === 'A';
  const pattern = patternForSentence(sentence.id);

  const syllableByIndex = new Map(
    alignHanziJyutping(sentence.hanzi, sentence.jyutping).map((item) => [item.charIndex, item.syllable])
  );
  const chars = [...sentence.hanzi];

  return (
    <div className={`flex ${isSpeakerA ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[88%] rounded-2xl border p-3.5 ${
          isSpeakerA ? 'bg-card border-line' : 'bg-accent-soft border-accent/20'
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className={`text-[11px] font-medium ${isSpeakerA ? 'text-tone6' : 'text-accent'}`}>
            {isSpeakerA ? 'A' : 'B'}
          </span>
          <div className="flex items-center gap-1.5">
            {pattern && (
              <button
                type="button"
                onClick={() => onGrammarTap(pattern)}
                className="rounded-full bg-accent/10 text-accent text-[10px] px-2 py-0.5 active:scale-95"
              >
                {UI.sc_grammarChip}
              </button>
            )}
            <PlayButton audio={sentence.audio} size={18} />
          </div>
        </div>

        <p className="hero-han text-2xl leading-relaxed">
          {chars.map((char, index) => {
            const syllable = syllableByIndex.get(index);
            if (!syllable) return <span key={index}>{char}</span>;
            return (
              <button
                key={index}
                type="button"
                onClick={() => onCharTap(char, syllable, sentence)}
                className="rounded-md px-[1px] active:bg-accent/10"
                style={{ textUnderlineOffset: 4 }}
              >
                <span className="border-b border-dashed border-ink/20">{char}</span>
              </button>
            );
          })}
        </p>

        <div className="mt-1.5">
          <JyutpingText jyutping={sentence.jyutping} className="text-sm" />
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowMandarin((shown) => !shown)}
            className="inline-flex items-center gap-1.5 text-xs text-tone6"
          >
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-line text-ink font-medium">
              普
            </span>
            {showMandarin ? sentence.mandarin : UI.sc_seeMandarin}
          </button>
          <button
            type="button"
            onClick={() => onReport({ refType: 'sentence', refId: sentence.id })}
            className="text-[11px] text-tone6/70 underline underline-offset-2 shrink-0"
          >
            {UI.sc_report}
          </button>
        </div>
      </div>
    </div>
  );
}
