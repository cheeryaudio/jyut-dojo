import { ArrowRight, ListChecks } from "@phosphor-icons/react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { buildDailyPlan } from "../lib/recommendation";
import { useLearningPlanStore } from "../stores/learningPlanStore";
import { useLearningStore } from "../stores/learningStore";
import { useReviewStore } from "../stores/reviewStore";
import { useToneStore } from "../stores/toneStore";
import { useMasteryStore } from "../stores/masteryStore";

export function LegacyDailyPlan() {
  const profile = useLearningPlanStore(state => state.profile);
  const scenarioProgress = useLearningStore(state => state.scenarioProgress);
  const cards = useReviewStore(state => state.cards);
  const { progress, hydrate: hydrateTone } = useToneStore();
  const { events, delayedChecks, hydrate: hydrateMastery } = useMasteryStore();
  useEffect(() => { void hydrateTone(); void hydrateMastery(); }, [hydrateTone, hydrateMastery]);
  if (!profile) return <Link className="text-link" to="/diagnostic">入门测验（5 题）<ArrowRight size={16} /></Link>;
  const tasks = buildDailyPlan({ profile, scenarioProgress, dueReviews: cards.filter(card => new Date(card.due).getTime() <= Date.now()).length, toneAnswers: progress.totalAnswers, events, delayedChecks });
  return <details className="legacy-plan"><summary><ListChecks size={19} /> 今日练习</summary><div>{tasks.map(task => <Link key={task.id} to={task.route}><div><strong>{task.title}</strong></div><span>{task.minutes} 分钟 <ArrowRight size={16} /></span></Link>)}{tasks.length === 0 && <p>今日练习已完成</p>}</div></details>;
}
