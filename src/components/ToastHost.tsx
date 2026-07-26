import { useEffect, useState } from 'react';
import { TOAST_EVENT_NAME } from '../lib/audio';

interface Toast {
  id: number;
  message: string;
}

let counter = 0;

/** Listens for `jyut-toast` window events and renders transient toasts. */
export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const message = (e as CustomEvent<string>).detail;
      const id = ++counter;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
    };
    window.addEventListener(TOAST_EVENT_NAME, onToast);
    return () => window.removeEventListener(TOAST_EVENT_NAME, onToast);
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast rounded-full bg-ink/90 text-paper text-sm px-4 py-2 shadow-card"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
