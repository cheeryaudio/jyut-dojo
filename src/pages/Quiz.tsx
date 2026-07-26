import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getScenario, getWord, scenarioSentences } from '../lib/data';
import { useProgress } from '../stores/progress';
import { playAudio } from '../lib/audio';
import { track } from '../lib/analytics';
import { blankOut, clozeHosts } from '../lib/cloze';
import { gradeDictation, isPass, toSyllables } from '../lib/dictation';
import { XP } from '../lib/xp';
import { UI } from '../lib/ui';
import { JyutpingText } from '../components/JyutpingText';
import { PlayButton } from '../components/PlayButton';
import { Stars } from '../components/Stars';
import { CheckIcon } from '../components/icons';
import type { Sentence, Word } from '../types';

type Question =
  | { kind: 'listen'; sentence: Sentence; options: Sentence[] }
  | { kind: 'order'; sentence: Sentence }
  | { kind: 'chain'; prompt: Sentence; answer: Sentence; options: Sentence[] }
  | { kind: 'cloze'; sentence: Sentence; word: Word; blanked: string; options: Word[] }
  | { kind: 'dictation'; sentence: Sentence };

/** How a wrong answer should be booked into the 錯題本. */
type WrongInfo =
  | { k: 'sentence'; sentence: Sentence }
  | { k: 'cloze'; sentence: Sentence; word: Word }
  | { k: 'dictation'; sentence: Sentence };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleOthers(pool: Sentence[], exclude: Set<string>, n: number): Sentence[] {
  return shuffle(pool.filter((s) => !exclude.has(s.id))).slice(0, n);
}

function buildQuiz(sentences: Sentence[]): Question[] {
  const questions: Question[] = [];

  // 3 listen-and-pick
  for (const s of shuffle(sentences).slice(0, 3)) {
    const opts = shuffle([s, ...sampleOthers(sentences, new Set([s.id]), 3)]);
    questions.push({ kind: 'listen', sentence: s, options: opts });
  }

  // 3 word-order rebuild — prefer shorter sentences for a fair puzzle
  const byLen = [...sentences].sort(
    (a, b) => a.jyutping.split(/\s+/).length - b.jyutping.split(/\s+/).length
  );
  for (const s of shuffle(byLen.slice(0, 5)).slice(0, 3)) {
    questions.push({ kind: 'order', sentence: s });
  }

  // 3 dialogue-chain (N → N+1)
  const chainIdx = shuffle(sentences.map((_, i) => i).filter((i) => i < sentences.length - 1)).slice(0, 3);
  for (const i of chainIdx) {
    const prompt = sentences[i];
    const answer = sentences[i + 1];
    const opts = shuffle([answer, ...sampleOthers(sentences, new Set([answer.id, prompt.id]), 2)]);
    questions.push({ kind: 'chain', prompt, answer, options: opts });
  }

  // 3 cloze (填空) — blank a vocab word, pick it from same-scenario distractors
  questions.push(...buildCloze(sentences, 3));

  // 3 dictation (聽寫) — rebuild the sentence from jyutping chips; prefer shorter
  for (const s of shuffle(byLen.slice(0, 6)).slice(0, 3)) {
    questions.push({ kind: 'dictation', sentence: s });
  }

  return shuffle(questions);
}

/** Build up to `n` cloze questions from sentences that can host a blank. */
function buildCloze(sentences: Sentence[], n: number): Extract<Question, { kind: 'cloze' }>[] {
  const hosts = clozeHosts(sentences, getWord);
  // distinct scenario vocab words we can use as choices
  const vocabWords = [
    ...new Map(
      sentences
        .flatMap((s) => s.vocab)
        .map((id) => getWord(id))
        .filter((w): w is Word => Boolean(w))
        .map((w) => [w.id, w])
    ).values(),
  ];
  const out: Extract<Question, { kind: 'cloze' }>[] = [];
  for (const { sentence, wordIds } of shuffle(hosts)) {
    if (out.length >= n) break;
    const word = getWord(shuffle(wordIds)[0]);
    if (!word) continue;
    const distractors = shuffle(vocabWords.filter((w) => w.id !== word.id)).slice(0, 3);
    if (distractors.length < 3) continue; // not enough choices for a fair question
    out.push({
      kind: 'cloze',
      sentence,
      word,
      blanked: blankOut(sentence.hanzi, word.hanzi),
      options: shuffle([word, ...distractors]),
    });
  }
  return out;
}

