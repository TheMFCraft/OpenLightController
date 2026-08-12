import { useEffect, useState } from "react";
import { api } from "../api";
import { useConsoleStore } from "../store";
import styles from "./DmxOutputMonitor.module.css";

const UNIVERSE_COUNT = 4;
const CHANNELS_PER_UNIVERSE = 512;

export function DmxOutputMonitor() {
  const outputEnabled = useConsoleStore((s) => s.state?.outputEnabled ?? false);
  const [universe, setUniverse] = useState(1);
  const [channels, setChannels] = useState<number[]>(() =>
    Array.from({ length: CHANNELS_PER_UNIVERSE }, () => 0),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const snap = await api.getUniverseSnapshot(universe);
        if (!cancelled) {
          setChannels(snap);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), 200);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [universe]);

  const activeCount = channels.filter((v) => v > 0).length;
  const peak = channels.reduce((max, v) => Math.max(max, v), 0);

  return (
    <section className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.universeTabs}>
          {Array.from({ length: UNIVERSE_COUNT }, (_, i) => i + 1).map((u) => (
            <button
              key={u}
              type="button"
              className={universe === u ? styles.universeActive : undefined}
              onClick={() => setUniverse(u)}
            >
              Universe {u}
            </button>
          ))}
        </div>
        <div className={styles.stats}>
          <span className={outputEnabled ? styles.live : styles.off}>
            {outputEnabled ? "LIVE" : "Output off"}
          </span>
          <span className="mono">
            Active: {activeCount} · Peak: {peak}
          </span>
        </div>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.gridWrap}>
        <div className={styles.grid}>
          {channels.map((value, index) => {
            const ch = index + 1;
            const active = value > 0;
            return (
              <div
                key={ch}
                className={`${styles.cell} ${active ? styles.cellActive : ""}`}
                title={`Ch ${ch}: ${value}`}
              >
                <span className={styles.ch}>{ch}</span>
                <span className={styles.val}>{value}</span>
                <span
                  className={styles.bar}
                  style={{ height: `${(value / 255) * 100}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
