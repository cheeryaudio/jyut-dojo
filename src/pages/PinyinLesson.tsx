import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { pinyin } from '../lib/data';
import { useProgress, pathProgress } from '../stores/progress';
import { isUnitUnlocked } from '../lib/path';
import { playAudio } from '../lib/audio';
import { track } from '../lib/analytics';
import { JyutpingText } from '../components/JyutpingText';
import { PlayButton } from '../components/PlayButton';
import { XP } from '../lib/xp';
import type { PinyinItem } from '../types';

import { UI } from '../lib/ui';
const QUIZ_LEN = 8;
const PASS = 6;

interface Tagged {
  item: PinyinItem;
  /** group id for same-group distractors ('initials' for initials) */
  group: string;
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function taggedItems(ref: string): Tagged[] {
  if (ref === 'initials') return pinyin.initials.map((item) => ({ item, group: 'initials' }));
  return pinyin.finalGroups.flatMap((g) => g.items.map((item) => ({ item, group: g.id })));
}

interface QItem {
  item: PinyinItem;
  options: string[];
}

function buildQuiz(pool: Tagged[]): QItem[] {
  return shuffle(pool)
    .slice(0, QUIZ_LEN)
    .map(({ item, group }) => {
      const sameGroup = pool.filter((t) => t.group === group && t.item.jp !== item.jp).map((t) => t.item.jp);
      const distractors = shuffle([...new Set(sameGroup)]).slice(0, 3);
      // top up from the whole pool if a group is tiny
      if (distractors.length < 3) {
        const extra = shuffle(pool.map((t) => t.item.jp).filter((jp) => jp !== item.jp && !distractors.includes(jp)));
        distractors.push(...extra.slice(0, 3 - distractors.length));
      }
      return { item, options: shuffle([item.jp, ...distractors]) };
    });
}

export function PinyinLesson() {
  const { ref = 'initials' } = useParams();
  const isInitials = ref === 'initials';
  const pool = useMemo(() => taggedItems(ref), [ref]);
  const [mode, setMode] = useState<'learn' | 'quiz'>('learn');
  const state = useProgress((s) => s);

  // deep-link guard: a locked pinyin unit route bounces back to the path
  if (!isUnitUnlocked(pathProgress(state), 'pinyin', ref)) return <Navigate to="/path" replace />;

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <Link to="/path" className="text-sm text-accent">{UI.gr_back}</Link>
        <h1 className="hero-han text-2xl font-bold text-ink mt-2">{isInitials ? UI.py_initialsTitle : UI.py_finalsTitle}</h1>
        <p className="text-sm text-tone6 mt-1">
          {isInitials ? UI.py_initialsSub : UI.py_finalsSub}
        </p>
      </header>

      {mode === 'learn' ? (
        <>
          {isInitials ? (
            <div className="grid grid-cols-2 gap-2.5">
              {pinyin.initials.map((it) => (
                <Tile key={it.jp} item={it} />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {pinyin.finalGroups.map((g) => (
                <section key={g.id} className="space-y-2">
                  <div className="px-1">
                    <h2 className="hero-han text-base text-ink">{g.title}</h2>
                    <p className="text-xs text-tone6 mt-0.5">{g.note}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {g.items.map((it) => (
                      <Tile key={`${g.id}-${it.jp}`} item={it} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <div className="sticky bottom-24 pt-2">
            <button type="button" onClick={() => setMode('quiz')} className="btn-primary w-full shadow-card">
              {UI.py_quizCta(QUIZ_LEN)}
            </button>
          </div>
        </>
      ) : (
        <PinyinQuiz refId={ref} pool={pool} onBack={() => setMode('learn')} />
      )}
    </div>
  );
}

function Tile({ item }: { item: PinyinItem }) {
  return (
    <button
      type="button"
      onClick={() => void playAudio(item.audio)}
      className="card p-3 text-left active:scale-[0.99] transition"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-2xl text-ink">{item.jp}</span>
        <PlayButton audio={item.audio} size={16} />
      </div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="hero-han text-lg text-ink">{item.hanzi}</span>
        <JyutpingText jyutping={item.jyutping} className="text-xs" />
      </div>
      {item.hint && <p className="text-[11px] text-tone6 mt-1 leading-snug">{item.hint}</p>}
    </button>
  );
}

function PinyinQuiz({ refId, pool, onBack }: { refId: string; pool: Tagged[]; onBack: () => void }) {
  const [questions] = useState<QItem[]>(() => buildQuiz(pool));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<PinyinItem[]>([]);
  const [correctCount, setCorrectCount] = useState(0);

  const markPinyinDone = useProgress((s) => s.markPinyinDone);
  const awardXp = useProgress((s) => s.awardXp);
  const recordWrong = useProgress((s) => s.recordWrong);
  const bumpActivity = useProgress((s) => s.bumpActivity);

  const done = index >= questions.length;
  const q = questions[index];
  const answered = picked !== null;
  const passed = correctCount >= PASS;

  useEffect(() => {
    if (!done && q) void playAudio(q.item.audio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, done]);

  const recorded = useRef(false);
  useEffect(() => {
    if (!done || recorded.current) return;
    recorded.current = true;
    if (passed) markPinyinDone(refId);
    else bumpActivity();
    track('pinyin_quiz_done', { ref: refId, score: correctCount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <div className="text-5xl">{passed ? '🎉' : '💪'}</div>
        <div className="card p-6">
          <div className="text-4xl font-bold text-accent">{correctCount}/{questions.length}</div>
          <div className="text-sm text-tone6 mt-2">{passed ? UI.py_pass : UI.py_fail(PASS)}</div>
        </div>
        {wrong.length > 0 && (
          <div className="card p-4 text-left space-y-2">
            <div className="text-xs text-tone6">{UI.py_reListen}</div>
            <div className="flex flex-wrap gap-2">
              {wrong.map((w) => (
                <button
                  key={w.jp}
                  type="button"
                  onClick={() => void playAudio(w.audio)}
                  className="flex items-center gap-1.5 rounded-xl border border-line px-2.5 py-1.5"
                >
                  <span className="font-mono text-ink">{w.jp}</span>
                  <span className="hero-han text-sm text-tone6">{w.hanzi}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <button type="button" onClick={onBack} className="btn-primary w-full">{UI.py_backToLearn}</button>
      </div>
    );
  }

  const onPick = (jp: string) => {
    if (answered) return;
    setPicked(jp);
    const ok = jp === q.item.jp;
    bumpActivity();
    if (ok) {
      setCorrectCount((c) => c + 1);
      awardXp(XP.pinyinCorrect);
    } else {
      setWrong((w) => (w.some((x) => x.jp === q.item.jp) ? w : [...w, q.item]));
      recordWrong('pinyin', refId, { kind: 'pinyin', ref: refId, jp: q.item.jp });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-accent">{UI.py_back}</button>
        <span className="text-sm text-tone6 tabular-nums">{index + 1} / {questions.length}</span>
      </div>
      <div className="h-1.5 rounded-full bg-line overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>

      <div className="card p-6 text-center space-y-2">
        <p className="text-sm text-tone6">{UI.py_prompt}</p>
        <PlayButton audio={q.item.audio} label={UI.quiz_replay} variant="replay" size={24} className="mx-auto" />
        <div className="hero-han text-2xl text-ink pt-1">{q.item.hanzi}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {q.options.map((opt) => {
          const state = !answered ? '' : opt === q.item.jp ? 'ok' : opt === picked ? 'bad' : 'dim';
          return (
            <button
              key={opt}
              type="button"
              disabled={answered}
              onClick={() => onPick(opt)}
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
        <button type="button" onClick={() => { setPicked(null); setIndex((i) => i + 1); }} className="btn-primary w-full">
          {index + 1 >= questions.length ? UI.py_seeScore : UI.py_next}
        </button>
      )}
    </div>
  );
}
