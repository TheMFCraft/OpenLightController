import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { api } from "./api";
import { useConsoleStore } from "./store";
import styles from "./ExternalDisplayApp.module.css";

function formatClock(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function ExternalDisplayApp() {
  const refresh = useConsoleStore((s) => s.refresh);
  const state = useConsoleStore((s) => s.state);
  const run = useConsoleStore((s) => s.run);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 400);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen("show-state-changed", () => {
      void refresh();
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!state) {
    return (
      <div className={styles.root}>
        <div className="muted">Loading external display…</div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <h1>{state.name}</h1>
          <div className="muted">External Display</div>
        </div>
        <time className={styles.clock} dateTime={now.toISOString()}>
          {formatClock(now)}
        </time>
        <div className={styles.headerActions}>
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
            {state.outputEnabled ? "Output On" : "Output Off"}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.playbacks}>
          {state.playbacks.map((pb) => (
            <div key={pb.index} className={styles.playback}>
              <div className={styles.pbLabel} title={pb.label}>
                {pb.label}
                {pb.fading ? " ~" : ""}
                {pb.currentCueIndex != null ? ` #${pb.currentCueIndex + 1}` : ""}
              </div>
              <input
                type="range"
                min={0}
                max={1000}
                value={Math.round(pb.fader * 1000)}
                onChange={(e) =>
                  run(() => api.setPlaybackFader(pb.index, Number(e.target.value) / 1000))
                }
              />
              <div className={styles.pbButtons}>
                <button type="button" onClick={() => run(() => api.playbackBack(pb.index))}>
                  ◀
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => run(() => api.playbackGo(pb.index))}
                >
                  GO
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className={styles.cues}>
          <h2>Cues</h2>
          <div className={styles.cueGrid}>
            {state.cueLists.flatMap((list) =>
              list.cues.map((cue) => (
                <button
                  key={cue.id}
                  type="button"
                  className={styles.cueBtn}
                  onClick={() => run(() => api.fireCue(list.id, cue.id))}
                >
                  <span className={styles.cueList}>{list.name}</span>
                  <span>
                    {cue.number} {cue.name}
                  </span>
                </button>
              )),
            )}
            {!state.cueLists.some((l) => l.cues.length) ? (
              <div className="muted">No cues stored yet.</div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
