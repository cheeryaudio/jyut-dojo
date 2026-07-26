import pathJson from '../data/path.json';
import type { PathData, PathStage, PathUnit } from '../types';

/** Stage the grammar (句型) unit is appended to, and the unit itself. */
export const GRAMMAR_STAGE_ID = 'stage1';
export const GRAMMAR_UNIT: PathUnit = { type: 'grammar', ref: 'grammar', title: '句型', emoji: '📐' };

/**
 * path.json is frozen, so the grammar unit is injected at module load as the
 * last unit of stage1 (基礎詞彙). Everything downstream (computePath, Path.tsx,
 * Home's "next" CTA) sees it as a normal path unit.
 */
function injectGrammar(data: PathData): PathData {
  return {
    stages: data.stages.map((st) =>
      st.id === GRAMMAR_STAGE_ID ? { ...st, units: [...st.units, GRAMMAR_UNIT] } : st
    ),
  };
}

export const pathData = injectGrammar(pathJson as unknown as PathData);

/** Fraction of the previous stage that must be completed to open the next. */
export const STAGE_UNLOCK_RATIO = 0.6;
/** Tone drill must reach this level once to count its unit complete. */
export const TONEDRILL_UNLOCK_LEVEL = 3;

export type UnitStatus = 'done' | 'current' | 'locked';

/** Everything the pure unlock logic needs from the persisted progress store. */
export interface PathProgress {
  learnedScenarios: string[];
  pinyinDone: string[];
  basicsLearned: string[];
  tonesIntroVisited: boolean;
  grammarVisited: boolean;
  tonedrillBest: number;
  /** onboarding hint: the stage the learner said they can start near */
  recommendedStage: string;
}

export interface UnitState {
  stageId: string;
  unit: PathUnit;
  status: UnitStatus;
}

export interface StageState {
  stage: PathStage;
  units: UnitState[];
  /** completed / total for this stage */
  ratio: number;
}

/** Stable key for a unit (used for pulse / routing / dedupe). */
export function unitKey(u: PathUnit): string {
  return `${u.type}:${u.ref}`;
}

/** Has this single unit met its completion bar? Pure. */
export function isUnitCompleted(unit: PathUnit, p: PathProgress): boolean {
  switch (unit.type) {
    case 'tones':
      return p.tonesIntroVisited;
    case 'pinyin':
      return p.pinyinDone.includes(unit.ref);
    case 'tonedrill':
      return p.tonedrillBest >= TONEDRILL_UNLOCK_LEVEL;
    case 'basics':
      return p.basicsLearned.includes(unit.ref);
    case 'scenario':
      return p.learnedScenarios.includes(unit.ref);
    case 'grammar':
      return p.grammarVisited;
  }
}

function stageRatio(stage: PathStage, p: PathProgress): number {
  if (stage.units.length === 0) return 1;
  const done = stage.units.filter((u) => isUnitCompleted(u, p)).length;
  return done / stage.units.length;
}

/**
 * Compute the done/current/locked state of every unit on the path.
 *
 * Rules:
 *  - a unit unlocks once the unit before it (in the same stage) is completed;
 *  - the first unit of a stage unlocks once the previous stage is ≥60% complete
 *    (stage 0's first unit is always open);
 *  - a completed unit is always `done`, an unlocked-but-unfinished unit is
 *    `current`, otherwise `locked`.
 *
 * Onboarding placement: when the learner said 識少少 (recommendedStage past the
 * pronunciation/vocab stages), every stage *before* the recommended one is
 * "soft-passed" — its units are treated as satisfied FOR UNLOCK PURPOSES only,
 * so survival scenarios open up. Soft-passed units are NOT marked `done`
 * (no stars, no "completed"): they stay `current` until actually finished.
 */
export function computePath(p: PathProgress, data: PathData = pathData): StageState[] {
  const recIdx = data.stages.findIndex((s) => s.id === p.recommendedStage);

  return data.stages.map((stage, si) => {
    // stages strictly before the recommended start are unlocked for free
    const softThisStage = recIdx > 0 && si < recIdx;
    const prevSoftPassed = recIdx > 0 && si - 1 < recIdx;
    const prevOpen =
      si === 0
        ? true
        : prevSoftPassed || stageRatio(data.stages[si - 1], p) >= STAGE_UNLOCK_RATIO;

    const units: UnitState[] = stage.units.map((unit, ui) => {
      const completed = isUnitCompleted(unit, p);
      let status: UnitStatus;
      if (completed) {
        status = 'done';
      } else {
        const unlocked =
          softThisStage || (ui === 0 ? prevOpen : isUnitCompleted(stage.units[ui - 1], p));
        status = unlocked ? 'current' : 'locked';
      }
      return { stageId: stage.id, unit, status };
    });
    return { stage, units, ratio: stageRatio(stage, p) };
  });
}

/**
 * Is a given path unit currently reachable (not `locked`)? Used to guard
 * deep-links into gated unit routes. Units not present on the path (unknown
 * refs) are treated as reachable so non-path content is never blocked.
 */
export function isUnitUnlocked(
  p: PathProgress,
  type: PathUnit['type'],
  ref: string,
  data: PathData = pathData
): boolean {
  for (const st of computePath(p, data)) {
    for (const u of st.units) {
      if (u.unit.type === type && u.unit.ref === ref) return u.status !== 'locked';
    }
  }
  return true;
}

/** Route a unit tap to the right screen. */
export function unitRoute(u: PathUnit): string {
  switch (u.type) {
    case 'tones':
      return '/tones/intro';
    case 'tonedrill':
      return '/tones/drill';
    case 'pinyin':
      return `/pinyin/${u.ref}`;
    case 'basics':
      return `/basics/${u.ref}`;
    case 'scenario':
      return `/scenarios/${u.ref}`;
    case 'grammar':
      return '/grammar';
  }
}
