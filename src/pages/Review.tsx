import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProgress, type CardFront } from '../stores/progress';
import { getWord, getSentence, scenarioSentences, scenarioVocab, pinyinItems, tonesets } from '../lib/data';
import { isDue, previewIntervals, formatInterval, GRADE_LABELS, type Grade } from '../lib/srs';
import { countByType, type WrongItem, type WrongType } from '../lib/wrongbook';
import { blankOut } from '../lib/cloze';
import { gradeDictation, isPass, toSyllables } from '../lib/dictation';
import { ALL_TONES, TONE_LABELS, toneColor } from '../lib/tones';
import { playAudio } from '../lib/audio';
import { track } from '../lib/analytics';
import { UI } from '../lib/ui';
import { JyutpingText } from '../components/JyutpingText';
import { PlayButton } from '../components/PlayButton';
import { CheckIcon } from '../components/icons';
import { ToneContour } from '../components/ToneContour';
import type { Sentence, Word } from '../types';

type Segment = 'cards' | 'wrong';

const WRONG_LABELS: Record<WrongType, string> = {
  quiz: UI.rv_wrongLabelQuiz,
  pinyin: UI.rv_wrongLabelPinyin,
  tonedrill: UI.rv_wrongLabelTone,
  cloze: UI.rv_wrongLabelCloze,
  dictation: UI.rv_wrongLabelDictation,
};
const WRONG_GLYPH: Record<WrongType, string> = { quiz: '💬', pinyin: '🔤', tonedrill: '🎵', cloze: '✏️', dictation: '📝' };
const WRONG_ORDER: WrongType[] = ['quiz', 'dictation', 'cloze', 'pinyin', 'tonedrill'];

export function Review() {
  const reviewCards = useProgress((s) => s.reviewCards);
  const wrongItems = useProgress((s) => s.wrongItems);
  const [seg, setSeg] = useState<Segment>('cards');

  const dueCount = Object.values(reviewCards).filter((c) => isDue(c)).length;
  const wrongCount = wrongItems.length;

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="hero-han text-2xl font-bold text-ink">{UI.rv_title}</h1>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-line/50 p-1">
        <SegBtn active={seg === 'cards'} onClick={() => setSeg('cards')} label={UI.rv_segCards} badge={dueCount} />
        <SegBtn active={seg === 'wrong'} onClick={() => setSeg('wrong')} label={UI.rv_segWrong} badge={wrongCount} />
      </div>

      {seg === 'cards' ? <CardReview /> : <WrongReview />}
    </div>
  );
}

