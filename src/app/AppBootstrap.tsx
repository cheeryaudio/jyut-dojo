import { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import App from '../App';
import { initAnalytics } from '../lib/analytics';
import { initSync } from '../lib/sync';
import { useProgress } from '../stores/progress';
import { AppErrorBoundary } from './AppErrorBoundary';

function HydrationShell() {
  return (
    <div className="min-h-full bg-paper px-4 pt-5" role="status" aria-live="polite">
      <div className="mx-auto max-w-md space-y-5 animate-pulse" aria-hidden="true">
        <div className="h-8 w-32 rounded-xl bg-line/70" />
        <div className="card h-36 bg-card/70" />
        <div className="grid grid-cols-2 gap-3">
          <div className="card h-24 bg-card/70" />
          <div className="card h-24 bg-card/70" />
        </div>
      </div>
      <span className="sr-only">正在载入学习进度</span>
    </div>
  );
}

function BootstrapContent() {
  const hasHydrated = useProgress((state) => state.hasHydrated);
  const hydrationError = useProgress((state) => state.hydrationError);

  useEffect(() => {
    if (!hasHydrated) return;

    const cleanups: Array<() => void> = [];
    try {
      cleanups.push(initAnalytics());
      cleanups.push(initSync());
    } catch (error) {
      console.error('Jyut Dojo initialization failed', error);
    }

    return () => {
      for (const cleanup of cleanups.reverse()) cleanup();
    };
  }, [hasHydrated]);

  if (hydrationError) throw new Error('Persisted progress hydration failed');
  if (!hasHydrated) return <HydrationShell />;

  return (
    <HashRouter>
      <App />
    </HashRouter>
  );
}

export function AppBootstrap() {
  return (
    <AppErrorBoundary>
      <BootstrapContent />
    </AppErrorBoundary>
  );
}
