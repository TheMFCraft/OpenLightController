import { useEffect, useState } from "react";
import { api } from "../api";
import { useConsoleStore } from "../store";
import { TouchTextInput } from "./TouchTextInput";
import styles from "./TopBar.module.css";

interface Props {
  onOpenPatch: () => void;
  onOpenNetwork: () => void;
  onOpenStreamDeck: () => void;
  onOpenSettings: () => void;
}

function fileLabel(path: string | null): string | null {
  if (!path) return null;
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TopBar({ onOpenPatch, onOpenNetwork, onOpenStreamDeck, onOpenSettings }: Props) {
  const state = useConsoleStore((s) => s.state);
  const run = useConsoleStore((s) => s.run);
  const error = useConsoleStore((s) => s.error);
  const dirty = useConsoleStore((s) => s.dirty);
  const showPath = useConsoleStore((s) => s.showPath);
  const autosaveStatus = useConsoleStore((s) => s.autosaveStatus);
  const newShow = useConsoleStore((s) => s.newShow);
  const openShow = useConsoleStore((s) => s.openShow);
  const saveShow = useConsoleStore((s) => s.saveShow);
  const saveShowAs = useConsoleStore((s) => s.saveShowAs);

  const [draftName, setDraftName] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [deckConnected, setDeckConnected] = useState(false);

  useEffect(() => {
    if (state) setDraftName(state.name);
  }, [state?.name]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const st = await api.getStreamDeckStatus();
        if (!cancelled) setDeckConnected(st.connected);
      } catch {
        if (!cancelled) setDeckConnected(false);
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!state) return null;

  const pathName = fileLabel(showPath);

  const commitName = () => {
    const next = draftName.trim() || "Untitled Show";
    if (next === state.name) {
      setDraftName(state.name);
      return;
    }
    void run(() => api.setShowName(next));
  };

  return (
    <header className={styles.wrap}>
      <div className={styles.left}>
        <div className={styles.brand}>
          Open<span>Light</span>Controller
        </div>
        <div className={styles.showEdit}>
          <TouchTextInput
            className={styles.showInput}
            value={draftName}
            aria-label="Show name"
            spellCheck={false}
            onChange={setDraftName}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                setDraftName(state.name);
                e.currentTarget.blur();
              }
            }}
          />
          {dirty ? <span className={styles.dirty}>*</span> : null}
          {pathName ? <span className={styles.path}>· {pathName}</span> : null}
        </div>
        {autosaveStatus && <span className={styles.status}>{autosaveStatus}</span>}
      </div>
      <div className={styles.actions}>
        <time className={styles.clock} dateTime={now.toISOString()}>
          {formatClock(now)}
        </time>
        <button type="button" onClick={() => void newShow()}>
          New
        </button>
        <button type="button" onClick={() => void openShow()}>
          Open
        </button>
        <button type="button" onClick={() => void saveShow()}>
          Save
        </button>
        <button type="button" onClick={() => void saveShowAs()}>
          Save As
        </button>
        <button type="button" onClick={onOpenPatch}>
          Patch
        </button>
        <button type="button" onClick={onOpenNetwork}>
          Network
        </button>
        <button type="button" onClick={onOpenStreamDeck} title={deckConnected ? "Stream Deck connected" : "Stream Deck disconnected"}>
          <span className={`${styles.dot} ${deckConnected ? styles.on : ""}`} />
          Stream Deck
        </button>
        <button type="button" onClick={onOpenSettings}>
          Settings
        </button>
        <button
          type="button"
          className={state.blackout ? "danger" : undefined}
          onClick={() => void run(() => api.setBlackout(!state.blackout))}
        >
          {state.blackout ? "Blackout ON" : "Blackout"}
        </button>
        <button
          type="button"
          className={state.outputEnabled ? "primary" : undefined}
          onClick={() => void run(() => api.setOutputEnabled(!state.outputEnabled))}
        >
          <span className={`${styles.dot} ${state.outputEnabled ? styles.on : ""}`} />
          {state.outputEnabled ? "Output On" : "Output Off"}
        </button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </header>
  );
}
