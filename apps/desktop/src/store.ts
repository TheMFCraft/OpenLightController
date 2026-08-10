import { create } from "zustand";
import { api } from "./api";
import type { ShowState } from "./types";

const SHOW_PATH_KEY = "olc.showPath";

function isShowState(value: unknown): value is ShowState {
  return !!value && typeof value === "object" && "fixtures" in value && "programmer" in value;
}

function basename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

interface ConsoleStore {
  state: ShowState | null;
  error: string | null;
  activeCueListId: string | null;
  showPath: string | null;
  dirty: boolean;
  lastSavedAt: number | null;
  autosaveStatus: string | null;
  setActiveCueListId: (id: string | null) => void;
  setShowPath: (path: string | null) => void;
  markClean: (path?: string | null) => void;
  refresh: () => Promise<void>;
  apply: (next: ShowState) => void;
  run: <T>(fn: () => Promise<T>, opts?: { dirty?: boolean }) => Promise<T | undefined>;
  saveShowTo: (path: string) => Promise<boolean>;
  saveShow: () => Promise<boolean>;
  saveShowAs: () => Promise<boolean>;
  openShow: () => Promise<boolean>;
  newShow: () => Promise<boolean>;
  autosaveIfNeeded: () => Promise<void>;
}

export const useConsoleStore = create<ConsoleStore>((set, get) => ({
  state: null,
  error: null,
  activeCueListId: null,
  showPath: typeof localStorage !== "undefined" ? localStorage.getItem(SHOW_PATH_KEY) : null,
  dirty: false,
  lastSavedAt: null,
  autosaveStatus: null,
  setActiveCueListId: (id) => set({ activeCueListId: id }),
  setShowPath: (path) => {
    if (path) localStorage.setItem(SHOW_PATH_KEY, path);
    else localStorage.removeItem(SHOW_PATH_KEY);
    set({ showPath: path });
  },
  markClean: (path) => {
    if (path !== undefined) {
      if (path) localStorage.setItem(SHOW_PATH_KEY, path);
      else localStorage.removeItem(SHOW_PATH_KEY);
      set({ showPath: path, dirty: false, lastSavedAt: Date.now(), autosaveStatus: null });
    } else {
      set({ dirty: false, lastSavedAt: Date.now(), autosaveStatus: null });
    }
  },
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
  run: async (fn, opts) => {
    try {
      const result = await fn();
      if (isShowState(result)) {
        get().apply(result);
        if (opts?.dirty !== false) {
          set({ dirty: true });
        }
      }
      return result;
    } catch (e) {
      set({ error: String(e) });
      return undefined;
    }
  },
  saveShowTo: async (path) => {
    const next = await get().run(() => api.saveShow(path), { dirty: false });
    if (!next) return false;
    get().markClean(path);
    set({ autosaveStatus: `Saved ${basename(path)}` });
    return true;
  },
  saveShow: async () => {
    const path = get().showPath;
    if (path) return get().saveShowTo(path);
    return get().saveShowAs();
  },
  saveShowAs: async () => {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const current = get().showPath;
    const path = await save({
      filters: [{ name: "Show", extensions: ["json"] }],
      defaultPath: current ? basename(current) : "show.json",
    });
    if (typeof path !== "string") return false;
    return get().saveShowTo(path);
  },
  openShow: async () => {
    if (get().dirty) {
      const ok = window.confirm("Show has unsaved changes. Open anyway?");
      if (!ok) return false;
    }
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({
      multiple: false,
      filters: [{ name: "Show", extensions: ["json"] }],
    });
    if (typeof path !== "string") return false;
    const next = await get().run(() => api.loadShow(path), { dirty: false });
    if (!next) return false;
    get().markClean(path);
    return true;
  },
  newShow: async () => {
    if (get().dirty) {
      const ok = window.confirm("Show has unsaved changes. Start a new show anyway?");
      if (!ok) return false;
    }
    const next = await get().run(() => api.newShow(), { dirty: false });
    if (!next) return false;
    get().markClean(null);
    return true;
  },
  autosaveIfNeeded: async () => {
    const { dirty, showPath } = get();
    if (!dirty || !showPath) return;
    set({ autosaveStatus: "Autosaving…" });
    const ok = await get().saveShowTo(showPath);
    if (ok) set({ autosaveStatus: `Autosaved ${basename(showPath)}` });
  },
}));
