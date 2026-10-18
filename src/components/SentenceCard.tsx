import { CaretDown } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { playStaticAudio } from "../lib/audio/player";
import { wordById } from "../data";
import type { Sentence, Word } from "../types/domain";
import { AudioButton } from "./AudioButton";
import { WordSheet } from "./WordSheet";

interface SentenceCardProps {
  sentence: Sentence;
  index: number;
}

interface CharacterToken {
  character: string;
  word: Word | null;
  key: string;
}

const punctuation = new Set(["，", "。", "！", "？", ",", ".", "!", "?"]);

export function SentenceCard({ sentence, index }: SentenceCardProps) {
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const tokens = useMemo<CharacterToken[]>(() => {
    const linkedCharacters = sentence.words.flatMap((wordId) => {
      const word = wordById.get(wordId);
      if (word === undefined) return [];
      return Array.from(word.hanzi).map((character) => ({ character, word }));
    });
    let linkedIndex = 0;
    return Array.from(sentence.hanzi).map((character, characterIndex) => {
      if (punctuation.has(character)) return { character, word: null, key: `punctuation-${characterIndex}` };
      const linked = linkedCharacters[linkedIndex];
      linkedIndex += 1;
      return {
        character,
        word: linked?.word ?? null,
        key: `${linked?.word.id ?? "unknown"}-${characterIndex}`,
      };
    });
  }, [sentence]);

  return (
    <>
      <article
        className="rounded-2xl border border-stone-200 bg-stone-50 p-5 transition hover:border-ember/50 dark:border-stone-800 dark:bg-stone-900"
        onClick={() => void playStaticAudio(sentence.audio).catch(() => undefined)}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-jyutping text-xs font-bold text-stone-400">{String(index + 1).padStart(2, "0")}</span>
          <AudioButton path={sentence.audio} label="播放句子" compact />
        </div>
        <div className="mt-4 flex flex-wrap text-3xl font-semibold leading-relaxed tracking-tight sm:text-4xl" aria-label={sentence.hanzi}>
          {tokens.map((token) =>
            token.word === null ? (
              <span key={token.key}>{token.character}</span>
            ) : (
              <span
                key={token.key}
                role="button"
                tabIndex={0}
                className="cursor-pointer rounded-lg px-0.5 transition hover:bg-sky-100 hover:text-ember-dark focus:bg-sky-100 dark:hover:bg-sky-950/50 dark:focus:bg-sky-950/50"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedWord(token.word);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedWord(token.word);
                  }
                }}
              >
                {token.character}
              </span>
            ),
          )}
        </div>
        <p className="mt-3 font-jyutping text-sm leading-relaxed text-ember-dark dark:text-sky-300">{sentence.jyutping}</p>
        <details className="group mt-5 border-t border-stone-200 pt-4 dark:border-stone-700" onClick={(event) => event.stopPropagation()}>
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-stone-500 dark:text-stone-300">
            <span>睇普通話意思</span>
            <CaretDown className="transition group-open:rotate-180" size={17} weight="bold" />
          </summary>
          <p className="mt-3 text-base text-stone-700 dark:text-stone-200">{sentence.mandarin}</p>
        </details>
      </article>
      {selectedWord !== null && <WordSheet word={selectedWord} onClose={() => setSelectedWord(null)} />}
    </>
  );
}
