import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { UI } from '../lib/ui';

const Home = lazy(() => import('../pages/Home').then((module) => ({ default: module.Home })));
const Path = lazy(() => import('../pages/Path').then((module) => ({ default: module.Path })));
const Grammar = lazy(() => import('../pages/Grammar').then((module) => ({ default: module.Grammar })));
const FirstWin = lazy(() => import('../pages/FirstWin').then((module) => ({ default: module.FirstWin })));
const ScenarioDetail = lazy(() =>
  import('../pages/ScenarioDetail').then((module) => ({ default: module.ScenarioDetail }))
);
const Quiz = lazy(() => import('../pages/Quiz').then((module) => ({ default: module.Quiz })));
const PinyinLesson = lazy(() =>
  import('../pages/PinyinLesson').then((module) => ({ default: module.PinyinLesson }))
);
const BasicsDeck = lazy(() =>
  import('../pages/BasicsDeck').then((module) => ({ default: module.BasicsDeck }))
);
const ToneDojo = lazy(() => import('../pages/ToneDojo').then((module) => ({ default: module.ToneDojo })));
const ToneIntro = lazy(() => import('../pages/ToneIntro').then((module) => ({ default: module.ToneIntro })));
const ToneDrill = lazy(() => import('../pages/ToneDrill').then((module) => ({ default: module.ToneDrill })));
const ToneCompare = lazy(() =>
  import('../pages/ToneCompare').then((module) => ({ default: module.ToneCompare }))
);
const Review = lazy(() => import('../pages/Review').then((module) => ({ default: module.Review })));
const Progress = lazy(() => import('../pages/Progress').then((module) => ({ default: module.Progress })));
const Privacy = lazy(() => import('../pages/Privacy').then((module) => ({ default: module.Privacy })));
const About = lazy(() => import('../pages/About').then((module) => ({ default: module.About })));

export function RouteLoadingFallback() {
  return (
    <div className="card flex min-h-32 items-center justify-center p-6" role="status" aria-live="polite">
      <span className="text-sm text-tone6">{UI.app_loading}</span>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/path" element={<Path />} />
        <Route path="/grammar" element={<Grammar />} />
        <Route path="/firstwin" element={<FirstWin />} />
        {/* the flat 情景 list is gone — reach scenarios from the path */}
        <Route path="/scenarios" element={<Navigate to="/path" replace />} />
        <Route path="/scenarios/:id" element={<ScenarioDetail />} />
        <Route path="/scenarios/:id/quiz" element={<Quiz />} />
        <Route path="/pinyin/:ref" element={<PinyinLesson />} />
        <Route path="/basics/:id" element={<BasicsDeck />} />
        <Route path="/tones" element={<ToneDojo />} />
        <Route path="/tones/intro" element={<ToneIntro />} />
        <Route path="/tones/drill" element={<ToneDrill />} />
        <Route path="/tones/compare" element={<ToneCompare />} />
        <Route path="/review" element={<Review />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
