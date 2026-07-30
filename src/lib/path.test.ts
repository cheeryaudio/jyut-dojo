import { describe, it, expect } from 'vitest';
import {
  computePath,
  isUnitCompleted,
  isUnitUnlocked,
  unitKey,
  unitRoute,
  pathData,
  GRAMMAR_UNIT,
  GRAMMAR_STAGE_ID,
  type PathProgress,
} from './path';
import type { PathData, PathUnit } from '../types';

const EMPTY: PathProgress = {
  learnedScenarios: [],
  pinyinDone: [],
  basicsLearned: [],
  tonesIntroVisited: false,
  grammarVisited: false,
  tonedrillBest: 0,
  recommendedStage: 'stage0',
};

const DATA: PathData = {
  stages: [
    {
      id: 's0',
      title: 'A',
      subtitle: '',
      units: [
        { type: 'tones', ref: 'intro', title: '', emoji: '' },
        { type: 'pinyin', ref: 'initials', title: '', emoji: '' },
        { type: 'tonedrill', ref: 'drill', title: '', emoji: '' },
      ],
    },
    {
      id: 's1',
      title: 'B',
      subtitle: '',
      units: [
        { type: 'basics', ref: 'numbers', title: '', emoji: '' },
        { type: 'scenario', ref: 'greet', title: '', emoji: '' },
      ],
    },
  ],
};

describe('isUnitCompleted', () => {
  const u = (type: PathUnit['type'], ref: string): PathUnit => ({ type, ref, title: '', emoji: '' });
  it('tones needs intro visited', () => {
    expect(isUnitCompleted(u('tones', 'intro'), EMPTY)).toBe(false);
    expect(isUnitCompleted(u('tones', 'intro'), { ...EMPTY, tonesIntroVisited: true })).toBe(true);
  });
  it('tonedrill needs level >= 3', () => {
    expect(isUnitCompleted(u('tonedrill', 'drill'), { ...EMPTY, tonedrillBest: 2 })).toBe(false);
    expect(isUnitCompleted(u('tonedrill', 'drill'), { ...EMPTY, tonedrillBest: 3 })).toBe(true);
  });
  it('pinyin/basics/scenario match by ref membership', () => {
    expect(isUnitCompleted(u('pinyin', 'initials'), { ...EMPTY, pinyinDone: ['initials'] })).toBe(true);
    expect(isUnitCompleted(u('basics', 'numbers'), { ...EMPTY, basicsLearned: ['numbers'] })).toBe(true);
    expect(isUnitCompleted(u('scenario', 'greet'), { ...EMPTY, learnedScenarios: ['greet'] })).toBe(true);
  });
});

describe('computePath — unlocking', () => {
  it('opens only the first unit for a fresh user', () => {
    const [s0, s1] = computePath(EMPTY, DATA);
    expect(s0.units.map((u) => u.status)).toEqual(['current', 'locked', 'locked']);
    // stage 1 locked: previous stage 0% < 60%
    expect(s1.units.map((u) => u.status)).toEqual(['locked', 'locked']);
  });

  it('completing a unit unlocks the next in the stage', () => {
    const [s0] = computePath({ ...EMPTY, tonesIntroVisited: true }, DATA);
    expect(s0.units.map((u) => u.status)).toEqual(['done', 'current', 'locked']);
  });

  it('opens next stage once previous is ≥60% complete', () => {
    // 2 of 3 units in stage 0 done = 66% ≥ 60%
    const p: PathProgress = { ...EMPTY, tonesIntroVisited: true, pinyinDone: ['initials'] };
    const [, s1] = computePath(p, DATA);
    expect(s1.units[0].status).toBe('current');
    expect(s1.units[1].status).toBe('locked');
  });

  it('keeps next stage locked below the 60% threshold', () => {
    // 1 of 3 = 33% < 60%
    const [, s1] = computePath({ ...EMPTY, tonesIntroVisited: true }, DATA);
    expect(s1.units[0].status).toBe('locked');
  });

  it('reports stage completion ratio', () => {
    const [s0] = computePath({ ...EMPTY, tonesIntroVisited: true }, DATA);
    expect(s0.ratio).toBeCloseTo(1 / 3);
  });
});

