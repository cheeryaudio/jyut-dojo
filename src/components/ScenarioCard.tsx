import { ArrowRight } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import type { Scenario } from "../types/domain";

interface ScenarioCardProps {
  scenario: Scenario;
  index: number;
  stars: number;
}

export function ScenarioCard({ scenario, index, stars }: ScenarioCardProps) {
  return (
    <Link to={`/learn/${scenario.id}`} className="group grid min-h-48 grid-rows-[auto_1fr_auto] rounded-2xl border border-stone-200 bg-stone-50 p-5 transition hover:-translate-y-0.5 hover:border-ember/50 hover:shadow-warm active:scale-[0.99] dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between">
        <span className="text-4xl" aria-hidden="true">{scenario.emoji}</span>
        <div className="text-right">
          <span className="block font-jyutping text-xs text-stone-400">{String(index + 1).padStart(2, "0")}</span>
          <span className="mt-2 block text-sm font-semibold text-ember-dark dark:text-sky-300" aria-label={`${stars} 粒星`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</span>
        </div>
      </div>
      <div className="mt-6">
        <h2 className="text-2xl font-semibold tracking-tight">{scenario.title}</h2>
        <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-stone-600 dark:text-stone-300">{scenario.intro}</p>
      </div>
      <div className="mt-5 flex items-center justify-between text-sm font-bold text-ember-dark dark:text-sky-300">
        <span>{scenario.sentences.length} 句對話</span>
        <ArrowRight className="transition group-hover:translate-x-1" size={18} weight="bold" aria-hidden="true" />
      </div>
    </Link>
  );
}
