import { create } from "zustand";

interface AppState {
  selectedScenarioId: string | null;
  selectScenario: (scenarioId: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedScenarioId: null,
  selectScenario: (selectedScenarioId) => set({ selectedScenarioId }),
}));
