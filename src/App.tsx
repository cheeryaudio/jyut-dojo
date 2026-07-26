import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { ToastHost } from './components/ToastHost';
import { useProgress } from './stores/progress';
import { initAnalytics } from './lib/analytics';
import { initSync } from './lib/sync';
import { Home } from './pages/Home';
import { Path } from './pages/Path';
import { Grammar } from './pages/Grammar';
import { FirstWin } from './pages/FirstWin';
import { ScenarioDetail } from './pages/ScenarioDetail';
import { Quiz } from './pages/Quiz';
import { PinyinLesson } from './pages/PinyinLesson';
import { BasicsDeck } from './pages/BasicsDeck';
import { ToneDojo } from './pages/ToneDojo';
import { ToneIntro } from './pages/ToneIntro';
import { ToneDrill } from './pages/ToneDrill';
import { ToneCompare } from './pages/ToneCompare';
import { Review } from './pages/Review';
import { Progress } from './pages/Progress';
import { Privacy } from './pages/Privacy';
import { About } from './pages/About';
import { Onboarding } from './pages/Onboarding';

export default function App() {
  const onboarded = useProgress((s) => s.settings.onboarded);

  useEffect(() => {
    initAnalytics();
    initSync();
  }, []);

  return (
    <div className="min-h-full bg-paper">
      <main className="mx-auto max-w-md px-4 pt-5 pb-28">
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
      </main>
      <BottomNav />
      <ToastHost />
      {!onboarded && <Onboarding />}
    </div>
  );
}
