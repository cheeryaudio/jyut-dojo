import { useMemo, useState } from 'react';
import { shuffle } from '../domain/exercises/random';

interface Chip {
  /** stable identity so repeated syllables stay individually removable */
  cid: number;
  syllable: string;
}

interface SyllableArrangerProps {
  /** the correct syllable order; chips are shuffled from this list */
  target: readonly string[];
  /** freeze the tray once the answer has been checked */
  locked: boolean;
  /** called with the current answer whenever the tray changes */
  onChange: (placed: string[]) => void;
  placeholder?: string;
}

/**
 * Shared chip tray used by 排序 and 聽寫 questions (quiz and 錯題重練).
 * Owns chip identity and the pool/tray split; the caller owns grading.
 */
export function SyllableArranger({ target, locked, onChange, placeholder }: SyllableArrangerProps) {
  const initial = useMemo<Chip[]>(
    () => shuffle(target.map((syllable, index) => ({ cid: index, syllable }))),
    [target]
  );
  const [pool, setPool] = useState<Chip[]>(initial);
  const [placed, setPlaced] = useState<Chip[]>([]);

  const commit = (next: Chip[]) => {
    setPlaced(next);
    onChange(next.map((chip) => chip.syllable));
  };

  const place = (chip: Chip) => {
    if (locked) return;
    setPool((current) => current.filter((item) => item.cid !== chip.cid));
    commit([...placed, chip]);
  };

  const remove = (chip: Chip) => {
    if (locked) return;
    setPool((current) => [...current, chip]);
    commit(placed.filter((item) => item.cid !== chip.cid));
  };

  return (
    <>
      <div className="min-h-[52px] flex flex-wrap gap-2 rounded-2xl border border-dashed border-line p-2.5">
        {placed.length === 0 && placeholder && (
          <span className="text-sm text-tone6 self-center px-1">{placeholder}</span>
        )}
        {placed.map((chip) => (
          <button
            key={chip.cid}
            type="button"
            disabled={locked}
            onClick={() => remove(chip)}
            className="rounded-xl bg-accent-soft px-3 py-2 font-mono text-sm text-accent"
          >
            {chip.syllable}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {pool.map((chip) => (
          <button
            key={chip.cid}
            type="button"
            disabled={locked}
            onClick={() => place(chip)}
            className="rounded-xl border border-line bg-card px-3 py-2 font-mono text-sm active:scale-95"
          >
            {chip.syllable}
          </button>
        ))}
      </div>
    </>
  );
}