export function Quiz() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const scenario = getScenario(id);
  const sentences = useMemo(() => scenarioSentences(id), [id]);
  const [questions] = useState<Question[]>(() => buildQuiz(sentences));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const recordQuiz = useProgress((s) => s.recordQuiz);
  const bumpActivity = useProgress((s) => s.bumpActivity);
  const awardXp = useProgress((s) => s.awardXp);
  const recordWrong = useProgress((s) => s.recordWrong);

  const done = index >= questions.length;
  const stars = useMemo(() => {
    const pct = questions.length ? score / questions.length : 0;
    if (pct >= 0.9) return 3;
    if (pct >= 0.7) return 2;
    if (pct >= 0.5) return 1;
    return 0;
  }, [score, questions.length]);

  useEffect(() => {
    if (done && questions.length) {
      recordQuiz(id, stars);
      track('quiz_done', { scenarioId: id, score });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (!scenario) return <Link to="/path" className="btn-ghost">{UI.quiz_backToPath}</Link>;

  const onAnswer = (correct: boolean, wrong?: WrongInfo) => {
    bumpActivity();
    if (correct) {
      setScore((s) => s + 1);
      awardXp(XP.quizCorrect);
    } else if (wrong?.k === 'sentence') {
      recordWrong('quiz', id, { kind: 'quiz', sentenceId: wrong.sentence.id, scenarioId: id });
      track('quiz_wrong', { refId: wrong.sentence.id });
    } else if (wrong?.k === 'cloze') {
      recordWrong('cloze', id, { kind: 'cloze', sentenceId: wrong.sentence.id, wordId: wrong.word.id, scenarioId: id });
      track('quiz_wrong', { refId: wrong.word.id });
    } else if (wrong?.k === 'dictation') {
      recordWrong('dictation', id, { kind: 'dictation', sentenceId: wrong.sentence.id, scenarioId: id });
      track('quiz_wrong', { refId: wrong.sentence.id });
    }
    setIndex((i) => i + 1);
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="space-y-6 pt-6 text-center">
        <h1 className="hero-han text-2xl font-bold">{UI.quiz_doneTitle}</h1>
        <div className="flex justify-center"><Stars value={stars} size={40} /></div>
        <div className="card p-6">
          <div className="text-5xl font-bold text-accent">{pct}%</div>
          <div className="text-sm text-tone6 mt-2">{UI.quiz_score(score, questions.length)}</div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(`/scenarios/${id}`)} className="btn-outline flex-1">
            {UI.quiz_backToScenario}
          </button>
          <button type="button" onClick={() => navigate(0)} className="btn-primary flex-1">
            {UI.quiz_retry}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[index];
  return (
    <div className="space-y-5">
      <header className="pt-1">
        <div className="flex items-center justify-between">
          <Link to={`/scenarios/${id}`} className="text-sm text-accent">← {scenario.title}</Link>
          <span className="text-sm text-tone6 tabular-nums">{index + 1} / {questions.length}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
      </header>

      {q.kind === 'listen' && <ListenQuestion key={index} q={q} onAnswer={onAnswer} />}
      {q.kind === 'order' && <OrderQuestion key={index} q={q} onAnswer={onAnswer} />}
      {q.kind === 'chain' && <ChainQuestion key={index} q={q} onAnswer={onAnswer} />}
      {q.kind === 'cloze' && <ClozeQuestion key={index} q={q} onAnswer={onAnswer} />}
      {q.kind === 'dictation' && <DictationQuestion key={index} q={q} onAnswer={onAnswer} />}
    </div>
  );
}

function Next({ correct, onNext }: { correct: boolean; onNext: () => void }) {
  return (
    <div className="space-y-3">
      <div className={`text-center font-medium ${correct ? 'text-tone3' : 'text-tone1'}`}>
        {correct ? UI.quiz_correct : UI.quiz_wrong}
      </div>
      <button type="button" onClick={onNext} className="btn-primary w-full">{UI.quiz_next}</button>
    </div>
  );
}

function ListenQuestion({ q, onAnswer }: { q: Extract<Question, { kind: 'listen' }>; onAnswer: (c: boolean, w?: WrongInfo) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    void playAudio(q.sentence.audio);
  }, [q.sentence.audio]);
  const answered = picked !== null;
  const correct = picked === q.sentence.id;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-tone6 mb-3">{UI.quiz_listenPrompt}</p>
        <PlayButton audio={q.sentence.audio} label={UI.quiz_replay} variant="replay" size={22} className="mx-auto" />
      </div>
      <div className="space-y-2.5">
        {q.options.map((o) => {
          const state = !answered ? '' : o.id === q.sentence.id ? 'ok' : o.id === picked ? 'bad' : 'dim';
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
      {answered && <Next correct={correct} onNext={() => onAnswer(correct, { k: 'sentence', sentence: q.sentence })} />}
    </div>
  );
}

interface Chip {
  cid: number;
  syl: string;
}

function OrderQuestion({ q, onAnswer }: { q: Extract<Question, { kind: 'order' }>; onAnswer: (c: boolean, w?: WrongInfo) => void }) {
  const target = useMemo(() => q.sentence.jyutping.trim().split(/\s+/), [q.sentence.jyutping]);
  const initial = useMemo<Chip[]>(() => shuffle(target.map((syl, i) => ({ cid: i, syl }))), [target]);
  const [pool, setPool] = useState<Chip[]>(initial);
  const [placed, setPlaced] = useState<Chip[]>([]);
  const [checked, setChecked] = useState(false);

  const correct = placed.map((c) => c.syl).join(' ') === target.join(' ');

  return (
    <div className="space-y-4">
      <p className="text-sm text-tone6">{UI.quiz_orderPrompt}</p>
      <div className="card p-4">
        <div className="text-lg text-ink">{q.sentence.mandarin}</div>
      </div>

      <div className="min-h-[52px] flex flex-wrap gap-2 rounded-2xl border border-dashed border-line p-2.5">
        {placed.length === 0 && <span className="text-sm text-tone6 self-center px-1">{UI.quiz_orderPlaceholder}</span>}
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
              <div className="text-xs text-tone6 mb-1">{UI.quiz_correctOrder}</div>
              <JyutpingText jyutping={target.join(' ')} className="text-sm" />
              <div className="hero-han text-lg mt-1">{q.sentence.hanzi}</div>
            </div>
          )}
          <Next correct={correct} onNext={() => onAnswer(correct, { k: 'sentence', sentence: q.sentence })} />
        </>
      )}
    </div>
  );
}

