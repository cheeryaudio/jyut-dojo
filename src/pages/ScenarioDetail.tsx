import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom';
import { getScenario, getWord, scenarioSentences } from '../lib/data';
import { alignHanziJyutping } from '../lib/align';
import { toneColor, toneOf } from '../lib/tones';
import { useProgress, pathProgress } from '../stores/progress';
import { isUnitUnlocked } from '../lib/path';
import { patternForSentence } from '../lib/patterns';
import { playAudio, toast } from '../lib/audio';
import { track } from '../lib/analytics';
import { XP } from '../lib/xp';
import { JyutpingText } from '../components/JyutpingText';
import { PlayButton } from '../components/PlayButton';
import { PitchShadow } from '../components/PitchShadow';
import { BottomSheet } from '../components/BottomSheet';
import { ReportSheet, type ReportTarget } from '../components/ReportSheet';
import { UI } from '../lib/ui';
import type { Pattern, Sentence, Word } from '../types';

type Tab = 'learn' | 'practice' | 'test';

interface CharSel {
  char: string;
  syllable: string;
  word: Word | undefined;
}

export function ScenarioDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const scenario = getScenario(id);
  const sentences = useMemo(() => scenarioSentences(id), [id]);
  const state = useProgress((s) => s);
  const learned = state.learnedScenarios.includes(id);
  const practiced = state.practicedScenarios.includes(id);
  const completeLesson = state.completeLesson;

  const [tab, setTab] = useState<Tab>('learn');
  const [sel, setSel] = useState<CharSel | null>(null);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);

  // deep-link guard: hitting a locked unit route directly bounces to the path
  const unlocked = isUnitUnlocked(pathProgress(state), 'scenario', id);

  if (!scenario) {
    return (
      <div className="space-y-3">
        <p className="text-tone6">{UI.sc_notFound}</p>
        <Link to="/path" className="btn-ghost">{UI.sc_backToPath}</Link>
      </div>
    );
  }

  if (!unlocked) return <Navigate to="/path" replace />;

  const openChar = (char: string, syllable: string, sentence: Sentence) => {
    const word = sentence.vocab
      .map((w) => getWord(w))
      .find((w): w is Word => Boolean(w && w.hanzi.includes(char)));
    setSel({ char, syllable, word });
  };

  const onComplete = () => {
    completeLesson(id);
    track('lesson_complete', { scenarioId: id });
    toast(UI.sc_completeToast);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'learn', label: UI.sc_tabLearn },
    { key: 'practice', label: UI.sc_tabPractice },
    { key: 'test', label: UI.sc_tabTest },
  ];

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <Link to="/path" className="text-sm text-accent">{UI.sc_backToPathArrow}</Link>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-3xl">{scenario.emoji}</span>
          <h1 className="hero-han text-2xl font-bold text-ink">{scenario.title}</h1>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-line/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-xl py-2 text-sm font-medium transition ${
              tab === t.key ? 'bg-card text-accent shadow-card' : 'text-tone6'
            }`}
          >
            {t.label}
            {t.key === 'learn' && learned && ' ✓'}
            {t.key === 'practice' && practiced && ' ✓'}
          </button>
        ))}
      </div>

      {tab === 'learn' && (
        <div className="space-y-5">
          <p className="text-sm text-tone6">{scenario.intro}</p>
          <div className="space-y-3">
            {sentences.map((s) => (
              <Bubble
                key={s.id}
                sentence={s}
                onCharTap={openChar}
                onGrammarTap={setPattern}
                onReport={setReport}
              />
            ))}
          </div>
          <button type="button" onClick={onComplete} className="btn-primary w-full">
            {learned ? UI.sc_completed : UI.sc_complete}
          </button>
        </div>
      )}

      {tab === 'practice' && <Practice scenarioId={id} sentences={sentences} onDone={() => setTab('test')} />}

      {tab === 'test' && (
        <div className="space-y-4">
          {practiced ? (
            <>
              <div className="card p-5 text-center space-y-2">
                <div className="text-4xl">📝</div>
                <p className="text-sm text-tone6">{UI.sc_testIntro}</p>
              </div>
              <button type="button" onClick={() => navigate(`/scenarios/${id}/quiz`)} className="btn-primary w-full">
                {UI.sc_startTest}
              </button>
            </>
          ) : (
            <div className="card p-6 text-center space-y-3">
              <div className="text-4xl">🔒</div>
              <p className="text-sm text-tone6">{UI.sc_testLocked}</p>
              <button type="button" onClick={() => setTab('practice')} className="btn-ghost inline-flex">
                {UI.sc_goPractice}
              </button>
            </div>
          )}
        </div>
      )}

      <BottomSheet open={sel !== null} onClose={() => setSel(null)} title={UI.vocab_title}>
        {sel && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="hero-han text-5xl" style={{ color: toneColor(toneOf(sel.syllable)) }}>
                {sel.char}
              </div>
              <div>
                <JyutpingText jyutping={sel.syllable} className="text-lg" />
                <div className="text-xs text-tone6 mt-1">{UI.vocab_tone(toneOf(sel.syllable))}</div>
              </div>
            </div>
            {sel.word ? (
              <>
                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="hero-han text-2xl text-ink">{sel.word.hanzi}</div>
                      <JyutpingText jyutping={sel.word.jyutping} className="text-sm" />
                      <div className="text-sm text-tone6 mt-1">{sel.word.mandarin}</div>
                    </div>
                    <PlayButton audio={sel.word.audio} label={UI.vocab_word} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const w = sel.word;
                    if (w) setReport({ refType: 'word', refId: w.id });
                  }}
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

      <BottomSheet open={pattern !== null} onClose={() => setPattern(null)} title={UI.sc_grammarChip}>
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
              {pattern.examples.map((ex, i) => (
                <div key={i} className="rounded-2xl border border-line p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="hero-han text-base text-ink leading-relaxed">{ex.hanzi}</div>
                    <JyutpingText jyutping={ex.jyutping} className="text-xs" />
                    <div className="text-xs text-tone6">{ex.mandarin}</div>
                  </div>
                  <PlayButton audio={ex.audio} size={18} />
                </div>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>

      <ReportSheet open={report !== null} target={report} onClose={() => setReport(null)} />
    </div>
  );
}

function Practice({
  scenarioId,
  sentences,
  onDone,
}: {
  scenarioId: string;
  sentences: Sentence[];
  onDone: () => void;
}) {
  const completePractice = useProgress((s) => s.completePractice);
  const awardXp = useProgress((s) => s.awardXp);

  const [queue, setQueue] = useState<Sentence[]>(() => sentences);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [firstPass, setFirstPass] = useState<Set<string>>(() => new Set());

  const current = queue[0];

  useEffect(() => {
    if (current) void playAudio(current.audio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const grade = (known: boolean) => {
    if (!current) return;
    // award XP once per sentence the first time it's marked 識
    if (known && !firstPass.has(current.id)) {
      awardXp(XP.practiceSentence);
      setFirstPass((p) => new Set(p).add(current.id));
    }
    setRevealed(false);
    setQueue((q) => {
      const [, ...rest] = q;
      const next = known ? rest : [...rest, current];
      if (next.length === 0) {
        completePractice(scenarioId);
        track('practice_complete', { scenarioId });
        setFinished(true);
      }
      return next;
    });
  };

  if (finished || !current) {
    return (
      <div className="space-y-5 text-center">
        <div className="text-5xl">✅</div>
        <div className="card p-6">
          <div className="hero-han text-xl text-ink">{UI.pr_doneTitle}</div>
          <p className="text-sm text-tone6 mt-2">{UI.pr_doneSub}</p>
        </div>
        <button type="button" onClick={onDone} className="btn-primary w-full">{UI.pr_goTest}</button>
      </div>
    );
  }

  const done = sentences.length - queue.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm text-tone6">
        <span>{UI.pr_hint}</span>
        <span className="tabular-nums">{UI.pr_remaining(queue.length)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-line overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(done / sentences.length) * 100}%` }} />
      </div>

      <div className="card p-6 text-center space-y-4 min-h-[180px] flex flex-col justify-center">
        <PlayButton audio={current.audio} label={UI.pr_replay} variant="replay" size={24} className="mx-auto" />
        {!revealed ? (
          <p className="text-sm text-tone6">{UI.pr_listenTry}</p>
        ) : (
          <div className="space-y-2">
            <div className="hero-han text-2xl text-ink">{current.hanzi}</div>
            <JyutpingText jyutping={current.jyutping} className="text-sm" />
            <div className="text-sm text-tone6">{current.mandarin}</div>
          </div>
        )}
      </div>

      {!revealed ? (
        <button type="button" onClick={() => setRevealed(true)} className="btn-primary w-full">{UI.pr_seeAnswer}</button>
      ) : (
        <div className="space-y-3">
          {/* optional inline pitch-shadow — reuses the ToneCompare pitch pipeline */}
          <PitchShadow key={current.id} audio={current.audio} />
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => grade(false)} className="btn-outline !border-tone1 text-tone1">
              {UI.pr_dontKnow}
            </button>
            <button type="button" onClick={() => grade(true)} className="btn-primary">{UI.pr_know}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({
  sentence,
  onCharTap,
  onGrammarTap,
  onReport,
}: {
  sentence: Sentence;
  onCharTap: (char: string, syllable: string, sentence: Sentence) => void;
  onGrammarTap: (pattern: Pattern) => void;
  onReport: (target: ReportTarget) => void;
}) {
  const [showMandarin, setShowMandarin] = useState(false);
  const isA = sentence.speaker === 'A';
  const pattern = patternForSentence(sentence.id);

  const aligned = alignHanziJyutping(sentence.hanzi, sentence.jyutping);
  const sylByIndex = new Map(aligned.map((a) => [a.charIndex, a.syllable]));
  const chars = [...sentence.hanzi];

  return (
    <div className={`flex ${isA ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[88%] rounded-2xl border p-3.5 ${isA ? 'bg-card border-line' : 'bg-accent-soft border-accent/20'}`}>
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className={`text-[11px] font-medium ${isA ? 'text-tone6' : 'text-accent'}`}>
            {isA ? 'A' : 'B'}
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
          {chars.map((c, i) => {
            const syl = sylByIndex.get(i);
            if (!syl) return <span key={i}>{c}</span>;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onCharTap(c, syl, sentence)}
                className="rounded-md px-[1px] active:bg-accent/10"
                style={{ textUnderlineOffset: 4 }}
              >
                <span className="border-b border-dashed border-ink/20">{c}</span>
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
            onClick={() => setShowMandarin((v) => !v)}
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
