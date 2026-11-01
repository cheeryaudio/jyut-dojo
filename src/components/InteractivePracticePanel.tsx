import { ArrowCounterClockwise, Check, Ear, PuzzlePiece } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { CantoneseSpeakButton } from "./CantoneseSpeakButton";
import { buildListeningExercises, buildSentencePuzzleExercises } from "../lib/interactiveExercises";
import { useCourseStore } from "../stores/courseStore";
import type { Course } from "../types/course";

export function InteractivePracticePanel({ course }: { course: Course }) {
  const [mode, setMode] = useState<"listening" | "puzzle">("listening");
  const [showChipJyutping, setShowChipJyutping] = useState(true);
  const listeningDrills = useMemo(() => buildListeningExercises(course, 6), [course]);
  const puzzleDrills = useMemo(() => buildSentencePuzzleExercises(course, 6), [course]);

  const { drillResults, recordDrillResult, clearDrillResult, recordPhraseReview } = useCourseStore();
  const [puzzleSelections, setPuzzleSelections] = useState<Record<string, number[]>>({});

  return (
    <div className="interactive-practice-panel">
      <div className="interactive-header-row">
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
        {mode === "puzzle" && (
          <div className="reading-toggles">
            <button
              type="button"
              aria-pressed={showChipJyutping}
              onClick={() => setShowChipJyutping(v => !v)}
            >
              词块粤拼 {showChipJyutping ? "开" : "关"}
            </button>
          </div>
        )}
      </div>

      {mode === "listening" ? (
        <div className="exercise-stack" role="tabpanel" aria-label="盲听辨句">
          {listeningDrills.map((drill, index) => {
            const savedAttempt = drillResults[drill.id];
            const choice = savedAttempt?.answer ?? "";
            const isCorrect = choice === drill.answer;

            const chooseOption = (option: string) => {
              const correct = option === drill.answer;
              void recordDrillResult({
                drillId: drill.id,
                courseId: course.id,
                phraseId: drill.phraseId,
                kind: "listening",
                correct,
                answer: option,
              });
              void recordPhraseReview(drill.phraseId, correct ? "good" : "again");
            };

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
                      onClick={() => chooseOption(option)}
                    >
                      <span>{String.fromCharCode(65 + optIdx)}</span>
                      {option}
                      {choice && option === drill.answer && <Check size={18} />}
                    </button>
                  ))}
                </div>
                {choice && (
                  <div className={`exercise-feedback ${isCorrect ? "is-correct" : "is-incorrect"}`} role="status">
                    <strong>{isCorrect ? "听辨正确！（已同步 FSRS 温习记录）" : "答案不正确（已加入今日需再练）"}</strong>
                    <p>原句：{drill.hanzi}（{drill.jyutping}）</p>
                    <button
                      type="button"
                      onClick={() => void clearDrillResult(drill.id)}
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
            const savedAttempt = drillResults[drill.id];
            const pickedIndices = puzzleSelections[drill.id] ?? (() => {
              if (!savedAttempt?.correct) return [];
              const used = new Set<number>();
              return drill.targetChunks
                .map(targetText => {
                  const idx = drill.shuffledChunks.findIndex((chunk, i) => chunk === targetText && !used.has(i));
                  if (idx >= 0) used.add(idx);
                  return idx;
                })
                .filter(i => i >= 0);
            })();
            const assembled = pickedIndices.map(idx => drill.shuffledChunks[idx]).join("");
            const targetJoined = drill.targetChunks.join("");
            const isComplete = pickedIndices.length === drill.shuffledChunks.length || Boolean(savedAttempt);
            const finalAnswer = pickedIndices.length === drill.shuffledChunks.length ? assembled : (savedAttempt?.answer ?? assembled);
            const isCorrect = isComplete && finalAnswer === targetJoined;

            const pickChunk = (chunkIdx: number) => {
              if (pickedIndices.includes(chunkIdx)) return;
              const nextPicked = [...pickedIndices, chunkIdx];
              setPuzzleSelections(prev => ({ ...prev, [drill.id]: nextPicked }));
              if (nextPicked.length === drill.shuffledChunks.length) {
                const candidate = nextPicked.map(idx => drill.shuffledChunks[idx]).join("");
                const correct = candidate === targetJoined;
                void recordDrillResult({
                  drillId: drill.id,
                  courseId: course.id,
                  phraseId: drill.phraseId,
                  kind: "puzzle",
                  correct,
                  answer: candidate,
                });
                void recordPhraseReview(drill.phraseId, correct ? "good" : "again");
              }
            };

            const removeChunkAt = (pos: number) => {
              if (savedAttempt) void clearDrillResult(drill.id);
              setPuzzleSelections(prev => ({
                ...prev,
                [drill.id]: pickedIndices.filter((_, idx) => idx !== pos),
              }));
            };

            const resetPuzzle = () => {
              if (savedAttempt) void clearDrillResult(drill.id);
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
                    pickedIndices.map((chunkIdx, pos) => {
                      const token = drill.shuffledTokens[chunkIdx];
                      return (
                        <button
                          type="button"
                          key={`${chunkIdx}-${pos}`}
                          className="puzzle-chip picked"
                          onClick={() => removeChunkAt(pos)}
                          title="点击移除此词块"
                        >
                          <span>{token?.text ?? drill.shuffledChunks[chunkIdx]}</span>
                          {showChipJyutping && token?.jyutping && <small>{token.jyutping}</small>}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="puzzle-bank" aria-label="可选词块">
                  {drill.shuffledTokens.map((token, chunkIdx) => {
                    const used = pickedIndices.includes(chunkIdx);
                    return (
                      <button
                        type="button"
                        key={`${token.text}-${chunkIdx}`}
                        disabled={used}
                        className={`puzzle-chip ${used ? "used" : ""}`}
                        onClick={() => pickChunk(chunkIdx)}
                      >
                        <span>{token.text}</span>
                        {showChipJyutping && token.jyutping && <small>{token.jyutping}</small>}
                      </button>
                    );
                  })}
                </div>

                <div className="puzzle-toolbar">
                  <button type="button" className="button-outline puzzle-reset-btn" onClick={resetPuzzle} disabled={pickedIndices.length === 0 && !savedAttempt}>
                    <ArrowCounterClockwise size={15} /> 重新排列
                  </button>
                  <CantoneseSpeakButton text={drill.hanzi} audio={drill.audio} label="听提示发音" />
                </div>

                {isComplete && (
                  <div className={`exercise-feedback ${isCorrect ? "is-correct" : "is-incorrect"}`} role="status">
                    <strong>{isCorrect ? "语序完全正确！（已同步 FSRS 温习记录）" : "语序还差一点（已加入今日需再练）"}</strong>
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
