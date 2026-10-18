import type { CapabilitySummary, LearningEvent, LessonStepId, UnitMastery } from "../types/learning";

export const LESSON_STEPS: LessonStepId[] = ["diagnose", "input", "breakdown", "practice", "output", "transfer", "delayed"];

export const nextLessonStepIndex = (stepId: LessonStepId): number => Math.min(LESSON_STEPS.length - 1, LESSON_STEPS.indexOf(stepId) + 1);

const recencyWeight = (index: number, total: number): number => 0.65 + 0.35 * ((index + 1) / Math.max(1, total));

export const calculateUnitMastery = (events: LearningEvent[], unitId: string): UnitMastery => {
  const relevant = events.filter((event) => event.unitId === unitId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const completedSteps = [...new Set(relevant.map((event) => event.stepId))];
  const weighted = relevant.reduce((sum, event, index) => sum + event.score * recencyWeight(index, relevant.length), 0);
  const weights = relevant.reduce((sum, _event, index) => sum + recencyWeight(index, relevant.length), 0);
  const score = weights === 0 ? 0 : Math.round(weighted / weights);
  const completedAt = completedSteps.length === LESSON_STEPS.length ? relevant.at(-1)?.createdAt : undefined;
  return { unitId, score, completedSteps, completedAt };
};

export const calculateCapabilitySummaries = (events: LearningEvent[]): CapabilitySummary[] => {
  const capabilityIds = [...new Set(events.flatMap((event) => event.capabilityIds))];
  return capabilityIds.map((capabilityId) => {
    const relevant = events.filter((event) => event.capabilityIds.includes(capabilityId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-8);
    const score = relevant.length === 0 ? 0 : Math.round(relevant.reduce((sum, event) => sum + event.score, 0) / relevant.length);
    return { capabilityId, score, evidenceCount: relevant.length, lastEvidenceAt: relevant.at(-1)?.createdAt };
  });
};

export const weakestCapability = (events: LearningEvent[]): CapabilitySummary | undefined =>
  calculateCapabilitySummaries(events).filter((item) => item.evidenceCount >= 1).sort((a, b) => a.score - b.score)[0];
