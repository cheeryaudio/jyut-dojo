import { ArrowCounterClockwise, Check, Ear, PuzzlePiece } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { CantoneseSpeakButton } from "./CantoneseSpeakButton";
import { buildListeningExercises, buildSentencePuzzleExercises } from "../lib/interactiveExercises";
import type { Course } from "../types/course";

export function InteractivePracticePanel({ course }: { course: Course }) {
  const [mode, setMode] = useState<"listening" | "puzzle">("listening");
  const listeningDrills = useMemo(() => buildListeningExercises(course, 6), [course]);
  const puzzleDrills = useMemo(() => buildSentencePuzzleExercises(course, 6), [course]);

  const [listeningChoices, setListeningChoices] = useState<Record<string, string>>({});
  const [puzzleSelections, setPuzzleSelections] = useState<Record<string, number[]>>({});

  return (
    <div className="interactive-practice-panel">
      <div className="interactive-mode-tabs" role="tablist" aria-label="互动练习题型">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "listening"}
          className={mode === "listening" ? "active" : ""}
          onClick={() => setMode("listening")}
        >
          <Ear size={17} /> 盲听辨句 ({listeningDrills.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "puzzle"}
          className={mode === "puzzle" ? "active" : ""}
          onClick={() => setMode("puzzle")}
        >
          <PuzzlePiece size={17} /> 粤语词块造句 ({puzzleDrills.length})
        </button>
      </div>

      {mode === "listening" ? (
        <div className="exercise-stack" role="tabpanel" aria-label="盲听辨句">
          {listeningDrills.map((drill, index) => {
            const choice = listeningChoices[drill.id];
            const isCorrect = choice === drill.answer;
            return (
              <article className="exercise-block" key={drill.id}>
                <div className="exercise-label">
                  <span>盲听 {index + 1}</span>
                  <span>听粤语选句意</span>
                </div>
                <div className="listening-prompt-row">
                  <CantoneseSpeakButton text={drill.hanzi} audio={drill.audio} label="播放粤语原句" />
                  <span className="small-label">先听语音，不看文字选出正确意思</span>
                </div>
                <div className="exercise-options">
                  {drill.options.map((option, optIdx) => (
                    <button
                      type="button"
                      key={option}
                      disabled={Boolean(choice)}
                      className={
                        choice
                          ? option === drill.answer
                            ? "correct"
                            : option === choice
                              ? "incorrect"
                              : ""
                          : ""
                      }
                      onClick={() => setListeningChoices(prev => ({ ...prev, [drill.id]: option }))}
                    >
                      <span>{String.fromCharCode(65 + optIdx)}</span>
                      {option}
                      {choice && option === drill.answer && <Check size={18} />}
                    </button>
                  ))}
                </div>
                {choice && (
                  <div className={`exercise-feedback ${isCorrect ? "is-correct" : "is-incorrect"}`} role="status">
                    <strong>{isCorrect ? "听辨正确！" : "再听一次看看"}</strong>
                    <p>原句：{drill.hanzi}（{drill.jyutping}）</p>
                    <button
                      type="button"
                      onClick={() => setListeningChoices(prev => ({ ...prev, [drill.id]: "" }))}
                    >
                      重做这题
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="exercise-stack" role="tabpanel" aria-label="粤语词块造句">
          {puzzleDrills.map((drill, index) => {
            const pickedIndices = puzzleSelections[drill.id] ?? [];
            const assembled = pickedIndices.map(idx => drill.shuffledChunks[idx]).join("");
            const targetJoined = drill.targetChunks.join("");
            const isComplete = pickedIndices.length === drill.shuffledChunks.length;
            const isCorrect = isComplete && assembled === targetJoined;

            const pickChunk = (chunkIdx: number) => {
              if (pickedIndices.includes(chunkIdx)) return;
              setPuzzleSelections(prev => ({ ...prev, [drill.id]: [...pickedIndices, chunkIdx] }));
            };

            const removeChunkAt = (pos: number) => {
              setPuzzleSelections(prev => ({
                ...prev,
                [drill.id]: pickedIndices.filter((_, idx) => idx !== pos),
              }));
            };

            const resetPuzzle = () => {
              setPuzzleSelections(prev => ({ ...prev, [drill.id]: [] }));
            };

            return (
              <article className="exercise-block" key={drill.id}>
                <div className="exercise-label">
                  <span>造句 {index + 1}</span>
                  <span>按粤语语序拼接词块</span>
                </div>
                <h3>{drill.mandarin}</h3>

                <div
                  className={`puzzle-answer-slot ${isComplete ? (isCorrect ? "is-correct" : "is-incorrect") : ""}`}
                  aria-label="已拼出的粤语句子"
                >
                  {pickedIndices.length === 0 ? (
                    <span className="puzzle-placeholder">点击下方词块，按广东话语序拼出整句…</span>
                  ) : (
                    pickedIndices.map((chunkIdx, pos) => (
                      <button
                        type="button"
                        key={`${chunkIdx}-${pos}`}
                        className="puzzle-chip picked"
                        onClick={() => removeChunkAt(pos)}
                        title="点击移除此词块"
                      >
                        {drill.shuffledChunks[chunkIdx]}
                      </button>
                    ))
                  )}
                </div>

                <div className="puzzle-bank" aria-label="可选词块">
                  {drill.shuffledChunks.map((chunk, chunkIdx) => {
                    const used = pickedIndices.includes(chunkIdx);
                    return (
                      <button
                        type="button"
                        key={`${chunk}-${chunkIdx}`}
                        disabled={used}
                        className={`puzzle-chip ${used ? "used" : ""}`}
                        onClick={() => pickChunk(chunkIdx)}
                      >
                        {chunk}
                      </button>
                    );
                  })}
                </div>

                <div className="puzzle-toolbar">
                  <button type="button" className="button-outline puzzle-reset-btn" onClick={resetPuzzle} disabled={pickedIndices.length === 0}>
                    <ArrowCounterClockwise size={15} /> 重新排列
                  </button>
                  <CantoneseSpeakButton text={drill.hanzi} audio={drill.audio} label="听提示发音" />
                </div>

                {isComplete && (
                  <div className={`exercise-feedback ${isCorrect ? "is-correct" : "is-incorrect"}`} role="status">
                    <strong>{isCorrect ? "语序完全正确！" : "语序还差一点"}</strong>
                    <p>标准粤语：{drill.hanzi}（{drill.jyutping}）</p>
                    {!isCorrect && (
                      <button type="button" onClick={resetPuzzle}>
                        清空重拼
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
