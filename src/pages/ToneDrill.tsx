import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  drawTone,
  initDrillState,
  levelTones,
  nextLevel,
  MAX_LEVEL,
  STREAK_TO_ADVANCE,
  type DrillState,
} from '../lib/adaptive';
import { tonesets } from '../lib/data';
import { toneColor, TONE_LABELS } from '../lib/tones';
import { ToneContour } from '../components/ToneContour';
import { PlayButton } from '../components/PlayButton';
import { playAudio, toast } from '../lib/audio';
import { track } from '../lib/analytics';
import { useProgress } from '../stores/progress';
import { UI } from '../lib/ui';
import type { ToneItem, ToneSet } from '../types';

interface Question {
  set: ToneSet;
  item: ToneItem;
  target: number;
  candidates: number[];
}

function randInt(n: number): number {
  return Math.floor(Math.random() * n);
}

function makeQuestion(state: DrillState): Question {
  const target = drawTone(state);
  let candidates = levelTones(state.level);
  if (!candidates.includes(target)) candidates = [...candidates, target];
  candidates = [...new Set(candidates)].sort((a, b) => a - b);
  const set = tonesets[randInt(tonesets.length)];
  const item = set.items.find((i) => i.tone === target) ?? set.items[0];
  return { set, item, target, candidates };
}

export function ToneDrill() {
  const [drill, setDrill] = useState<DrillState>(initDrillState);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(initDrillState()));
  const [picked, setPicked] = useState<number | null>(null);
  const recordToneAnswer = useProgress((s) => s.recordToneAnswer);
  const recordToneDrillLevel = useProgress((s) => s.recordToneDrillLevel);
  const recordWrong = useProgress((s) => s.recordWrong);
  const drillRef = useRef(drill);
  drillRef.current = drill;

  useEffect(() => {
    void playAudio(question.item.audio);
  }, [question]);

  const answered = picked !== null;
  const correct = picked === question.target;

  const onPick = (tone: number) => {
    if (answered) return;
    setPicked(tone);
    const isRight = tone === question.target;
    recordToneAnswer(question.set.syllable, question.target, tone);
    track('tone_answer', { actual: question.target, picked: tone, correct: isRight });
    if (!isRight) {
      recordWrong('tonedrill', question.set.syllable, {
        kind: 'tonedrill',
        toneSet: question.set.syllable,
        actual: question.target,
      });
    }
    const before = drillRef.current;
    const after = nextLevel(before, isRight, { actual: question.target, picked: tone });
    if (after.level > before.level) {
      toast(UI.drill_levelUpToast(after.level));
      recordToneDrillLevel(after.level);
    }
    setDrill(after);
  };

  const onNext = () => {
    setQuestion(makeQuestion(drillRef.current));
    setPicked(null);
  };

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <Link to="/tones" className="text-sm text-accent">{UI.drill_back}</Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="hero-han text-2xl font-bold text-ink">{UI.drill_title}</h1>
          <span className="rounded-full bg-accent-soft text-accent text-sm font-medium px-3 py-1">
            L{drill.level}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: STREAK_TO_ADVANCE }, (_, i) => (
              <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < drill.streak ? 'bg-accent' : 'bg-line'}`} />
            ))}
          </div>
          <span className="text-xs text-tone6">
            {UI.drill_streak(drill.streak, STREAK_TO_ADVANCE)}
            {drill.level >= MAX_LEVEL ? UI.drill_maxLevel : UI.drill_levelUp}
          </span>
        </div>
      </header>

      <div className="card p-6 text-center space-y-3">
        <p className="text-sm text-tone6">{UI.drill_prompt}</p>
        <PlayButton audio={question.item.audio} label="再聽" variant="replay" size={24} className="mx-auto" />
        {drill.reinforce.length > 0 && (
          <p className="text-[11px] text-accent">{UI.drill_reinforce}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {question.candidates.map((tone) => {
          const item = question.set.items.find((i) => i.tone === tone);
          const state = !answered ? '' : tone === question.target ? 'ok' : tone === picked ? 'bad' : 'dim';
          return (
            <button
              key={tone}
              type="button"
              disabled={answered}
              onClick={() => onPick(tone)}
              className={`card p-3 flex flex-col items-center gap-1 transition ${
                state === 'ok' ? '!border-tone3 bg-tone3/5' : state === 'bad' ? '!border-tone1 bg-tone1/5' : state === 'dim' ? 'opacity-40' : 'active:scale-95'
              }`}
            >
              <ToneContour tone={tone} size={64} strokeWidth={3} />
              <span className="text-sm font-medium" style={{ color: toneColor(tone) }}>{UI.drill_toneN(tone)}</span>
              <span className="text-[10px] text-tone6">{TONE_LABELS[tone]}</span>
              {answered && item && (
                <span className="hero-han text-lg" style={{ color: toneColor(tone) }}>{item.hanzi}</span>
              )}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="space-y-3">
          <div className={`text-center font-medium ${correct ? 'text-tone3' : 'text-tone1'}`}>
            {correct ? UI.drill_right : UI.drill_wrong(question.target, question.item.hanzi)}
          </div>
          <button type="button" onClick={onNext} className="btn-primary w-full">{UI.drill_next}</button>
        </div>
      )}
    </div>
  );
}
