import { useState } from 'react';
import { countByType, type WrongItem, type WrongType } from '../../lib/wrongbook';
import { UI } from '../../lib/ui';
import { useProgress } from '../../stores/progress';
import { ClozeRedo } from './redo/ClozeRedo';
import { DictationRedo } from './redo/DictationRedo';
import { PinyinRedo } from './redo/PinyinRedo';
import { QuizRedo } from './redo/QuizRedo';
import { ToneRedo } from './redo/ToneRedo';

const WRONG_LABELS: Record<WrongType, string> = {
  quiz: UI.rv_wrongLabelQuiz,
  pinyin: UI.rv_wrongLabelPinyin,
  tonedrill: UI.rv_wrongLabelTone,
  cloze: UI.rv_wrongLabelCloze,
  dictation: UI.rv_wrongLabelDictation,
};
const WRONG_GLYPH: Record<WrongType, string> = {
  quiz: '💬',
  pinyin: '🔤',
  tonedrill: '🎵',
  cloze: '✏️',
  dictation: '📝',
};
const WRONG_ORDER: WrongType[] = ['quiz', 'dictation', 'cloze', 'pinyin', 'tonedrill'];

/** 錯題本 overview: pick a category, then drill it until it retires. */
export function WrongReview() {
  const wrongItems = useProgress((state) => state.wrongItems);
  const [redoType, setRedoType] = useState<WrongType | null>(null);

  const counts = countByType(wrongItems);

  if (redoType) return <WrongRedo type={redoType} onExit={() => setRedoType(null)} />;

  if (wrongItems.length === 0) {
    return (
      <div className="card p-8 text-center space-y-2">
        <div className="text-4xl">🎯</div>
        <div className="font-medium text-ink">{UI.rv_emptyWrongTitle}</div>
        <p className="text-sm text-tone6">{UI.rv_emptyWrongSub}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {WRONG_ORDER.filter((type) => counts[type] > 0).map((type) => (
        <div key={type} className="card p-4 flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">{WRONG_GLYPH[type]}</span>
          <div className="flex-1">
            <div className="font-medium text-ink">{WRONG_LABELS[type]}</div>
            <div className="text-xs text-tone6 mt-0.5">{UI.rv_wrongCount(counts[type])}</div>
          </div>
          <button type="button" onClick={() => setRedoType(type)} className="btn-ghost !py-2 text-sm">
            {UI.rv_redo}
          </button>
        </div>
      ))}
    </div>
  );
}

function WrongRedo({ type, onExit }: { type: WrongType; onExit: () => void }) {
  const wrongItems = useProgress((state) => state.wrongItems);
  const gradeWrongItem = useProgress((state) => state.gradeWrongItem);

  // Snapshot the ids to drill at entry; loop until the store has retired them.
  const [ids] = useState<string[]>(() =>
    wrongItems.filter((item) => item.type === type).map((item) => item.id)
  );
  const [position, setPosition] = useState(0);

  const remaining = ids.filter((id) => wrongItems.some((item) => item.id === id));
  const currentId = remaining[position % Math.max(remaining.length, 1)];
  const item = wrongItems.find((candidate) => candidate.id === currentId);

  if (!item || remaining.length === 0) {
    return (
      <div className="card p-8 text-center space-y-3">
        <div className="text-4xl">🎉</div>
        <div className="font-medium text-ink">{UI.rv_redoDone}</div>
        <button type="button" onClick={onExit} className="btn-primary inline-flex">{UI.rv_back}</button>
      </div>
    );
  }

  const onGrade = (correct: boolean) => {
    gradeWrongItem(item.id, correct);
    setPosition((current) => current + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onExit} className="text-accent">{UI.py_back}</button>
        <span className="text-tone6">{UI.rv_remainCount(remaining.length)}</span>
      </div>
      <RedoQuestion key={item.id + position} item={item} onGrade={onGrade} />
    </div>
  );
}

function RedoQuestion({ item, onGrade }: { item: WrongItem; onGrade: (correct: boolean) => void }) {
  switch (item.payload.kind) {
    case 'quiz':
      return <QuizRedo payload={item.payload} onGrade={onGrade} />;
    case 'pinyin':
      return <PinyinRedo payload={item.payload} onGrade={onGrade} />;
    case 'cloze':
      return <ClozeRedo payload={item.payload} onGrade={onGrade} />;
    case 'dictation':
      return <DictationRedo payload={item.payload} onGrade={onGrade} />;
    case 'tonedrill':
      return <ToneRedo payload={item.payload} onGrade={onGrade} />;
  }
}