function SegBtn({ active, onClick, label, badge }: { active: boolean; onClick: () => void; label: string; badge: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl py-2 text-sm font-medium transition ${active ? 'bg-card text-accent shadow-card' : 'text-tone6'}`}
    >
      {label}
      {badge > 0 && (
        <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] align-middle">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

/* ---------------- SRS cards (existing flow) ---------------- */

const FRONTS: { value: CardFront; label: string }[] = [
  { value: 'hanzi', label: UI.rv_frontHanzi },
  { value: 'jyutping', label: UI.rv_frontJyutping },
  { value: 'audio', label: UI.rv_frontAudio },
];
const GRADE_ORDER: Grade[] = ['again', 'hard', 'good', 'easy'];
const GRADE_STYLE: Record<Grade, string> = {
  again: 'border-tone1 text-tone1',
  hard: 'border-tone2 text-tone2',
  good: 'border-tone3 text-tone3',
  easy: 'border-tone4 text-tone4',
};

function CardReview() {
  const reviewCards = useProgress((s) => s.reviewCards);
  const cardFront = useProgress((s) => s.settings.cardFront);
  const setCardFront = useProgress((s) => s.setCardFront);
  const gradeReview = useProgress((s) => s.gradeReview);

  const [queue, setQueue] = useState<string[]>(() =>
    Object.values(reviewCards)
      .filter((c) => isDue(c))
      .sort((a, b) => a.due.localeCompare(b.due))
      .map((c) => c.wordId)
  );
  const [flipped, setFlipped] = useState(false);

  const currentId = queue[0];
  const card = currentId ? reviewCards[currentId] : undefined;
  const word = currentId ? getWord(currentId) : undefined;
  const preview = useMemo(() => (card ? previewIntervals(card) : null), [card]);

  useEffect(() => {
    if (flipped && word) void playAudio(word.audio);
  }, [flipped, word]);

  const totalDue = Object.values(reviewCards).filter((c) => isDue(c)).length;

  const onGrade = (grade: Grade) => {
    if (!currentId) return;
    gradeReview(currentId, grade);
    track('review_grade', { grade });
    setFlipped(false);
    setQueue((q) => (grade === 'again' ? [...q.slice(1), currentId] : q.slice(1)));
  };

  if (!card || !word) {
    return (
      <div className="card p-8 text-center space-y-2">
        <div className="text-4xl">✅</div>
        <div className="font-medium text-ink">{UI.rv_emptyCardsTitle}</div>
        <p className="text-sm text-tone6">
          {Object.keys(reviewCards).length === 0 ? UI.rv_emptyCardsNew : UI.rv_emptyCardsLater}
        </p>
        <Link to="/path" className="btn-ghost mt-2 inline-flex">{UI.rv_goLearn}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-tone6">{UI.rv_front}</span>
          {FRONTS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setCardFront(f.value)}
              className={`rounded-full px-3 py-1 border ${cardFront === f.value ? 'border-accent text-accent bg-accent-soft' : 'border-line text-tone6'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-tone6">{UI.rv_remainToday(queue.length, totalDue)}</span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped(true)}
        className="card w-full p-8 min-h-[220px] flex flex-col items-center justify-center gap-4 text-center"
      >
        {!flipped ? (
          <>
            {cardFront === 'hanzi' && <div className="hero-han text-5xl text-ink">{word.hanzi}</div>}
            {cardFront === 'jyutping' && <JyutpingText jyutping={word.jyutping} className="text-2xl" />}
            {cardFront === 'audio' && <PlayButton audio={word.audio} label={UI.rv_listen} variant="replay" size={26} />}
            <span className="text-xs text-tone6">{UI.rv_tapFlip}</span>
          </>
        ) : (
          <>
            <div className="hero-han text-5xl text-ink">{word.hanzi}</div>
            <JyutpingText jyutping={word.jyutping} className="text-lg" />
            <div className="text-tone6">{word.mandarin}</div>
            <PlayButton audio={word.audio} variant="replay" />
          </>
        )}
      </button>

      {flipped && preview ? (
        <div className="grid grid-cols-4 gap-2">
          {GRADE_ORDER.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGrade(g)}
              className={`rounded-2xl border bg-card py-3 flex flex-col items-center gap-1 active:scale-95 ${GRADE_STYLE[g]}`}
            >
              <span className="font-medium">{GRADE_LABELS[g]}</span>
              <span className="text-[11px] text-tone6">{formatInterval(preview[g])}</span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => setFlipped(true)} className="btn-primary w-full">{UI.rv_flip}</button>
      )}
    </div>
  );
}

/* ---------------- 錯題重練 ---------------- */

function WrongReview() {
  const wrongItems = useProgress((s) => s.wrongItems);
  const [redoType, setRedoType] = useState<WrongType | null>(null);

  const counts = countByType(wrongItems);

  if (redoType) {
    return <WrongRedo type={redoType} onExit={() => setRedoType(null)} />;
  }

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
      {WRONG_ORDER
        .filter((t) => counts[t] > 0)
        .map((t) => (
          <div key={t} className="card p-4 flex items-center gap-3">
            <span className="text-2xl">{WRONG_GLYPH[t]}</span>
            <div className="flex-1">
              <div className="font-medium text-ink">{WRONG_LABELS[t]}</div>
              <div className="text-xs text-tone6 mt-0.5">{UI.rv_wrongCount(counts[t])}</div>
            </div>
            <button type="button" onClick={() => setRedoType(t)} className="btn-ghost !py-2 text-sm">{UI.rv_redo}</button>
          </div>
        ))}
    </div>
  );
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function WrongRedo({ type, onExit }: { type: WrongType; onExit: () => void }) {
  const wrongItems = useProgress((s) => s.wrongItems);
  const gradeWrongItem = useProgress((s) => s.gradeWrongItem);

  // snapshot the ids to drill at entry; loop until the store has cleared them
  const [ids] = useState<string[]>(() => wrongItems.filter((i) => i.type === type).map((i) => i.id));
  const [pos, setPos] = useState(0);

  const remaining = ids.filter((id) => wrongItems.some((w) => w.id === id));
  const currentId = remaining[pos % Math.max(remaining.length, 1)];
  const item = wrongItems.find((w) => w.id === currentId);

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
    setPos((p) => p + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onExit} className="text-accent">{UI.py_back}</button>
        <span className="text-tone6">{UI.rv_remainCount(remaining.length)}</span>
      </div>
      <RedoQuestion key={item.id + pos} item={item} onGrade={onGrade} />
    </div>
  );
}

