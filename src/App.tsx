import { lazy, Suspense } from 'react';
import { AppRoutes, RouteLoadingFallback } from './app/routes';
import { UpdatePrompt } from './app/UpdatePrompt';
import { BottomNav } from './components/BottomNav';
import { ToastHost } from './components/ToastHost';
import { useProgress } from './stores/progress';

const Onboarding = lazy(() =>
  import('./pages/Onboarding').then((module) => ({ default: module.Onboarding }))
);

export default function App() {
  const onboarded = useProgress((state) => state.settings.onboarded);

  // Do not mount the application underneath onboarding: besides confusing
  // screen readers with two page headings, hidden controls could still receive
  // focus and execute against an uninitialized learner profile.
  if (!onboarded) {
    return (
      <div className="min-h-full bg-paper">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Onboarding />
        </Suspense>
        <ToastHost />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-paper">
      <main className="mx-auto max-w-md px-4 pt-5 pb-28">
        <AppRoutes />
      </main>
      <BottomNav />
      <UpdatePrompt />
      <ToastHost />
    </div>
  );
}
