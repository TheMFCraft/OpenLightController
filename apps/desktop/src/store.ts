import { create } from "zustand";
import { api } from "./api";
import type { ShowState } from "./types";

interface ConsoleStore {
  state: ShowState | null;
  error: string | null;
  activeCueListId: string | null;
  setActiveCueListId: (id: string | null) => void;
  refresh: () => Promise<void>;
  apply: (next: ShowState) => void;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
}

export const useConsoleStore = create<ConsoleStore>((set, get) => ({
  state: null,
  error: null,
  activeCueListId: null,
  setActiveCueListId: (id) => set({ activeCueListId: id }),
  apply: (next) => {
    const active = get().activeCueListId;
    const stillExists = next.cueLists.some((c) => c.id === active);
    set({
      state: next,
      error: null,
      activeCueListId: stillExists ? active : (next.cueLists[0]?.id ?? null),
    });
  },
  refresh: async () => {
    try {
      const next = await api.getShowState();
      get().apply(next);
    } catch (e) {
      set({ error: String(e) });
    }
  },
  run: async (fn) => {
    try {
      const result = await fn();
      if (result && typeof result === "object" && result !== null && "fixtures" in result) {
        get().apply(result as unknown as ShowState);
      }
      return result;
    } catch (e) {
      set({ error: String(e) });
      return undefined;
    }
  },
}));
