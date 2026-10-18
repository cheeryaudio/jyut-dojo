import { scenarios } from "../data";
import type { DailyTask, LearnerProfile } from "../types/curriculum";
import type { ScenarioProgressMap } from "../types/progress";
import type { DelayedCheck, LearningEvent } from "../types/learning";
import { calculateUnitMastery, weakestCapability } from "./mastery";
import { capabilityCatalog } from "../data/capabilities";
import { curriculumStages } from "../data/curriculum";

interface DailyPlanInput {
  profile: LearnerProfile;
  scenarioProgress: ScenarioProgressMap;
  dueReviews: number;
  toneAnswers: number;
  events?: LearningEvent[];
  delayedChecks?: DelayedCheck[];
}

const scenarioOrderByGoal: Record<LearnerProfile["goal"], string[]> = {
  daily: ["greetings", "cha-chaan-teng", "directions", "mtr", "shopping", "phone"],
  work: ["greetings", "phone", "mtr", "directions", "cha-chaan-teng", "shopping"],
  integration: ["greetings", "cha-chaan-teng", "mtr", "directions", "shopping", "phone"],
};

const deepOrderByGoal: Record<LearnerProfile["goal"], string[]> = {
  daily: ["sound-system", "core-particles", "time-weather", "family-friends", "home-delivery", "takeaway-services", "health", "money-services", "repair", "invitations", "storytelling", "opinions", "explanations", "voice-messages", "group-conversation", "work-basics", "fast-speech", "social-smalltalk", "public-announcements", "workplace-fluency", "integrated-tasks", "fluency-check"],
  work: ["sound-system", "core-particles", "work-basics", "voice-messages", "workplace-fluency", "time-weather", "repair", "opinions", "explanations", "group-conversation", "invitations", "storytelling", "home-delivery", "takeaway-services", "health", "money-services", "family-friends", "fast-speech", "public-announcements", "social-smalltalk", "integrated-tasks", "fluency-check"],
  integration: ["sound-system", "core-particles", "time-weather", "family-friends", "home-delivery", "takeaway-services", "health", "money-services", "work-basics", "repair", "invitations", "storytelling", "opinions", "explanations", "voice-messages", "group-conversation", "fast-speech", "social-smalltalk", "public-announcements", "workplace-fluency", "integrated-tasks", "fluency-check"],
};

const curriculumUnitById = new Map(curriculumStages.flatMap((stage) => stage.units).map((unit) => [unit.id, unit]));

export const buildDailyPlan = ({ profile, scenarioProgress, dueReviews, toneAnswers, events = [], delayedChecks = [] }: DailyPlanInput): DailyTask[] => {
  const candidates: DailyTask[] = [];
  if (dueReviews > 0) {
    candidates.push({ id: "due-review", kind: "review", title: "先清到期卡", mandarin: "复习到期内容", reason: `${dueReviews} 張卡而家最適合回想，先做可以減少遺忘。`, route: "/review", minutes: Math.min(10, Math.max(5, Math.ceil(dueReviews / 5))) });
  }
  const dueDelayed = delayedChecks.find((check) => check.completedAt === undefined && new Date(check.due).getTime() <= Date.now());
  if (dueDelayed !== undefined) {
    const unit = curriculumUnitById.get(dueDelayed.unitId);
    if (unit !== undefined) candidates.push({ id: `delayed-${unit.id}`, kind: "review", title: `${unit.title}回測`, mandarin: "隔日提取检测", reason: "隔一晚再講得出，先算真正記得。", route: `/learn/${unit.id}`, minutes: 5 });
  }
  if (events.length === 0) {
    candidates.push({ id: "placement", kind: "diagnostic", title: "五題摸底", mandarin: "先测再学", reason: "先畀系統見到你識咩，避免由已經識嘅內容開始。", route: "/diagnostic", minutes: 5 });
  }
  if (toneAnswers < 30) {
    candidates.push({ id: "tone-foundation", kind: "tone", title: "六聲打底", mandarin: "練出辨調耳仔", reason: "聲調係普通話母語者最常見嘅理解同表達障礙。", route: "/tones", minutes: 5 });
  }
  if (profile.dailyMinutes >= 20) {
    candidates.push({ id: "speaking-output", kind: "speaking", title: "跟讀一次", mandarin: "將聽入耳嘅變成自己把聲", reason: "每日最少一次開口輸出，先可以由聽得明過渡到講得出。", route: "/tones", minutes: 5 });
  }

  const nextScenarioId = scenarioOrderByGoal[profile.goal].find((scenarioId) => scenarioProgress[scenarioId] === undefined);
  const nextScenario = scenarios.find((scenario) => scenario.id === nextScenarioId);
  if (nextScenario !== undefined) {
    candidates.push({ id: `lesson-${nextScenario.id}`, kind: "lesson", title: nextScenario.title, mandarin: nextScenario.intro, reason: profile.goal === "work" && nextScenario.id === "phone" ? "你揀咗工作溝通，電話確認係高頻任務。" : "呢課係目前路線下一個未完成核心情境。", route: `/learn/${nextScenario.id}`, minutes: 10 });
  }

  if (nextScenario === undefined) {
    const nextDeepId = deepOrderByGoal[profile.goal].find((id) => calculateUnitMastery(events, id).completedAt === undefined);
    const nextDeep = nextDeepId === undefined ? undefined : curriculumUnitById.get(nextDeepId);
    if (nextDeep !== undefined) {
      const weak = weakestCapability(events);
      const weakTitle = weak === undefined ? undefined : capabilityCatalog[weak.capabilityId]?.title;
      candidates.push({ id: `deep-${nextDeep.id}`, kind: "lesson", title: nextDeep.title, mandarin: nextDeep.mandarin, reason: weakTitle !== undefined ? `系統會保留「${weakTitle}」薄弱證據，同時沿能力地圖推進。` : "完成生存情境之後，沿能力地圖行下一個核心單元。", route: `/learn/${nextDeep.id}`, minutes: 10 });
    }
  }

  const selected: DailyTask[] = [];
  let total = 0;
  for (const task of candidates) {
    const remaining = profile.dailyMinutes - total;
    if (remaining <= 0) break;
    if (task.minutes <= remaining) {
      selected.push(task);
      total += task.minutes;
    } else if (task.kind === "lesson" && remaining >= 5) {
      selected.push({ ...task, minutes: remaining });
      total += remaining;
    }
  }
  return selected;
};