function ChainQuestion({ q, onAnswer }: { q: Extract<Question, { kind: 'chain' }>; onAnswer: (c: boolean, w?: WrongInfo) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    void playAudio(q.prompt.audio);
  }, [q.prompt.audio]);
  const answered = picked !== null;
  const correct = picked === q.answer.id;

  return (
    <div className="space-y-4">
      <p className="text-sm text-tone6">{UI.quiz_chainPrompt}</p>
      <div className="card p-4 flex items-center justify-between gap-3">
        <div>
          <div className="hero-han text-xl">{q.prompt.hanzi}</div>
          <JyutpingText jyutping={q.prompt.jyutping} className="text-xs mt-1" />
        </div>
        <PlayButton audio={q.prompt.audio} variant="replay" />
      </div>
      <div className="text-center text-tone6 text-sm">↓</div>
      <div className="space-y-2.5">
        {q.options.map((o) => {
          const state = !answered ? '' : o.id === q.answer.id ? 'ok' : o.id === picked ? 'bad' : 'dim';
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
              <div className="hero-han text-lg">{o.hanzi}</div>
              {answered && <JyutpingText jyutping={o.jyutping} className="text-xs mt-1" />}
            </button>
          );
        })}
      </div>
      {answered && <Next correct={correct} onNext={() => onAnswer(correct, { k: 'sentence', sentence: q.answer })} />}
    </div>
  );
}

