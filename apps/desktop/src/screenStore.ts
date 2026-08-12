import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScreenPanel } from "./types";

export interface ScreenDefinition {
  id: string;
  name: string;
  panel: ScreenPanel;
  monitorIndex: number | null;
  fullscreen: boolean;
}

interface ScreenStore {
  screens: ScreenDefinition[];
  addScreen: (screen: Omit<ScreenDefinition, "id">) => ScreenDefinition;
  updateScreen: (id: string, patch: Partial<Omit<ScreenDefinition, "id">>) => void;
  removeScreen: (id: string) => void;
}

export function screenWindowLabel(id: string): string {
  return `screen-${id}`;
}

export const useScreenStore = create<ScreenStore>()(
  persist(
    (set, get) => ({
      screens: [],
      addScreen: (screen) => {
        const id = crypto.randomUUID();
        const next: ScreenDefinition = { ...screen, id };
        set({ screens: [...get().screens, next] });
        return next;
      },
      updateScreen: (id, patch) => {
        set({
          screens: get().screens.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        });
      },
      removeScreen: (id) => {
        set({ screens: get().screens.filter((s) => s.id !== id) });
      },
    }),
    { name: "olc-screens" },
  ),
);
