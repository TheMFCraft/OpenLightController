import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { OnScreenKeyboard } from "./OnScreenKeyboard";
import { usePreferencesStore } from "../preferencesStore";

interface KeyboardTarget {
  value: string;
  setValue: (next: string) => void;
  input: HTMLInputElement | HTMLTextAreaElement;
}

interface KeyboardContextValue {
  register: (target: KeyboardTarget) => void;
  unregister: (input: HTMLInputElement | HTMLTextAreaElement) => void;
}

const KeyboardContext = createContext<KeyboardContextValue | null>(null);

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const touchMode = usePreferencesStore((s) => s.touchMode);
  const onScreenKeyboard = usePreferencesStore((s) => s.onScreenKeyboard);
  const [target, setTarget] = useState<KeyboardTarget | null>(null);

  const register = useCallback((next: KeyboardTarget) => {
    setTarget(next);
  }, []);

  const unregister = useCallback((input: HTMLInputElement | HTMLTextAreaElement) => {
    setTarget((current) => (current?.input === input ? null : current));
  }, []);

  const value = useMemo(
    () => ({ register, unregister }),
    [register, unregister],
  );

  const showKeyboard = touchMode && onScreenKeyboard && target != null;

  return (
    <KeyboardContext.Provider value={value}>
      {children}
      {showKeyboard && target ? (
        <OnScreenKeyboard
          target={target}
          onDismiss={() => {
            target.input.blur();
            setTarget(null);
          }}
        />
      ) : null}
    </KeyboardContext.Provider>
  );
}

export function useOnScreenKeyboard() {
  const ctx = useContext(KeyboardContext);
  if (!ctx) {
    throw new Error("useOnScreenKeyboard must be used within KeyboardProvider");
  }
  return ctx;
}
