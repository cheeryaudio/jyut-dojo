import { type ReactNode, useEffect } from 'react';
import { CloseIcon } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden />
      <div className="animate-sheet relative w-full max-w-md rounded-t-2xl bg-card border border-line shadow-card safe-bottom">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="h-1 w-10 rounded-full bg-line mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          <h3 className="text-base font-medium text-ink">{title}</h3>
          <button type="button" aria-label="关闭" onClick={onClose} className="text-tone6 p-1">
            <CloseIcon />
          </button>
        </div>
        <div className="px-5 pb-6 pt-1">{children}</div>
      </div>
    </div>
  );
}