/** Fallback when a wrong item references data we can't resolve — let it clear. */
function OrphanSkip({ onGrade }: { onGrade: (c: boolean) => void }) {
  return (
    <div className="card p-6 text-center space-y-3">
      <p className="text-sm text-tone6">{UI.rv_orphan}</p>
      <button type="button" onClick={() => onGrade(true)} className="btn-ghost inline-flex">{UI.rv_orphanSkip}</button>
    </div>
  );
}

function RedoQuestion({ item, onGrade }: { item: WrongItem; onGrade: (c: boolean) => void }) {
  if (item.payload.kind === 'quiz') return <QuizRedo payload={item.payload} onGrade={onGrade} />;
  if (item.payload.kind === 'pinyin') return <PinyinRedo payload={item.payload} onGrade={onGrade} />;
  if (item.payload.kind === 'cloze') return <ClozeRedo payload={item.payload} onGrade={onGrade} />;
  if (item.payload.kind === 'dictation') return <DictationRedo payload={item.payload} onGrade={onGrade} />;
  return <ToneRedo payload={item.payload} onGrade={onGrade} />;
}

function DictationRedo({
  payload,
  onGrade,
}: {
  payload: Extract<WrongItem['payload'], { kind: 'dictation' }>;
  onGrade: (c: boolean) => void;
}) {
  const sentence = getSentence(payload.sentenceId);
  const target = useMemo(() => (sentence ? toSyllables(sentence.jyutping) : []), [sentence]);
  const initial = useMemo(
    () => shuffle(target.map((syl, i) => ({ cid: i, syl }))),
    [target]
  );
  const [pool, setPool] = useState(initial);
  const [placed, setPlaced] = useState<{ cid: number; syl: string }[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (sentence) void playAudio(sentence.audio);
  }, [sentence]);

  if (!sentence || target.length === 0) return <OrphanSkip onGrade={onGrade} />;
  const result = gradeDictation(placed.map((c) => c.syl), target);
  const correct = isPass(result);

  return (
    <div className="space-y-4">
      <p className="text-sm text-tone6">{UI.rv_redoDictationPrompt}</p>
      <div className="card p-4 flex items-center justify-between gap-3">
        <div className="text-lg text-ink flex-1">{sentence.mandarin}</div>
        <PlayButton audio={sentence.audio} variant="replay" />
      </div>

      <div className="min-h-[52px] flex flex-wrap gap-2 rounded-2xl border border-dashed border-line p-2.5">
        {placed.map((c) => (
          <button
            key={c.cid}
            type="button"
            disabled={checked}
            onClick={() => {
              setPlaced((p) => p.filter((x) => x.cid !== c.cid));
              setPool((p) => [...p, c]);
            }}
            className="rounded-xl bg-accent-soft px-3 py-2 font-mono text-sm text-accent"
          >
            {c.syl}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {pool.map((c) => (
          <button
            key={c.cid}
            type="button"
            onClick={() => {
              setPool((p) => p.filter((x) => x.cid !== c.cid));
              setPlaced((p) => [...p, c]);
            }}
            className="rounded-xl border border-line bg-card px-3 py-2 font-mono text-sm active:scale-95"
          >
            {c.syl}
          </button>
        ))}
      </div>

      {!checked ? (
        <button
          type="button"
          disabled={placed.length !== target.length}
          onClick={() => setChecked(true)}
          className="btn-primary w-full disabled:opacity-40"
        >
          <CheckIcon size={18} /> {UI.quiz_check}
        </button>
      ) : (
        <>
          {!correct && (
            <div className="card p-3.5">
              <div className="hero-han text-lg">{sentence.hanzi}</div>
              <JyutpingText jyutping={sentence.jyutping} className="text-xs mt-1" />
            </div>
          )}
          <button type="button" onClick={() => onGrade(correct)} className="btn-primary w-full">{UI.rv_next}</button>
        </>
      )}
    </div>
  );
}

function ClozeRedo({
  payload,
  onGrade,
}: {
  payload: Extract<WrongItem['payload'], { kind: 'cloze' }>;
  onGrade: (c: boolean) => void;
}) {
  const sentence = getSentence(payload.sentenceId);
  const word = getWord(payload.wordId);
  const options = useMemo<Word[]>(() => {
    if (!word) return [];
    const others = shuffle(
      scenarioVocab(payload.scenarioId)
        .map((id) => getWord(id))
        .filter((w): w is Word => w != null && w.id !== word.id)
    ).slice(0, 3);
    return shuffle([word, ...others]);
  }, [payload.scenarioId, word]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (sentence) void playAudio(sentence.audio);
  }, [sentence]);

  if (!sentence || !word || options.length < 2) return <OrphanSkip onGrade={onGrade} />;
  const answered = picked !== null;
  const blanked = blankOut(sentence.hanzi, word.hanzi);

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="hero-han text-xl leading-relaxed flex-1">{blanked}</p>
          <PlayButton audio={sentence.audio} variant="replay" />
        </div>
        <div className="text-xs text-tone6">{sentence.mandarin}</div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {options.map((o) => {
          const state = !answered ? '' : o.id === word.id ? 'ok' : o.id === picked ? 'bad' : 'dim';
          return (
            <button
              key={o.id}
              type="button"
              disabled={answered}
              onClick={() => setPicked(o.id)}
              className={`card p-3.5 text-center transition ${
                state === 'ok' ? '!border-tone3 bg-tone3/5' : state === 'bad' ? '!border-tone1 bg-tone1/5' : state === 'dim' ? 'opacity-50' : 'active:scale-[0.99]'
              }`}
            >
              <div className="hero-han text-xl">{o.hanzi}</div>
              <JyutpingText jyutping={o.jyutping} className="text-xs mt-1" />
            </button>
          );
        })}
      </div>
      {answered && (
        <button type="button" onClick={() => onGrade(picked === word.id)} className="btn-primary w-full">{UI.rv_next}</button>
      )}
    </div>
  );
}

