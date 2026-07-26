import { useEffect, useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { track } from '../lib/analytics';
import { toast } from '../lib/audio';
import { UI } from '../lib/ui';

export interface ReportTarget {
  refType: 'sentence' | 'word';
  refId: string;
}

interface Props {
  open: boolean;
  target: ReportTarget | null;
  onClose: () => void;
}

type Reason = 'pron' | 'translation' | 'other';

const REASONS: { value: Reason; label: string }[] = [
  { value: 'pron', label: UI.report_reasonPron },
  { value: 'translation', label: UI.report_reasonTrans },
  { value: 'other', label: UI.report_reasonOther },
];

/** Tiny 报错 sheet: pick a reason (+ optional note), fires a `report` analytics event. */
export function ReportSheet({ open, target, onClose }: Props) {
  const [reason, setReason] = useState<Reason>('pron');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setReason('pron');
      setNote('');
    }
  }, [open]);

  const submit = () => {
    if (target) {
      const props: Record<string, string> = {
        refType: target.refType,
        refId: target.refId,
        reason,
      };
      if (note.trim()) props.note = note.trim().slice(0, 200);
      track('report', props);
    }
    toast(UI.report_thanks);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={UI.report_title}>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-tone6">{UI.report_reasonLabel}</div>
          <div className="grid grid-cols-3 gap-2">
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                className={`rounded-xl border py-2.5 text-sm transition ${
                  reason === r.value
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line text-tone6'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="text-sm text-tone6">{UI.report_noteLabel}</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={UI.report_notePlaceholder}
            rows={2}
            maxLength={200}
            className="w-full rounded-2xl border border-line bg-card px-4 py-2.5 text-ink outline-none focus:border-accent resize-none"
          />
        </div>
        <button type="button" onClick={submit} className="btn-primary w-full">
          {UI.report_submit}
        </button>
      </div>
    </BottomSheet>
  );
}