function ClozeQuestion({ q, onAnswer }: { q: Extract<Question, { kind: 'cloze' }>; onAnswer: (c: boolean, w?: WrongInfo) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    void playAudio(q.sentence.audio);
  }, [q.sentence.audio]);
  const answered = picked !== null;
  const correct = picked === q.word.id;

  return (
    <div className="space-y-4">
      <p className="text-sm text-tone6">{UI.quiz_clozePrompt}</p>
      <div className="card p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="hero-han text-xl leading-relaxed flex-1">{q.blanked}</p>
          <PlayButton audio={q.sentence.audio} variant="replay" />
        </div>
        <div className="text-xs text-tone6">{q.sentence.mandarin}</div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {q.options.map((o) => {
          const state = !answered ? '' : o.id === q.word.id ? 'ok' : o.id === picked ? 'bad' : 'dim';
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
        <>
          {!correct && (
            <div className="card p-3.5">
              <div className="text-xs text-tone6 mb-1">{UI.quiz_correctSentence}</div>
              <div className="hero-han text-lg">{q.sentence.hanzi}</div>
              <JyutpingText jyutping={q.sentence.jyutping} className="text-xs mt-1" />
            </div>
          )}
          <Next correct={correct} onNext={() => onAnswer(correct, { k: 'cloze', sentence: q.sentence, word: q.word })} />
        </>
      )}
    </div>
  );
}

interface DChip {
  cid: number;
  syl: string;
}

/**
 * 聽寫 — hear the sentence, rebuild it from jyutping syllable chips (same chip
 * UI as OrderQuestion). Graded leniently via gradeDictation: a toneless match
 * (right sounds, wrong tones) still passes with a gentle note.
 */
function DictationQuestion({ q, onAnswer }: { q: Extract<Question, { kind: 'dictation' }>; onAnswer: (c: boolean, w?: WrongInfo) => void }) {
  const target = useMemo(() => toSyllables(q.sentence.jyutping), [q.sentence.jyutping]);
  const initial = useMemo<DChip[]>(() => shuffle(target.map((syl, i) => ({ cid: i, syl }))), [target]);
  const [pool, setPool] = useState<DChip[]>(initial);
  const [placed, setPlaced] = useState<DChip[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    void playAudio(q.sentence.audio);
  }, [q.sentence.audio]);

  const result = gradeDictation(placed.map((c) => c.syl), target);
  const correct = isPass(result);

  return (
    <div className="space-y-4">
      <p className="text-sm text-tone6">{UI.quiz_dictationPrompt}</p>
      <div className="card p-4 flex items-center justify-between gap-3">
        <div className="text-lg text-ink flex-1">{q.sentence.mandarin}</div>
        <PlayButton audio={q.sentence.audio} label={UI.quiz_replay} variant="replay" />
      </div>

      <div className="min-h-[52px] flex flex-wrap gap-2 rounded-2xl border border-dashed border-line p-2.5">
        {placed.length === 0 && <span className="text-sm text-tone6 self-center px-1">{UI.quiz_orderPlaceholder}</span>}
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
          {result === 'toneless' && (
            <div className="text-center text-xs text-tone2">{UI.quiz_dictationTonesNote}</div>
          )}
          {!correct && (
            <div className="card p-3.5">
              <div className="text-xs text-tone6 mb-1">{UI.quiz_correctSentence}</div>
              <div className="hero-han text-lg">{q.sentence.hanzi}</div>
              <JyutpingText jyutping={q.sentence.jyutping} className="text-xs mt-1" />
            </div>
          )}
          <Next correct={correct} onNext={() => onAnswer(correct, { k: 'dictation', sentence: q.sentence })} />
        </>
      )}
    </div>
  );
}