describe('helpers', () => {
  it('unitKey is type:ref', () => {
    expect(unitKey({ type: 'pinyin', ref: 'finals', title: '', emoji: '' })).toBe('pinyin:finals');
  });
  it('unitRoute maps each type', () => {
    expect(unitRoute({ type: 'tones', ref: 'intro', title: '', emoji: '' })).toBe('/tones/intro');
    expect(unitRoute({ type: 'tonedrill', ref: 'drill', title: '', emoji: '' })).toBe('/tones/drill');
    expect(unitRoute({ type: 'pinyin', ref: 'finals', title: '', emoji: '' })).toBe('/pinyin/finals');
    expect(unitRoute({ type: 'basics', ref: 'time', title: '', emoji: '' })).toBe('/basics/time');
    expect(unitRoute({ type: 'scenario', ref: 'cafe', title: '', emoji: '' })).toBe('/scenarios/cafe');
    expect(unitRoute({ type: 'grammar', ref: 'grammar', title: '', emoji: '' })).toBe('/grammar');
  });
});

describe('grammar unit source data', () => {
  it('stores the grammar unit as the last unit of stage1', () => {
    const stage1 = pathData.stages.find((s) => s.id === GRAMMAR_STAGE_ID);
    expect(stage1).toBeDefined();
    const last = stage1!.units[stage1!.units.length - 1];
    expect(last).toEqual(GRAMMAR_UNIT);
    // only injected once
    expect(stage1!.units.filter((u) => u.type === 'grammar')).toHaveLength(1);
  });

  it('isUnitCompleted(grammar) tracks grammarVisited', () => {
    expect(isUnitCompleted(GRAMMAR_UNIT, EMPTY)).toBe(false);
    expect(isUnitCompleted(GRAMMAR_UNIT, { ...EMPTY, grammarVisited: true })).toBe(true);
  });

  it('grammar unit is completed on the rendered path once visited', () => {
    const stages = computePath({ ...EMPTY, grammarVisited: true });
    const grammar = stages
      .flatMap((s) => s.units)
      .find((u) => u.unit.type === 'grammar');
    expect(grammar?.status).toBe('done');
  });
});

describe('onboarding placement — recommendedStage soft-unlock', () => {
  it('opens survival scenarios for a 識少少 learner without marking prior stages done', () => {
    const stages = computePath({ ...EMPTY, recommendedStage: 'stage2' });
    const byId = new Map(stages.map((s) => [s.stage.id, s]));

    // stage2 (生存粵語) first scenario is unlocked (current), not locked
    expect(byId.get('stage2')!.units[0].status).toBe('current');
    // but earlier stages are NOT auto-completed — just unlocked (soft), never done
    expect(byId.get('stage0')!.units.every((u) => u.status !== 'done')).toBe(true);
    expect(byId.get('stage1')!.units.every((u) => u.status !== 'done')).toBe(true);
    expect(byId.get('stage0')!.units.every((u) => u.status !== 'locked')).toBe(true);
    // stage3 stays locked — only stages before the recommended one are soft-passed
    expect(byId.get('stage3')!.units[0].status).toBe('locked');
  });

  it('isUnitUnlocked reflects the soft-unlock for deep-links', () => {
    expect(isUnitUnlocked({ ...EMPTY, recommendedStage: 'stage0' }, 'scenario', 'greet')).toBe(false);
    expect(isUnitUnlocked({ ...EMPTY, recommendedStage: 'stage2' }, 'scenario', 'greet')).toBe(true);
    // unknown ref is never blocked
    expect(isUnitUnlocked(EMPTY, 'scenario', 'does-not-exist')).toBe(true);
  });

  it('default recommendedStage=stage0 leaves the fresh-user gating intact', () => {
    const stages = computePath(EMPTY);
    expect(stages[0].units[0].status).toBe('current');
    expect(stages[0].units[1].status).toBe('locked');
    expect(stages[2].units[0].status).toBe('locked');
  });
});