function QuizRedo({
  payload,
  onGrade,
}: {
  payload: Extract<WrongItem['payload'], { kind: 'quiz' }>;
  onGrade: (c: boolean) => void;
}) {
  const target = getSentence(payload.sentenceId);
  const options = useMemo<Sentence[]>(() => {
    if (!target) return [];
    const others = shuffle(scenarioSentences(payload.scenarioId).filter((s) => s.id !== target.id)).slice(0, 3);
    return shuffle([target, ...others]);
  }, [payload.sentenceId, payload.scenarioId, target]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (target) void playAudio(target.audio);
  }, [target]);

  if (!target) return <OrphanSkip onGrade={onGrade} />;
  const answered = picked !== null;

  return (
    <div className="space-y-4">
      <div className="card p-5 text-center space-y-2">
        <p className="text-sm text-tone6">{UI.rv_redoQuizPrompt}</p>
        <PlayButton audio={target.audio} label={UI.quiz_replay} variant="replay" size={22} className="mx-auto" />
      </div>
      <div className="space-y-2.5">
        {options.map((o) => {
          const state = !answered ? '' : o.id === target.id ? 'ok' : o.id === picked ? 'bad' : 'dim';
          return (
            <button
              key={o.id}
              type="button"
              disabled={answered}
              onClick={() => setPicked(o.id)}
              className={`card w-full text-left p-3.5 transition ${
                state === 'ok' ? '!border-tone3 bg-tone3/5' : state === 'bad' ? '!border-tone1 bg-tone1/5' : state === 'dim' ? 'opacity-50' : 'active:scale-[0.99]'
              }`}
            >
              <div className="hero-han text-xl">{o.hanzi}</div>
              {answered && <JyutpingText jyutping={o.jyutping} className="text-xs mt-1" />}
            </button>
          );
        })}
      </div>
      {answered && (
        <button type="button" onClick={() => onGrade(picked === target.id)} className="btn-primary w-full">{UI.rv_next}</button>
      )}
    </div>
  );
}

