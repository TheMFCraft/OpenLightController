import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ConsolePreferences {
  touchMode: boolean;
  onScreenKeyboard: boolean;
  webRemotePort: number;
}

interface PreferencesStore extends ConsolePreferences {
  setTouchMode: (enabled: boolean) => void;
  setOnScreenKeyboard: (enabled: boolean) => void;
  setWebRemotePort: (port: number) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      touchMode: false,
      onScreenKeyboard: true,
      webRemotePort: 8080,
      setTouchMode: (touchMode) => set({ touchMode }),
      setOnScreenKeyboard: (onScreenKeyboard) => set({ onScreenKeyboard }),
      setWebRemotePort: (webRemotePort) => set({ webRemotePort }),
    }),
    { name: "olc-preferences" },
  ),
);
