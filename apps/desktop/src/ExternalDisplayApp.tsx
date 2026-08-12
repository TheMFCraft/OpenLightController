import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { DmxOutputMonitor } from "./components/DmxOutputMonitor";
import {
  ExternalCuesPanel,
  ExternalPlaybacksPanel,
  ExternalScreenHeader,
  ExternalStatusPanel,
} from "./components/ExternalScreenPanels";
import { screenPanelLabel } from "./screenPanels";
import { useConsoleStore } from "./store";
import type { ScreenPanel } from "./types";
import styles from "./ExternalDisplayApp.module.css";

interface Props {
  panel: ScreenPanel;
  title: string;
}

export function ExternalDisplayApp({ panel, title }: Props) {
  const refresh = useConsoleStore((s) => s.refresh);
  const state = useConsoleStore((s) => s.state);
  const panelTitle = title || screenPanelLabel(panel);

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

  if (!state) {
    return (
      <div className={styles.root}>
        <div className="muted">Loading screen…</div>
      </div>
    );
  }

  const showHeader = panel !== "status";

  return (
    <div className={styles.root}>
      {showHeader ? <ExternalScreenHeader title={panelTitle} compact={panel === "dmx_output"} /> : null}
      <main className={styles.panelMain}>
        {panel === "playbacks" ? <ExternalPlaybacksPanel /> : null}
        {panel === "cues" ? <ExternalCuesPanel /> : null}
        {panel === "dmx_output" ? <DmxOutputMonitor /> : null}
        {panel === "status" ? <ExternalStatusPanel title={panelTitle} /> : null}
      </main>
    </div>
  );
}