function PinyinRedo({
  payload,
  onGrade,
}: {
  payload: Extract<WrongItem['payload'], { kind: 'pinyin' }>;
  onGrade: (c: boolean) => void;
}) {
  const pool = useMemo(() => pinyinItems(payload.ref), [payload.ref]);
  const target = pool.find((p) => p.jp === payload.jp);
  const options = useMemo<string[]>(() => {
    if (!target) return [];
    const distractors = shuffle(pool.map((p) => p.jp).filter((jp) => jp !== target.jp)).slice(0, 3);
    return shuffle([target.jp, ...distractors]);
  }, [pool, target]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (target) void playAudio(target.audio);
  }, [target]);

  if (!target) return <OrphanSkip onGrade={onGrade} />;
  const answered = picked !== null;

  return (
    <div className="space-y-4">
      <div className="card p-5 text-center space-y-2">
        <p className="text-sm text-tone6">{UI.rv_redoPinyinPrompt}</p>
        <PlayButton audio={target.audio} label={UI.quiz_replay} variant="replay" size={22} className="mx-auto" />
        <div className="hero-han text-2xl text-ink pt-1">{target.hanzi}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const state = !answered ? '' : opt === target.jp ? 'ok' : opt === picked ? 'bad' : 'dim';
          return (
            <button
              key={opt}
              type="button"
              disabled={answered}
              onClick={() => setPicked(opt)}
              className={`card p-4 font-mono text-xl transition ${
                state === 'ok' ? '!border-tone3 bg-tone3/5' : state === 'bad' ? '!border-tone1 bg-tone1/5' : state === 'dim' ? 'opacity-40' : 'active:scale-95'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <button type="button" onClick={() => onGrade(picked === target.jp)} className="btn-primary w-full">{UI.rv_next}</button>
      )}
    </div>
  );
}

function ToneRedo({
  payload,
  onGrade,
}: {
  payload: Extract<WrongItem['payload'], { kind: 'tonedrill' }>;
  onGrade: (c: boolean) => void;
}) {
  const set = tonesets.find((t) => t.syllable === payload.toneSet) ?? tonesets[0];
  const targetItem = set.items.find((i) => i.tone === payload.actual) ?? set.items[0];
  const options = useMemo<number[]>(() => {
    const distractors = shuffle(ALL_TONES.filter((t) => t !== payload.actual)).slice(0, 2);
    return shuffle([payload.actual, ...distractors]);
  }, [payload.actual]);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    void playAudio(targetItem.audio);
  }, [targetItem.audio]);

  const answered = picked !== null;

  return (
    <div className="space-y-4">
      <div className="card p-5 text-center space-y-2">
        <p className="text-sm text-tone6">{UI.rv_redoTonePrompt}</p>
        <PlayButton audio={targetItem.audio} label={UI.quiz_replay} variant="replay" size={22} className="mx-auto" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {options.map((tone) => {
          const state = !answered ? '' : tone === payload.actual ? 'ok' : tone === picked ? 'bad' : 'dim';
          return (
            <button
              key={tone}
              type="button"
              disabled={answered}
              onClick={() => setPicked(tone)}
              className={`card p-3 flex flex-col items-center gap-1 transition ${
                state === 'ok' ? '!border-tone3 bg-tone3/5' : state === 'bad' ? '!border-tone1 bg-tone1/5' : state === 'dim' ? 'opacity-40' : 'active:scale-95'
              }`}
            >
              <ToneContour tone={tone} size={56} strokeWidth={3} />
              <span className="text-sm font-medium" style={{ color: toneColor(tone) }}>{UI.pg_toneN(tone)}</span>
              <span className="text-[10px] text-tone6">{TONE_LABELS[tone]}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <button type="button" onClick={() => onGrade(picked === payload.actual)} className="btn-primary w-full">{UI.rv_next}</button>
      )}
    </div>
  );
}
