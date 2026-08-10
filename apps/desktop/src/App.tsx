import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { AttributePanel } from "./components/AttributePanel";
import { CueListPanel } from "./components/CueListPanel";
import { FixtureGrid } from "./components/FixtureGrid";
import { GroupPresetPanel } from "./components/GroupPresetPanel";
import { NetworkDialog } from "./components/NetworkDialog";
import { PatchDialog } from "./components/PatchDialog";
import { PlaybackBar } from "./components/PlaybackBar";
import { StreamDeckDialog } from "./components/StreamDeckDialog";
import { TopBar } from "./components/TopBar";
import { useConsoleStore } from "./store";
import styles from "./App.module.css";

export default function App() {
  const refresh = useConsoleStore((s) => s.refresh);
  const state = useConsoleStore((s) => s.state);
  const [patchOpen, setPatchOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 500);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen("show-state-changed", () => {
      void refresh();
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [refresh]);

  return (
    <div className={styles.layout}>
      <TopBar
        onOpenPatch={() => setPatchOpen(true)}
        onOpenNetwork={() => setNetworkOpen(true)}
        onOpenStreamDeck={() => setDeckOpen(true)}
      />
      {!state ? (
        <div className="muted" style={{ padding: "1rem" }}>
          Loading console…
        </div>
      ) : (
        <>
          <main className={styles.main}>
            <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: "0.55rem", minHeight: 0 }}>
              <FixtureGrid />
              <GroupPresetPanel />
            </div>
            <AttributePanel />
            <CueListPanel />
          </main>
          <PlaybackBar />
        </>
      )}
      <PatchDialog open={patchOpen} onClose={() => setPatchOpen(false)} />
      <NetworkDialog open={networkOpen} onClose={() => setNetworkOpen(false)} />
      <StreamDeckDialog open={deckOpen} onClose={() => setDeckOpen(false)} />
    </div>
  );
}
