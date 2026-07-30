import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Stars } from '../components/Stars';
import { buildQuiz, quizStars } from '../domain/exercises/quizBuilder';
import { QuestionView } from '../features/quiz/QuestionView';
import type { AnswerHandler } from '../features/quiz/types';
import { track } from '../lib/analytics';
import { getScenario, getWord, scenarioSentences } from '../lib/data';
import { UI } from '../lib/ui';
import { XP } from '../lib/xp';
import { useProgress } from '../stores/progress';

export function Quiz() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const scenario = getScenario(id);
  const sentences = useMemo(() => scenarioSentences(id), [id]);
  const [questions] = useState(() => buildQuiz(sentences, { getWord }));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  const recordQuiz = useProgress((state) => state.recordQuiz);
  const bumpActivity = useProgress((state) => state.bumpActivity);
  const awardXp = useProgress((state) => state.awardXp);
  const recordWrong = useProgress((state) => state.recordWrong);

  const done = index >= questions.length;
  const stars = quizStars(score, questions.length);

  useEffect(() => {
    if (done && questions.length > 0) {
      recordQuiz(id, stars);
      track('quiz_done', { scenarioId: id, score });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (!scenario) return <Link to="/path" className="btn-ghost">{UI.quiz_backToPath}</Link>;

  const onAnswer: AnswerHandler = (correct, wrong) => {
    bumpActivity();
    if (correct) {
      setScore((current) => current + 1);
      awardXp(XP.quizCorrect);
    } else if (wrong?.kind === 'sentence') {
      recordWrong('quiz', id, { kind: 'quiz', sentenceId: wrong.sentence.id, scenarioId: id });
      track('quiz_wrong', { refId: wrong.sentence.id });
    } else if (wrong?.kind === 'cloze') {
      recordWrong('cloze', id, {
        kind: 'cloze',
        sentenceId: wrong.sentence.id,
        wordId: wrong.word.id,
        scenarioId: id,
      });
      track('quiz_wrong', { refId: wrong.word.id });
    } else if (wrong?.kind === 'dictation') {
      recordWrong('dictation', id, { kind: 'dictation', sentenceId: wrong.sentence.id, scenarioId: id });
      track('quiz_wrong', { refId: wrong.sentence.id });
    }
    setIndex((current) => current + 1);
  };

  // A scenario with too little material to quiz should say so, not show 0 / 0.
  if (questions.length === 0) {
    return (
      <div className="space-y-4 pt-6 text-center">
        <p className="text-tone6">{UI.quiz_emptyScenario}</p>
        <Link to={`/scenarios/${id}`} className="btn-primary inline-flex">{UI.quiz_backToScenario}</Link>
      </div>
    );
  }

  if (done) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <div className="space-y-6 pt-6 text-center">
        <h1 className="hero-han text-2xl font-bold">{UI.quiz_doneTitle}</h1>
        <div className="flex justify-center"><Stars value={stars} size={40} /></div>
        <div className="card p-6">
          <div className="text-5xl font-bold text-accent">{percent}%</div>
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

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <div className="flex items-center justify-between">
          <Link to={`/scenarios/${id}`} className="text-sm text-accent">← {scenario.title}</Link>
          <span className="text-sm text-tone6 tabular-nums">{index + 1} / {questions.length}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all"
            style={{ width: `${(index / questions.length) * 100}%` }}
          />
        </div>
      </header>

      <QuestionView key={index} question={questions[index]} onAnswer={onAnswer} />
    </div>
  );
}
