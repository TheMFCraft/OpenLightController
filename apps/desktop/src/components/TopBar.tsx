import { api } from "../api";
import { useConsoleStore } from "../store";
import styles from "./TopBar.module.css";

interface Props {
  onOpenPatch: () => void;
  onOpenNetwork: () => void;
  onOpenStreamDeck: () => void;
}

function fileLabel(path: string | null): string | null {
  if (!path) return null;
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export function TopBar({ onOpenPatch, onOpenNetwork, onOpenStreamDeck }: Props) {
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

  if (!state) return null;

  const pathName = fileLabel(showPath);

  return (
    <header className={styles.wrap}>
      <div className={styles.left}>
        <div className={styles.brand}>
          Open<span>Light</span>Controller
        </div>
        <span className={styles.show}>
          {state.name}
          {dirty ? " *" : ""}
          {pathName ? <span className={styles.path}> · {pathName}</span> : null}
        </span>
        {autosaveStatus && <span className={styles.status}>{autosaveStatus}</span>}
      </div>
      <div className={styles.actions}>
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
        <button type="button" onClick={onOpenStreamDeck}>
          Stream Deck
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
