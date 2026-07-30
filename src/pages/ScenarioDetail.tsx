import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ReportSheet, type ReportTarget } from '../components/ReportSheet';
import { GrammarSheet, VocabSheet, type CharSelection } from '../features/scenario/DetailSheets';
import { PracticeTab } from '../features/scenario/PracticeTab';
import { SentenceBubble } from '../features/scenario/SentenceBubble';
import { usePathProgress } from '../hooks/usePathProgress';
import { track } from '../lib/analytics';
import { toast } from '../lib/audio';
import { getScenario, getWord, scenarioSentences, scenarioVocab } from '../lib/data';
import { isUnitUnlocked } from '../lib/path';
import { UI } from '../lib/ui';
import { useProgress } from '../stores/progress';
import type { Pattern, Sentence, Word } from '../types';

type Tab = 'learn' | 'practice' | 'test';

export function ScenarioDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const scenario = getScenario(id);
  const sentences = useMemo(() => scenarioSentences(id), [id]);

  const pathProgress = usePathProgress();
  const learned = useProgress((state) => state.learnedScenarios).includes(id);
  const practiced = useProgress((state) => state.practicedScenarios).includes(id);
  const completeLesson = useProgress((state) => state.completeLesson);

  const [tab, setTab] = useState<Tab>('learn');
  const [selection, setSelection] = useState<CharSelection | null>(null);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);

  // deep-link guard: hitting a locked unit route directly bounces to the path
  const unlocked = isUnitUnlocked(pathProgress, 'scenario', id);

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
      .map((wordId) => getWord(wordId))
      .find((candidate): candidate is Word => candidate !== undefined && candidate.hanzi.includes(char));
    setSelection({ char, syllable, word });
  };

  const onComplete = () => {
    completeLesson(id, scenarioVocab(id));
    track('lesson_complete', { scenarioId: id });
    toast(UI.sc_completeToast);
  };

  const tabs: { key: Tab; label: string; done: boolean }[] = [
    { key: 'learn', label: UI.sc_tabLearn, done: learned },
    { key: 'practice', label: UI.sc_tabPractice, done: practiced },
    { key: 'test', label: UI.sc_tabTest, done: false },
  ];

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <Link to="/path" className="text-sm text-accent">{UI.sc_backToPathArrow}</Link>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-3xl" aria-hidden="true">{scenario.emoji}</span>
          <h1 className="hero-han text-2xl font-bold text-ink">{scenario.title}</h1>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-line/50 p-1" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-xl py-2 text-sm font-medium transition ${
              tab === item.key ? 'bg-card text-accent shadow-card' : 'text-tone6'
            }`}
          >
            {item.label}
            {item.done && ' ✓'}
          </button>
        ))}
      </div>

      {tab === 'learn' && (
        <div className="space-y-5">
          <p className="text-sm text-tone6">{scenario.intro}</p>
          <div className="space-y-3">
            {sentences.map((sentence) => (
              <SentenceBubble
                key={sentence.id}
                sentence={sentence}
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

      {tab === 'practice' && (
        <PracticeTab scenarioId={id} sentences={sentences} onDone={() => setTab('test')} />
      )}

      {tab === 'test' && (
        <div className="space-y-4">
          {practiced ? (
            <>
              <div className="card p-5 text-center space-y-2">
                <div className="text-4xl">📝</div>
                <p className="text-sm text-tone6">{UI.sc_testIntro}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/scenarios/${id}/quiz`)}
                className="btn-primary w-full"
              >
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

      <VocabSheet
        selection={selection}
        onClose={() => setSelection(null)}
        onReportWord={(wordId) => setReport({ refType: 'word', refId: wordId })}
      />
      <GrammarSheet pattern={pattern} onClose={() => setPattern(null)} />
      <ReportSheet open={report !== null} target={report} onClose={() => setReport(null)} />
    </div>
  );
}
