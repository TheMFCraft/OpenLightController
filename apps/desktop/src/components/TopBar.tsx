import { api } from "../api";
import { useConsoleStore } from "../store";
import styles from "./TopBar.module.css";

interface Props {
  onOpenPatch: () => void;
  onOpenNetwork: () => void;
  onOpenStreamDeck: () => void;
}

export function TopBar({ onOpenPatch, onOpenNetwork, onOpenStreamDeck }: Props) {
  const state = useConsoleStore((s) => s.state);
  const run = useConsoleStore((s) => s.run);
  const error = useConsoleStore((s) => s.error);

  if (!state) return null;

  return (
    <header className={styles.wrap}>
      <div className={styles.left}>
        <div className={styles.brand}>
          Open<span>Light</span>Controller
        </div>
        <span className={styles.show}>{state.name}</span>
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={() => run(() => api.newShow())}>
          New
        </button>
        <button
          type="button"
          onClick={async () => {
            const { open } = await import("@tauri-apps/plugin-dialog");
            const path = await open({
              multiple: false,
              filters: [{ name: "Show", extensions: ["json"] }],
            });
            if (typeof path === "string") {
              await run(() => api.loadShow(path));
            }
          }}
        >
          Open
        </button>
        <button
          type="button"
          onClick={async () => {
            const { save } = await import("@tauri-apps/plugin-dialog");
            const path = await save({
              filters: [{ name: "Show", extensions: ["json"] }],
              defaultPath: "show.json",
            });
            if (typeof path === "string") {
              await run(() => api.saveShow(path));
            }
          }}
        >
          Save
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
          onClick={() => run(() => api.setBlackout(!state.blackout))}
        >
          {state.blackout ? "Blackout ON" : "Blackout"}
        </button>
        <button
          type="button"
          className={state.outputEnabled ? "primary" : undefined}
          onClick={() => run(() => api.setOutputEnabled(!state.outputEnabled))}
        >
          <span
            className={`${styles.dot} ${state.outputEnabled ? styles.on : ""}`}
          />
          {state.outputEnabled ? "Output On" : "Output Off"}
        </button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </header>
  );
}
